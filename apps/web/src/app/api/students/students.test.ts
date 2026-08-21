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

  it("safely handles timeline performedBy foreign key resolution", () => {
    const existingUsers = [
      { id: "19aa18ff-3525-44c2-953d-629a159178b1", email: "admin@apexium.edu" },
    ];

    function resolveAuditUserId(userId: string | null | undefined): string | null {
      if (!userId) return null;
      const match = existingUsers.find((u) => u.id === userId);
      return match ? match.id : null;
    }

    // When valid user in DB executes the action:
    expect(resolveAuditUserId("19aa18ff-3525-44c2-953d-629a159178b1")).toBe(
      "19aa18ff-3525-44c2-953d-629a159178b1"
    );

    // When synthetic/unregistered auth session user executes action:
    expect(resolveAuditUserId("non-existent-user-uuid")).toBeNull();
    expect(resolveAuditUserId(null)).toBeNull();
    expect(resolveAuditUserId(undefined)).toBeNull();
  });
});

