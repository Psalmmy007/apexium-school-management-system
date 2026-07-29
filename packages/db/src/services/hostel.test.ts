import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  db,
  schools,
  students,
  feeInvoices,
  createHostel,
  createHostelRoom,
  allocateStudentToBed,
  transferStudentHostelRoom,
  recordHostelAttendance,
  reportHostelMaintenance,
  getHostelOccupancySummary,
  getStudentHostelProfile,
} from "../index";

describe("Milestone 15: Hostel Management System — Capacity Enforcement, Transfers & Multi-Tenant Tests", () => {
  let schoolAId: string;
  let schoolBId: string;

  let studentA1Id: string;
  let studentA2Id: string;
  let studentA3Id: string;
  let studentB1Id: string;

  let hostelAId: string;
  let roomA1Id: string; // Capacity = 2
  let bedA1_1Id: string;
  let bedA1_2Id: string;

  let roomA2Id: string; // Capacity = 2
  let bedA2_1Id: string;

  let hostelBId: string;
  let roomB1Id: string;

  beforeAll(async () => {
    // 1. Create School A & School B
    const [schA] = await db
      .insert(schools)
      .values({ name: "Hostel Academy A", slug: `hst-sch-a-${Date.now()}` })
      .returning();
    schoolAId = schA.id;

    const [schB] = await db
      .insert(schools)
      .values({ name: "Hostel Academy B", slug: `hst-sch-b-${Date.now()}` })
      .returning();
    schoolBId = schB.id;

    // 2. Create Students in School A and B
    const [stA1] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `HST-ST-A1-${Date.now()}`,
        firstName: "Edward",
        lastName: "Elric",
      })
      .returning();
    studentA1Id = stA1.id;

    const [stA2] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `HST-ST-A2-${Date.now()}`,
        firstName: "Alphonse",
        lastName: "Elric",
      })
      .returning();
    studentA2Id = stA2.id;

    const [stA3] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `HST-ST-A3-${Date.now()}`,
        firstName: "Winry",
        lastName: "Rockbell",
      })
      .returning();
    studentA3Id = stA3.id;

    const [stB1] = await db
      .insert(students)
      .values({
        schoolId: schoolBId,
        admissionNumber: `HST-ST-B1-${Date.now()}`,
        firstName: "Roy",
        lastName: "Mustang",
      })
      .returning();
    studentB1Id = stB1.id;

    // 3. Create Hostels
    const hstA = await createHostel(schoolAId, { name: "Nelson Mandela Hostel", genderType: "boys", capacity: 50 });
    hostelAId = hstA.id;

    const hstB = await createHostel(schoolBId, { name: "Queen Elizabeth Hostel", genderType: "girls", capacity: 50 });
    hostelBId = hstB.id;

    // 4. Create Rooms in School A
    const roomA1 = await createHostelRoom(schoolAId, {
      hostelId: hostelAId,
      roomNumber: "R101",
      capacity: 2,
      feePerTerm: 45000,
    });
    roomA1Id = roomA1.room.id;
    bedA1_1Id = roomA1.beds[0].id;
    bedA1_2Id = roomA1.beds[1].id;

    const roomA2 = await createHostelRoom(schoolAId, {
      hostelId: hostelAId,
      roomNumber: "R102",
      capacity: 2,
      feePerTerm: 45000,
    });
    roomA2Id = roomA2.room.id;
    bedA2_1Id = roomA2.beds[0].id;

    // 5. Create Room in School B
    const roomB1 = await createHostelRoom(schoolBId, {
      hostelId: hostelBId,
      roomNumber: "R201",
      capacity: 2,
      feePerTerm: 50000,
    });
    roomB1Id = roomB1.room.id;
  }, 30000);

  it("allocates students until capacity is reached and generates hostel fee invoices", async () => {
    // Allocate Student A1 to Room A1 Bed 1
    const alloc1 = await allocateStudentToBed(schoolAId, studentA1Id, hostelAId, roomA1Id, bedA1_1Id);
    expect(alloc1.status).toBe("active");

    // Verify automatic Fee Invoice creation for ₦45,000
    const invoices = await db
      .select()
      .from(feeInvoices)
      .where(and(eq(feeInvoices.schoolId, schoolAId), eq(feeInvoices.studentId, studentA1Id)));
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices[0].totalAmount).toBe(45000);

    // Allocate Student A2 to Room A1 Bed 2
    const alloc2 = await allocateStudentToBed(schoolAId, studentA2Id, hostelAId, roomA1Id, bedA1_2Id);
    expect(alloc2.status).toBe("active");

    // Room A1 is now full (2/2 beds taken)
  });

  it("rejects over-allocation when room capacity is reached", async () => {
    // Attempting to allocate Student A3 to Room A1 (which is full) must be rejected
    await expect(
      allocateStudentToBed(schoolAId, studentA3Id, hostelAId, roomA1Id, bedA1_1Id)
    ).rejects.toThrow("Room capacity reached. Over-allocation rejected.");
  });

  it("performs room transfers while updating bed availability and preserving history", async () => {
    // Transfer Student A1 from Room A1 Bed 1 to Room A2 Bed 1
    const transfer = await transferStudentHostelRoom(
      schoolAId,
      studentA1Id,
      roomA2Id,
      bedA2_1Id,
      "Requested quieter study room"
    );

    expect(transfer.fromRoomId).toBe(roomA1Id);
    expect(transfer.toRoomId).toBe(roomA2Id);

    // Room A1 Bed 1 should now be available again
    // We can now allocate Student A3 to Room A1 Bed 1!
    const alloc3 = await allocateStudentToBed(schoolAId, studentA3Id, hostelAId, roomA1Id, bedA1_1Id);
    expect(alloc3.status).toBe("active");
  });

  it("records hostel roll-call attendance and maintenance requests", async () => {
    const att = await recordHostelAttendance(schoolAId, hostelAId, "2026-09-15", [
      { studentId: studentA1Id, status: "present" },
      { studentId: studentA2Id, status: "absent", remarks: "Night out permission" },
    ]);
    expect(att.length).toBe(2);

    const maint = await reportHostelMaintenance(
      schoolAId,
      hostelAId,
      roomA2Id,
      "Ceiling fan speed regulator broken"
    );
    expect(maint.status).toBe("reported");
  });

  it("fetches student hostel profile with roommates and calculates real-time occupancy statistics", async () => {
    const profileA2 = await getStudentHostelProfile(schoolAId, studentA2Id);
    expect(profileA2).not.toBeNull();
    expect(profileA2?.hostel?.name).toBe("Nelson Mandela Hostel");
    expect(profileA2?.roommates.length).toBe(1); // Student A3 is roommate in Room A1

    const summaryA = await getHostelOccupancySummary(schoolAId);
    expect(summaryA.totalHostels).toBe(1);
    expect(summaryA.totalBeds).toBe(4);
    expect(summaryA.occupiedBeds).toBe(3); // A1, A2, A3
    expect(summaryA.occupancyPercentage).toBe(75);
  });

  it("proves complete multi-tenant isolation across schools", async () => {
    // School A student cannot be allocated to School B bed
    await expect(
      allocateStudentToBed(schoolAId, studentA1Id, hostelBId, roomB1Id, "random-bed-id")
    ).rejects.toThrow();

    // Summary for School B is completely isolated from School A
    const summaryB = await getHostelOccupancySummary(schoolBId);
    expect(summaryB.totalHostels).toBe(1);
    expect(summaryB.occupiedBeds).toBe(0);
    expect(summaryB.occupancyPercentage).toBe(0);
  });
});
