import { describe, it, expect } from "vitest";
import { attendanceRxSchema } from "./database.js";

describe("RxDB Offline Storage Configuration", () => {
  it("defines attendance schema with primary key and required properties", () => {
    expect(attendanceRxSchema.primaryKey).toBe("id");
    expect(attendanceRxSchema.properties.schoolId).toBeDefined();
    expect(attendanceRxSchema.properties.studentId).toBeDefined();
    expect(attendanceRxSchema.properties.classId).toBeDefined();
    expect(attendanceRxSchema.properties.date).toBeDefined();
    expect(attendanceRxSchema.properties.status).toBeDefined();
    expect(attendanceRxSchema.properties.updatedAt).toBeDefined();
  });
});
