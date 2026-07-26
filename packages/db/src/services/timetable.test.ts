import { describe, it, expect } from "vitest";

describe("Timetable Conflict Prevention Unit Tests", () => {
  interface ExistingEntry {
    schoolId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    periodId: string;
    dayOfWeek: string;
  }

  function validateTimetableEntry(
    existingEntries: ExistingEntry[],
    newEntry: ExistingEntry
  ): { valid: boolean; conflictError?: string } {
    // Check school_id multi-tenancy isolation
    if (newEntry.schoolId !== "school-1") {
      return { valid: false, conflictError: "Unauthorized tenant" };
    }

    // 1. Teacher Double-Booking Check
    const teacherConflict = existingEntries.find(
      (e) =>
        e.schoolId === newEntry.schoolId &&
        e.teacherId === newEntry.teacherId &&
        e.periodId === newEntry.periodId &&
        e.dayOfWeek === newEntry.dayOfWeek
    );

    if (teacherConflict) {
      return {
        valid: false,
        conflictError: `Teacher Conflict: Teacher ${newEntry.teacherId} is already scheduled in another class during period ${newEntry.periodId} on ${newEntry.dayOfWeek}`,
      };
    }

    // 2. Class Double-Booking Check
    const classConflict = existingEntries.find(
      (e) =>
        e.schoolId === newEntry.schoolId &&
        e.classId === newEntry.classId &&
        e.periodId === newEntry.periodId &&
        e.dayOfWeek === newEntry.dayOfWeek
    );

    if (classConflict) {
      return {
        valid: false,
        conflictError: `Class Conflict: Class ${newEntry.classId} already has a subject scheduled during period ${newEntry.periodId} on ${newEntry.dayOfWeek}`,
      };
    }

    return { valid: true };
  }

  it("prevents double-booking a teacher to two different classes in the same period", () => {
    const schoolId = "school-1";
    const existingEntries: ExistingEntry[] = [
      {
        schoolId,
        classId: "class-jss1",
        subjectId: "subj-math",
        teacherId: "teacher-smith",
        periodId: "period-1",
        dayOfWeek: "monday",
      },
    ];

    const doubleBookingAttempt: ExistingEntry = {
      schoolId,
      classId: "class-jss2", // Different class!
      subjectId: "subj-physics",
      teacherId: "teacher-smith", // Same teacher!
      periodId: "period-1", // Same period!
      dayOfWeek: "monday", // Same day!
    };

    const result = validateTimetableEntry(existingEntries, doubleBookingAttempt);
    expect(result.valid).toBe(false);
    expect(result.conflictError).toContain("Teacher Conflict");
  });

  it("prevents double-booking a class to two different subjects in the same period", () => {
    const schoolId = "school-1";
    const existingEntries: ExistingEntry[] = [
      {
        schoolId,
        classId: "class-jss1",
        subjectId: "subj-math",
        teacherId: "teacher-smith",
        periodId: "period-1",
        dayOfWeek: "monday",
      },
    ];

    const doubleBookingAttempt: ExistingEntry = {
      schoolId,
      classId: "class-jss1", // Same class!
      subjectId: "subj-english",
      teacherId: "teacher-jones", // Different teacher!
      periodId: "period-1", // Same period!
      dayOfWeek: "monday", // Same day!
    };

    const result = validateTimetableEntry(existingEntries, doubleBookingAttempt);
    expect(result.valid).toBe(false);
    expect(result.conflictError).toContain("Class Conflict");
  });

  it("allows non-conflicting timetable entry for different periods or days", () => {
    const schoolId = "school-1";
    const existingEntries: ExistingEntry[] = [
      {
        schoolId,
        classId: "class-jss1",
        subjectId: "subj-math",
        teacherId: "teacher-smith",
        periodId: "period-1",
        dayOfWeek: "monday",
      },
    ];

    const validNextPeriodAttempt: ExistingEntry = {
      schoolId,
      classId: "class-jss1",
      subjectId: "subj-english",
      teacherId: "teacher-jones",
      periodId: "period-2", // Different period!
      dayOfWeek: "monday",
    };

    const result = validateTimetableEntry(existingEntries, validNextPeriodAttempt);
    expect(result.valid).toBe(true);
    expect(result.conflictError).toBeUndefined();
  });
});
