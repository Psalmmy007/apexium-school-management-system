import { db, timetableEntries, classes, subjects, users, periods } from "../index.js";
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
  } = params;

  // 1. Conflict Prevention Check: Teacher Double-Booking
  // A teacher cannot teach two classes in the same period on the same day
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
        eq(timetableEntries.dayOfWeek, dayOfWeek)
      )
    );

  if (existingTeacherConflict.length > 0) {
    const conflictingClass = existingTeacherConflict[0].className;
    throw new Error(
      `Teacher Conflict: Teacher is already scheduled to teach class "${conflictingClass}" during this period on ${dayOfWeek}.`
    );
  }

  // 2. Conflict Prevention Check: Class Double-Booking
  // A class cannot have two subjects/periods assigned at the same time
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
        eq(timetableEntries.dayOfWeek, dayOfWeek)
      )
    );

  if (existingClassConflict.length > 0) {
    const conflictingSubject = existingClassConflict[0].subjectName;
    throw new Error(
      `Class Conflict: Class already has subject "${conflictingSubject}" scheduled during this period on ${dayOfWeek}.`
    );
  }

  // 3. Insert new timetable entry
  const [newEntry] = await db
    .insert(timetableEntries)
    .values({
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
