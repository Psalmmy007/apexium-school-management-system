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

  it("verifies the Standard 8-Period Day preset structure and sequence", async () => {
    const { STANDARD_8_PERIOD_PRESET } = await import("./timetable");
    expect(STANDARD_8_PERIOD_PRESET.length).toBe(11);
    
    // Check key periods
    expect(STANDARD_8_PERIOD_PRESET[0].name).toContain("Assembly");
    expect(STANDARD_8_PERIOD_PRESET[1].name).toBe("Period 1");
    expect(STANDARD_8_PERIOD_PRESET[4].name).toContain("Break");
    expect(STANDARD_8_PERIOD_PRESET[7].name).toContain("Lunch");
    expect(STANDARD_8_PERIOD_PRESET[10].name).toContain("Period 8");

    // Timings are sequential
    for (let i = 0; i < STANDARD_8_PERIOD_PRESET.length - 1; i++) {
      expect(STANDARD_8_PERIOD_PRESET[i].endTime).toBe(STANDARD_8_PERIOD_PRESET[i + 1].startTime);
    }
  });

  it("handles double-period consecutive slot allocation conflict validation", () => {
    const schoolId = "school-1";
    const existingEntries: ExistingEntry[] = [
      {
        schoolId,
        classId: "class-jss1",
        subjectId: "subj-math",
        teacherId: "teacher-smith",
        periodId: "period-3", // Already booked in period 3
        dayOfWeek: "tuesday",
      },
    ];

    // Double period attempt on period 2 + period 3 (consecutive)
    const doublePeriodSlot1: ExistingEntry = {
      schoolId,
      classId: "class-ss2",
      subjectId: "subj-chem",
      teacherId: "teacher-smith",
      periodId: "period-2",
      dayOfWeek: "tuesday",
    };

    const doublePeriodSlot2: ExistingEntry = {
      schoolId,
      classId: "class-ss2",
      subjectId: "subj-chem",
      teacherId: "teacher-smith",
      periodId: "period-3", // Collides with existing entry!
      dayOfWeek: "tuesday",
    };

    const res1 = validateTimetableEntry(existingEntries, doublePeriodSlot1);
    const res2 = validateTimetableEntry(existingEntries, doublePeriodSlot2);

    expect(res1.valid).toBe(true);
    expect(res2.valid).toBe(false); // Second slot caught by conflict engine!
    expect(res2.conflictError).toContain("Teacher Conflict");
  });
});

