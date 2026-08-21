import { db, timetableEntries, classes, subjects, users, periods } from "../index";
import { eq, and } from "drizzle-orm";

export interface CreateTimetableParams {
  schoolId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  periodId: string;
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  roomNumber?: string | null;
  isDoublePeriod?: boolean;
}

export const STANDARD_8_PERIOD_PRESET = [
  { name: "Morning Assembly & Devotion", startTime: "08:00", endTime: "08:30", sortOrder: 1 },
  { name: "Period 1", startTime: "08:30", endTime: "09:15", sortOrder: 2 },
  { name: "Period 2", startTime: "09:15", endTime: "10:00", sortOrder: 3 },
  { name: "Period 3", startTime: "10:00", endTime: "10:45", sortOrder: 4 },
  { name: "Short Break / Recess", startTime: "10:45", endTime: "11:15", sortOrder: 5 },
  { name: "Period 4", startTime: "11:15", endTime: "12:00", sortOrder: 6 },
  { name: "Period 5", startTime: "12:00", endTime: "12:45", sortOrder: 7 },
  { name: "Long Break / Lunch", startTime: "12:45", endTime: "13:30", sortOrder: 8 },
  { name: "Period 6", startTime: "13:30", endTime: "14:15", sortOrder: 9 },
  { name: "Period 7", startTime: "14:15", endTime: "15:00", sortOrder: 10 },
  { name: "Period 8 / Clubs & Prep", startTime: "15:00", endTime: "15:45", sortOrder: 11 },
];

export async function getPeriodsForSchool(schoolId: string) {
  const list = await db
    .select()
    .from(periods)
    .where(eq(periods.schoolId, schoolId));
  return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function seedStandard8Periods(schoolId: string, overwrite = false) {
  const existing = await getPeriodsForSchool(schoolId);
  if (existing.length > 0 && !overwrite) {
    return existing;
  }

  if (overwrite && existing.length > 0) {
    // Delete existing periods
    for (const p of existing) {
      await db.delete(periods).where(and(eq(periods.id, p.id), eq(periods.schoolId, schoolId)));
    }
  }

  const createdPeriods = [];
  for (const preset of STANDARD_8_PERIOD_PRESET) {
    const [p] = await db
      .insert(periods)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        name: preset.name,
        startTime: preset.startTime,
        endTime: preset.endTime,
        sortOrder: preset.sortOrder,
      })
      .returning();
    createdPeriods.push(p);
  }

  return createdPeriods;
}

export async function createPeriod(params: {
  schoolId: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder?: number;
}) {
  const existing = await getPeriodsForSchool(params.schoolId);
  const nextOrder = params.sortOrder ?? (existing.length > 0 ? Math.max(...existing.map((p) => p.sortOrder || 0)) + 1 : 1);

  const [newPeriod] = await db
    .insert(periods)
    .values({
      id: crypto.randomUUID(),
      schoolId: params.schoolId,
      name: params.name.trim(),
      startTime: params.startTime.trim(),
      endTime: params.endTime.trim(),
      sortOrder: nextOrder,
    })
    .returning();

  return newPeriod;
}

export async function updatePeriod(params: {
  schoolId: string;
  periodId: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  sortOrder?: number;
}) {
  const updateData: any = { updatedAt: new Date() };
  if (params.name !== undefined) updateData.name = params.name.trim();
  if (params.startTime !== undefined) updateData.startTime = params.startTime.trim();
  if (params.endTime !== undefined) updateData.endTime = params.endTime.trim();
  if (params.sortOrder !== undefined) updateData.sortOrder = params.sortOrder;

  const [updated] = await db
    .update(periods)
    .set(updateData)
    .where(and(eq(periods.id, params.periodId), eq(periods.schoolId, params.schoolId)))
    .returning();

  return updated;
}

export async function deletePeriod(schoolId: string, periodId: string) {
  // 1. Delete associated timetable entries first
  await db
    .delete(timetableEntries)
    .where(and(eq(timetableEntries.periodId, periodId), eq(timetableEntries.schoolId, schoolId)));

  // 2. Delete period
  await db
    .delete(periods)
    .where(and(eq(periods.id, periodId), eq(periods.schoolId, schoolId)));

  return { success: true };
}

export async function deleteTimetableEntry(schoolId: string, entryId: string) {
  await db
    .delete(timetableEntries)
    .where(and(eq(timetableEntries.id, entryId), eq(timetableEntries.schoolId, schoolId)));
  return { success: true };
}

export async function createTimetableEntry(params: CreateTimetableParams) {
  const {
    schoolId,
    classId,
    sectionId,
    subjectId,
    teacherId,
    periodId,
    dayOfWeek,
    roomNumber,
    isDoublePeriod,
  } = params;

  // Handle double period: schedule current period + next consecutive period
  if (isDoublePeriod) {
    const allPeriods = await getPeriodsForSchool(schoolId);
    const currentIndex = allPeriods.findIndex((p) => p.id === periodId);

    if (currentIndex === -1 || currentIndex >= allPeriods.length - 1) {
      throw new Error("Cannot create a double period for the last period in the schedule.");
    }

    const nextPeriod = allPeriods[currentIndex + 1];

    // Check conflict on first slot
    await assertNoTimetableConflict({
      schoolId,
      classId,
      teacherId,
      periodId,
      dayOfWeek,
    });

    // Check conflict on second slot
    await assertNoTimetableConflict({
      schoolId,
      classId,
      teacherId,
      periodId: nextPeriod.id,
      dayOfWeek,
    });

    // Insert first slot
    const [firstEntry] = await db
      .insert(timetableEntries)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        classId,
        sectionId: sectionId || null,
        subjectId,
        teacherId,
        periodId,
        dayOfWeek,
        roomNumber: roomNumber || null,
      })
      .returning();

    // Insert second slot
    const [secondEntry] = await db
      .insert(timetableEntries)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        classId,
        sectionId: sectionId || null,
        subjectId,
        teacherId,
        periodId: nextPeriod.id,
        dayOfWeek,
        roomNumber: roomNumber || null,
      })
      .returning();

    return [firstEntry, secondEntry];
  }

  // Single period check
  await assertNoTimetableConflict({
    schoolId,
    classId,
    teacherId,
    periodId,
    dayOfWeek,
  });

  // Insert single timetable entry
  const [newEntry] = await db
    .insert(timetableEntries)
    .values({
      id: crypto.randomUUID(),
      schoolId,
      classId,
      sectionId: sectionId || null,
      subjectId,
      teacherId,
      periodId,
      dayOfWeek,
      roomNumber: roomNumber || null,
    })
    .returning();

  return newEntry;
}

async function assertNoTimetableConflict(params: {
  schoolId: string;
  classId: string;
  teacherId: string;
  periodId: string;
  dayOfWeek: string;
}) {
  const { schoolId, classId, teacherId, periodId, dayOfWeek } = params;

  // 1. Conflict Prevention Check: Teacher Double-Booking
  const existingTeacherConflict = await db
    .select({
      id: timetableEntries.id,
      className: classes.name,
    })
    .from(timetableEntries)
    .innerJoin(classes, eq(timetableEntries.classId, classes.id))
    .where(
      and(
        eq(timetableEntries.schoolId, schoolId),
        eq(timetableEntries.teacherId, teacherId),
        eq(timetableEntries.periodId, periodId),
        eq(timetableEntries.dayOfWeek, dayOfWeek as any)
      )
    );

  if (existingTeacherConflict.length > 0) {
    const conflictingClass = existingTeacherConflict[0].className;
    throw new Error(
      `Teacher Conflict: Teacher is already scheduled to teach class "${conflictingClass}" during this period on ${dayOfWeek}.`
    );
  }

  // 2. Conflict Prevention Check: Class Double-Booking
  const existingClassConflict = await db
    .select({
      id: timetableEntries.id,
      subjectName: subjects.name,
    })
    .from(timetableEntries)
    .innerJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
    .where(
      and(
        eq(timetableEntries.schoolId, schoolId),
        eq(timetableEntries.classId, classId),
        eq(timetableEntries.periodId, periodId),
        eq(timetableEntries.dayOfWeek, dayOfWeek as any)
      )
    );

  if (existingClassConflict.length > 0) {
    const conflictingSubject = existingClassConflict[0].subjectName;
    throw new Error(
      `Class Conflict: Class already has subject "${conflictingSubject}" scheduled during this period on ${dayOfWeek}.`
    );
  }
}

export async function getTimetableForClass(schoolId: string, classId: string) {
  return await db
    .select({
      id: timetableEntries.id,
      schoolId: timetableEntries.schoolId,
      classId: timetableEntries.classId,
      sectionId: timetableEntries.sectionId,
      subjectId: timetableEntries.subjectId,
      teacherId: timetableEntries.teacherId,
      periodId: timetableEntries.periodId,
      dayOfWeek: timetableEntries.dayOfWeek,
      roomNumber: timetableEntries.roomNumber,
      className: classes.name,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherFirstName: users.firstName,
      teacherLastName: users.lastName,
      periodName: periods.name,
      periodStartTime: periods.startTime,
      periodEndTime: periods.endTime,
      periodSortOrder: periods.sortOrder,
    })
    .from(timetableEntries)
    .innerJoin(classes, eq(timetableEntries.classId, classes.id))
    .innerJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
    .innerJoin(users, eq(timetableEntries.teacherId, users.id))
    .innerJoin(periods, eq(timetableEntries.periodId, periods.id))
    .where(
      and(
        eq(timetableEntries.schoolId, schoolId),
        eq(timetableEntries.classId, classId)
      )
    );
}
