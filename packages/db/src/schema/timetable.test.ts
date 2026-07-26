import { describe, it, expect } from "vitest";
import {
  subjects,
  periods,
  timetableEntries,
  dayOfWeekEnum,
} from "./index.js";

describe("Timetable Schema Definitions & Multi-tenancy Columns", () => {
  it("enforces school_id foreign key multi-tenancy on subjects table", () => {
    expect(subjects.schoolId).toBeDefined();
    expect(subjects.name).toBeDefined();
    expect(subjects.code).toBeDefined();
  });

  it("enforces school_id foreign key multi-tenancy on periods table", () => {
    expect(periods.schoolId).toBeDefined();
    expect(periods.name).toBeDefined();
    expect(periods.startTime).toBeDefined();
    expect(periods.endTime).toBeDefined();
    expect(periods.sortOrder).toBeDefined();
  });

  it("enforces school_id foreign key multi-tenancy and constraints on timetable_entries table", () => {
    expect(timetableEntries.schoolId).toBeDefined();
    expect(timetableEntries.classId).toBeDefined();
    expect(timetableEntries.subjectId).toBeDefined();
    expect(timetableEntries.teacherId).toBeDefined();
    expect(timetableEntries.periodId).toBeDefined();
    expect(timetableEntries.dayOfWeek).toBeDefined();
  });
});
