import { db } from "../index";
import { academicSections, classes, sections, users, students } from "../schema";
import { eq, and, asc, sql } from "drizzle-orm";

export interface AcademicSectionInput {
  name: string;
  code?: string;
  displayOrder?: number;
}

export interface ClassInput {
  sectionId?: string;
  name: string;
  code?: string;
  classTeacherId?: string;
  capacity?: number;
  displayOrder?: number;
}

export interface StreamInput {
  classId: string;
  name: string;
  classTeacherId?: string;
  capacity?: number;
  displayOrder?: number;
}

// ── Academic Section Services ─────────────────────────────────
export async function getAcademicSections(schoolId: string) {
  return await db
    .select()
    .from(academicSections)
    .where(and(eq(academicSections.schoolId, schoolId), eq(academicSections.status, "active")))
    .orderBy(asc(academicSections.displayOrder), asc(academicSections.name));
}

export async function createAcademicSection(schoolId: string, input: AcademicSectionInput) {
  const [section] = await db
    .insert(academicSections)
    .values({
      schoolId,
      name: input.name,
      code: input.code || null,
      displayOrder: input.displayOrder ?? 1,
      status: "active",
    })
    .returning();
  return section;
}

export async function updateAcademicSection(
  schoolId: string,
  sectionId: string,
  input: Partial<AcademicSectionInput> & { status?: string }
) {
  const [updated] = await db
    .update(academicSections)
    .set({
      ...(input.name && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      ...(input.status && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(and(eq(academicSections.id, sectionId), eq(academicSections.schoolId, schoolId)))
    .returning();
  return updated;
}

// ── Class Services ────────────────────────────────────────────
export async function getClassesWithHierarchy(schoolId: string) {
  const allSections = await getAcademicSections(schoolId);
  const allClasses = await db
    .select({
      id: classes.id,
      schoolId: classes.schoolId,
      sectionId: classes.sectionId,
      name: classes.name,
      code: classes.code,
      classTeacherId: classes.classTeacherId,
      capacity: classes.capacity,
      displayOrder: classes.displayOrder,
      status: classes.status,
      teacherFirstName: users.firstName,
      teacherLastName: users.lastName,
    })
    .from(classes)
    .leftJoin(users, eq(classes.classTeacherId, users.id))
    .where(and(eq(classes.schoolId, schoolId), eq(classes.status, "active")))
    .orderBy(asc(classes.displayOrder), asc(classes.name));

  const allStreams = await db
    .select({
      id: sections.id,
      schoolId: sections.schoolId,
      classId: sections.classId,
      name: sections.name,
      capacity: sections.capacity,
      classTeacherId: sections.classTeacherId,
      displayOrder: sections.displayOrder,
      status: sections.status,
      teacherFirstName: users.firstName,
      teacherLastName: users.lastName,
    })
    .from(sections)
    .leftJoin(users, eq(sections.classTeacherId, users.id))
    .where(and(eq(sections.schoolId, schoolId), eq(sections.status, "active")))
    .orderBy(asc(sections.displayOrder), asc(sections.name));

  // Count student occupancy
  const studentCounts = await db
    .select({
      classId: students.classId,
      sectionId: students.sectionId,
      count: sql<number>`count(*)`,
    })
    .from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.status, "active")))
    .groupBy(students.classId, students.sectionId);

  const countMap: Record<string, number> = {};
  for (const row of studentCounts) {
    if (row.classId) {
      countMap[row.classId] = (countMap[row.classId] || 0) + Number(row.count);
    }
  }

  return {
    sections: allSections,
    classes: allClasses.map((cls) => ({
      ...cls,
      studentCount: countMap[cls.id] || 0,
      streams: allStreams.filter((str) => str.classId === cls.id),
    })),
    streams: allStreams,
  };
}

export async function createClass(schoolId: string, input: ClassInput) {
  const [cls] = await db
    .insert(classes)
    .values({
      schoolId,
      sectionId: input.sectionId || null,
      name: input.name,
      code: input.code || null,
      classTeacherId: input.classTeacherId || null,
      capacity: input.capacity || null,
      displayOrder: input.displayOrder ?? 1,
      status: "active",
    })
    .returning();
  return cls;
}

export async function updateClass(
  schoolId: string,
  classId: string,
  input: Partial<ClassInput> & { status?: string }
) {
  const [updated] = await db
    .update(classes)
    .set({
      ...(input.sectionId !== undefined && { sectionId: input.sectionId }),
      ...(input.name && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.classTeacherId !== undefined && { classTeacherId: input.classTeacherId }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      ...(input.status && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
    .returning();
  return updated;
}

// ── Stream / Arm Services ─────────────────────────────────────
export async function createStream(schoolId: string, input: StreamInput) {
  const [stream] = await db
    .insert(sections)
    .values({
      schoolId,
      classId: input.classId,
      name: input.name,
      capacity: input.capacity || null,
      classTeacherId: input.classTeacherId || null,
      displayOrder: input.displayOrder ?? 1,
      status: "active",
    })
    .returning();
  return stream;
}

export async function updateStream(
  schoolId: string,
  streamId: string,
  input: Partial<StreamInput> & { status?: string }
) {
  const [updated] = await db
    .update(sections)
    .set({
      ...(input.name && { name: input.name }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.classTeacherId !== undefined && { classTeacherId: input.classTeacherId }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      ...(input.status && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(and(eq(sections.id, streamId), eq(sections.schoolId, schoolId)))
    .returning();
  return updated;
}
