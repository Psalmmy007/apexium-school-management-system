import { db } from "../index";
import { guardians, studentGuardians, students } from "../schema";
import { eq, and, or, like, desc } from "drizzle-orm";

export interface GuardianInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  occupation?: string;
  address?: string;
}

// ── Search & Get Reusable Guardians ──────────────────────────
export async function searchGuardians(schoolId: string, query?: string) {
  const conditions = [eq(guardians.schoolId, schoolId)];
  if (query && query.trim() !== "") {
    const pattern = `%${query.trim()}%`;
    conditions.push(
      or(
        like(guardians.firstName, pattern),
        like(guardians.lastName, pattern),
        like(guardians.phone, pattern),
        like(guardians.email, pattern)
      )!
    );
  }

  return await db
    .select()
    .from(guardians)
    .where(and(...conditions))
    .orderBy(desc(guardians.createdAt))
    .limit(20);
}

export async function createGuardian(schoolId: string, input: GuardianInput) {
  // Check if guardian with same phone already exists in this school
  const [existing] = await db
    .select()
    .from(guardians)
    .where(and(eq(guardians.schoolId, schoolId), eq(guardians.phone, input.phone.trim())));

  if (existing) {
    return existing;
  }

  const [newGuardian] = await db
    .insert(guardians)
    .values({
      schoolId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email ? input.email.trim() : null,
      occupation: input.occupation ? input.occupation.trim() : null,
      address: input.address ? input.address.trim() : null,
    })
    .returning();

  return newGuardian;
}

export async function linkStudentGuardian(
  schoolId: string,
  studentId: string,
  guardianId: string,
  relationship: string = "Father",
  isPrimary: boolean = true
) {
  // Check if already linked
  const [existingLink] = await db
    .select()
    .from(studentGuardians)
    .where(
      and(
        eq(studentGuardians.schoolId, schoolId),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.guardianId, guardianId)
      )
    );

  if (existingLink) {
    const [updated] = await db
      .update(studentGuardians)
      .set({ relationship, isPrimary, updatedAt: new Date() })
      .where(eq(studentGuardians.id, existingLink.id))
      .returning();
    return updated;
  }

  const [link] = await db
    .insert(studentGuardians)
    .values({
      schoolId,
      studentId,
      guardianId,
      relationship,
      isPrimary,
    })
    .returning();

  return link;
}

export async function getStudentGuardians(schoolId: string, studentId: string) {
  return await db
    .select({
      id: studentGuardians.id,
      studentId: studentGuardians.studentId,
      guardianId: studentGuardians.guardianId,
      relationship: studentGuardians.relationship,
      isPrimary: studentGuardians.isPrimary,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      phone: guardians.phone,
      email: guardians.email,
      occupation: guardians.occupation,
      address: guardians.address,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .where(
      and(
        eq(studentGuardians.schoolId, schoolId),
        eq(studentGuardians.studentId, studentId)
      )
    );
}
