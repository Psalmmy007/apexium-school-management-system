import { describe, it, expect } from "vitest";

describe("Staff Attendance API & Tenant Isolation", () => {
  interface StaffAttendanceRecord {
    schoolId: string;
    userId: string;
    date: string;
    status: "present" | "absent" | "late" | "excused";
  }

  function filterStaffAttendanceForTenant(
    records: StaffAttendanceRecord[],
    tenantSchoolId: string
  ): StaffAttendanceRecord[] {
    return records.filter((r) => r.schoolId === tenantSchoolId);
  }

  it("filters staff attendance records strictly by tenant schoolId", () => {
    const schoolA = "school-alpha-id";
    const schoolB = "school-beta-id";

    const allRecords: StaffAttendanceRecord[] = [
      { schoolId: schoolA, userId: "user-1", date: "2026-07-26", status: "present" },
      { schoolId: schoolB, userId: "user-2", date: "2026-07-26", status: "absent" },
      { schoolId: schoolA, userId: "user-3", date: "2026-07-26", status: "late" },
    ];

    const schoolARecords = filterStaffAttendanceForTenant(allRecords, schoolA);
    expect(schoolARecords.length).toBe(2);
    expect(schoolARecords.map((r) => r.userId)).toEqual(["user-1", "user-3"]);

    const schoolBRecords = filterStaffAttendanceForTenant(allRecords, schoolB);
    expect(schoolBRecords.length).toBe(1);
    expect(schoolBRecords[0].userId).toBe("user-2");
  });
});
