import {
  db,
  hostels,
  hostelBlocks,
  hostelRooms,
  hostelBeds,
  hostelAllocations,
  hostelTransfers,
  hostelAttendance,
  hostelMaintenance,
  students,
  feeInvoices,
  feeStructures,
  terms,
} from "../index";
import { eq, and, desc } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────

export interface CreateHostelInput {
  name: string;
  code?: string;
  genderType?: "boys" | "girls" | "mixed";
  capacity?: number;
  address?: string;
  wardenUserId?: string;
}

export interface CreateRoomInput {
  hostelId: string;
  blockId?: string;
  roomNumber: string;
  floor?: string;
  capacity?: number; // Number of beds, default 4
  feePerTerm?: number;
}

// ── Hostel Definition ────────────────────────────────────────────────

export async function createHostel(schoolId: string, input: CreateHostelInput) {
  const [hostel] = await db
    .insert(hostels)
    .values({
      schoolId,
      name: input.name,
      code: input.code,
      genderType: input.genderType ?? "mixed",
      capacity: input.capacity ?? 100,
      address: input.address,
      wardenUserId: input.wardenUserId,
    })
    .returning();

  return hostel;
}

export async function listHostels(schoolId: string) {
  return db
    .select()
    .from(hostels)
    .where(eq(hostels.schoolId, schoolId))
    .orderBy(hostels.name);
}

// ── Room & Bed Creation ──────────────────────────────────────────────

export async function createHostelRoom(schoolId: string, input: CreateRoomInput) {
  const roomCapacity = Math.max(1, input.capacity ?? 4);

  const [room] = await db
    .insert(hostelRooms)
    .values({
      schoolId,
      hostelId: input.hostelId,
      blockId: input.blockId,
      roomNumber: input.roomNumber,
      floor: input.floor,
      capacity: roomCapacity,
      feePerTerm: input.feePerTerm ?? 0,
      status: "available",
    })
    .returning();

  // Populate physical beds for this room
  const bedValues = [];
  for (let i = 1; i <= roomCapacity; i++) {
    bedValues.push({
      schoolId,
      roomId: room.id,
      bedNumber: `BED-${i}`,
      status: "available",
    });
  }

  const beds = await db.insert(hostelBeds).values(bedValues).returning();

  return { room, beds };
}

export async function getRoomWithBeds(schoolId: string, roomId: string) {
  const [room] = await db
    .select()
    .from(hostelRooms)
    .where(and(eq(hostelRooms.id, roomId), eq(hostelRooms.schoolId, schoolId)));

  if (!room) return null;

  const beds = await db
    .select()
    .from(hostelBeds)
    .where(and(eq(hostelBeds.roomId, room.id), eq(hostelBeds.schoolId, schoolId)));

  return { room, beds };
}

// ── Allocation Engine & Capacity Enforcement ─────────────────────────

export async function allocateStudentToBed(
  schoolId: string,
  studentId: string,
  hostelId: string,
  roomId: string,
  bedId: string
) {
  // 1. Room capacity check
  const [room] = await db
    .select()
    .from(hostelRooms)
    .where(and(eq(hostelRooms.id, roomId), eq(hostelRooms.schoolId, schoolId)));

  if (!room) throw new Error("Hostel room not found");
  if (room.status === "full") throw new Error("Room capacity reached. Over-allocation rejected.");

  // 2. Tenant & bed availability check
  const [bed] = await db
    .select()
    .from(hostelBeds)
    .where(and(eq(hostelBeds.id, bedId), eq(hostelBeds.schoolId, schoolId)));

  if (!bed) throw new Error("Hostel bed not found or unauthorized");
  if (bed.status !== "available") throw new Error(`Bed is not available (Status: ${bed.status})`);

  // 3. Existing active allocation check for student
  const [existingAlloc] = await db
    .select()
    .from(hostelAllocations)
    .where(
      and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.studentId, studentId),
        eq(hostelAllocations.status, "active")
      )
    );

  if (existingAlloc) {
    throw new Error("Student already has an active hostel bed allocation");
  }

  // 4. Create active allocation
  const [allocation] = await db
    .insert(hostelAllocations)
    .values({
      schoolId,
      studentId,
      hostelId,
      roomId,
      bedId,
      status: "active",
    })
    .returning();

  // 5. Update bed status to occupied
  await db
    .update(hostelBeds)
    .set({ status: "occupied" })
    .where(eq(hostelBeds.id, bed.id));

  // 6. Check if room is now full
  const allBeds = await db
    .select()
    .from(hostelBeds)
    .where(and(eq(hostelBeds.roomId, room.id), eq(hostelBeds.schoolId, schoolId)));

  const availableBeds = allBeds.filter((b) => b.status === "available");
  if (availableBeds.length === 0) {
    await db
      .update(hostelRooms)
      .set({ status: "full", updatedAt: new Date() })
      .where(eq(hostelRooms.id, room.id));
  }

  // 7. Finance / Fee Integration: Create fee structure and invoice if room has feePerTerm > 0
  if (room.feePerTerm > 0) {
    let [term] = await db.select().from(terms).where(eq(terms.schoolId, schoolId)).limit(1);

    if (!term) {
      const [newTerm] = await db
        .insert(terms)
        .values({ schoolId, name: "Current Term", session: "2026/2027" })
        .returning();
      term = newTerm;
    }

    const [feeStruct] = await db
      .insert(feeStructures)
      .values({
        schoolId,
        termId: term.id,
        name: `Hostel Accommodation Fee - Room ${room.roomNumber}`,
        totalAmount: room.feePerTerm,
      })
      .returning();

    await db.insert(feeInvoices).values({
      schoolId,
      studentId,
      feeStructureId: feeStruct.id,
      totalAmount: room.feePerTerm,
      amountPaid: 0,
      outstandingBalance: room.feePerTerm,
      status: "unpaid",
    });
  }

  return allocation;
}

// ── Hostel Room Transfer Workflow ────────────────────────────────────

export async function transferStudentHostelRoom(
  schoolId: string,
  studentId: string,
  targetRoomId: string,
  targetBedId: string,
  reason?: string
) {
  // 1. Find active allocation
  const [currentAlloc] = await db
    .select()
    .from(hostelAllocations)
    .where(
      and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.studentId, studentId),
        eq(hostelAllocations.status, "active")
      )
    );

  if (!currentAlloc) throw new Error("Student has no active hostel allocation to transfer");

  // 2. Verify target bed availability
  const [targetBed] = await db
    .select()
    .from(hostelBeds)
    .where(and(eq(hostelBeds.id, targetBedId), eq(hostelBeds.schoolId, schoolId)));

  if (!targetBed || targetBed.status !== "available") {
    throw new Error("Target bed is not available for transfer");
  }

  const fromRoomId = currentAlloc.roomId;
  const fromBedId = currentAlloc.bedId;

  // 3. Vacate current bed & restore previous room status
  await db
    .update(hostelBeds)
    .set({ status: "available" })
    .where(eq(hostelBeds.id, fromBedId));

  await db
    .update(hostelRooms)
    .set({ status: "available", updatedAt: new Date() })
    .where(eq(hostelRooms.id, fromRoomId));

  // 4. Update current allocation with target room/bed
  await db
    .update(hostelAllocations)
    .set({
      roomId: targetRoomId,
      bedId: targetBedId,
      updatedAt: new Date(),
    })
    .where(eq(hostelAllocations.id, currentAlloc.id));

  // 5. Occupy target bed
  await db
    .update(hostelBeds)
    .set({ status: "occupied" })
    .where(eq(hostelBeds.id, targetBedId));

  // 6. Record transfer history
  const [transfer] = await db
    .insert(hostelTransfers)
    .values({
      schoolId,
      studentId,
      allocationId: currentAlloc.id,
      fromRoomId,
      fromBedId,
      toRoomId: targetRoomId,
      toBedId: targetBedId,
      reason,
    })
    .returning();

  return transfer;
}

// ── Hostel Attendance Roll-Call Integration ──────────────────────────

export async function recordHostelAttendance(
  schoolId: string,
  hostelId: string,
  date: string,
  records: Array<{ studentId: string; status: "present" | "absent" | "late" | "leave"; remarks?: string }>,
  markedById?: string
) {
  const insertedRecords = [];

  for (const r of records) {
    const [att] = await db
      .insert(hostelAttendance)
      .values({
        schoolId,
        hostelId,
        studentId: r.studentId,
        date,
        status: r.status,
        remarks: r.remarks,
        markedById,
      })
      .returning();
    insertedRecords.push(att);
  }

  return insertedRecords;
}

// ── Maintenance Management ─────────────────────────────────────────

export async function reportHostelMaintenance(
  schoolId: string,
  hostelId: string,
  roomId: string,
  issueDescription: string,
  bedId?: string
) {
  const [maint] = await db
    .insert(hostelMaintenance)
    .values({
      schoolId,
      hostelId,
      roomId,
      bedId,
      issueDescription,
      status: "reported",
    })
    .returning();

  // Temporarily mark bed/room under maintenance if specified
  if (bedId) {
    await db
      .update(hostelBeds)
      .set({ status: "maintenance" })
      .where(and(eq(hostelBeds.id, bedId), eq(hostelBeds.schoolId, schoolId)));
  }

  return maint;
}

// ── Real-Time Occupancy Dashboard & Profile ──────────────────────────

export async function getHostelOccupancySummary(schoolId: string) {
  const allHostels = await db
    .select()
    .from(hostels)
    .where(eq(hostels.schoolId, schoolId));

  const allBeds = await db
    .select()
    .from(hostelBeds)
    .where(eq(hostelBeds.schoolId, schoolId));

  const activeAllocations = await db
    .select()
    .from(hostelAllocations)
    .where(
      and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.status, "active")
      )
    );

  const totalBeds = allBeds.length;
  const occupiedBeds = allBeds.filter((b) => b.status === "occupied").length;
  const availableBeds = allBeds.filter((b) => b.status === "available").length;
  const maintenanceBeds = allBeds.filter((b) => b.status === "maintenance").length;
  const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return {
    totalHostels: allHostels.length,
    totalBeds,
    occupiedBeds,
    availableBeds,
    maintenanceBeds,
    activeAllocationsCount: activeAllocations.length,
    occupancyPercentage,
  };
}

export async function getStudentHostelProfile(schoolId: string, studentId: string) {
  const [allocation] = await db
    .select()
    .from(hostelAllocations)
    .where(
      and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.studentId, studentId),
        eq(hostelAllocations.status, "active")
      )
    );

  if (!allocation) return null;

  const [hostel] = await db
    .select()
    .from(hostels)
    .where(and(eq(hostels.id, allocation.hostelId), eq(hostels.schoolId, schoolId)));

  const [room] = await db
    .select()
    .from(hostelRooms)
    .where(and(eq(hostelRooms.id, allocation.roomId), eq(hostelRooms.schoolId, schoolId)));

  const [bed] = await db
    .select()
    .from(hostelBeds)
    .where(and(eq(hostelBeds.id, allocation.bedId), eq(hostelBeds.schoolId, schoolId)));

  // Find roommates sharing the same room
  const roommatesAllocations = await db
    .select()
    .from(hostelAllocations)
    .where(
      and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.roomId, allocation.roomId),
        eq(hostelAllocations.status, "active")
      )
    );

  const roommatesList = await Promise.all(
    roommatesAllocations
      .filter((a) => a.studentId !== studentId)
      .map(async (a) => {
        const [st] = await db
          .select({
            id: students.id,
            firstName: students.firstName,
            lastName: students.lastName,
            admissionNumber: students.admissionNumber,
          })
          .from(students)
          .where(eq(students.id, a.studentId));
        return st;
      })
  );

  return {
    allocation,
    hostel,
    room,
    bed,
    roommates: roommatesList.filter(Boolean),
  };
}
