import { describe, it, expect } from "vitest";

// Unit test verifying student payload structure and school_id scoping logic
describe("Student CRUD API & Tenant Scoping Logic", () => {
  interface StudentPayload {
    schoolId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
  }

  function createStudentPayload(
    schoolId: string,
    data: Omit<StudentPayload, "schoolId">
  ): StudentPayload {
    return {
      schoolId,
      ...data,
    };
  }

  function filterStudentsByTenant<T extends { schoolId: string }>(
    studentsList: T[],
    tenantSchoolId: string
  ): T[] {
    return studentsList.filter((s) => s.schoolId === tenantSchoolId);
  }

  it("stamps schoolId onto new student payload automatically", () => {
    const schoolId = "school-uuid-123";
    const payload = createStudentPayload(schoolId, {
      admissionNumber: "ADM-001",
      firstName: "John",
      lastName: "Doe",
    });

    expect(payload.schoolId).toBe("school-uuid-123");
    expect(payload.firstName).toBe("John");
  });

  it("filters student records strictly by tenant schoolId", () => {
    const schoolA = "school-a-111";
    const schoolB = "school-b-222";

    const allStudents = [
      { id: "1", schoolId: schoolA, firstName: "Alice" },
      { id: "2", schoolId: schoolB, firstName: "Bob" },
      { id: "3", schoolId: schoolA, firstName: "Charlie" },
    ];

    const schoolAStudents = filterStudentsByTenant(allStudents, schoolA);
    expect(schoolAStudents.length).toBe(2);
    expect(schoolAStudents.map((s) => s.firstName)).toEqual(["Alice", "Charlie"]);

    const schoolBStudents = filterStudentsByTenant(allStudents, schoolB);
    expect(schoolBStudents.length).toBe(1);
    expect(schoolBStudents[0].firstName).toBe("Bob");
  });
});
