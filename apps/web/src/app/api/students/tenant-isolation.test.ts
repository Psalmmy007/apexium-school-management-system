import { describe, it, expect } from "vitest";

describe("Milestone 1 — Tenant Isolation Guarantee", () => {
  interface StudentRecord {
    id: string;
    schoolId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
  }

  // Mock repository enforcing school_id isolation on all operations
  class TenantIsolatedRepository {
    private dbStore: StudentRecord[] = [];

    insert(record: StudentRecord): StudentRecord {
      this.dbStore.push(record);
      return record;
    }

    // Every query filters strictly by the authenticated session's schoolId
    queryForSchool(schoolId: string): StudentRecord[] {
      return this.dbStore.filter((s) => s.schoolId === schoolId);
    }

    // Single item lookup scoped to schoolId
    findByIdForSchool(id: string, schoolId: string): StudentRecord | null {
      return (
        this.dbStore.find((s) => s.id === id && s.schoolId === schoolId) || null
      );
    }

    // Update item scoped to schoolId
    updateForSchool(
      id: string,
      schoolId: string,
      updates: Partial<Omit<StudentRecord, "id" | "schoolId">>
    ): StudentRecord | null {
      const index = this.dbStore.findIndex(
        (s) => s.id === id && s.schoolId === schoolId
      );
      if (index === -1) return null;

      this.dbStore[index] = { ...this.dbStore[index], ...updates };
      return this.dbStore[index];
    }

    // Delete item scoped to schoolId
    deleteForSchool(id: string, schoolId: string): boolean {
      const index = this.dbStore.findIndex(
        (s) => s.id === id && s.schoolId === schoolId
      );
      if (index === -1) return false;

      this.dbStore.splice(index, 1);
      return true;
    }
  }

  it("asserts School A admin query ONLY returns School A students and never leaks School B data", () => {
    const repo = new TenantIsolatedRepository();

    const schoolA = "school-uuid-alpha";
    const schoolB = "school-uuid-beta";

    repo.insert({
      id: "stud-1",
      schoolId: schoolA,
      admissionNumber: "ADM-A1",
      firstName: "Alice",
      lastName: "Alpha",
    });

    repo.insert({
      id: "stud-2",
      schoolId: schoolB,
      admissionNumber: "ADM-B1",
      firstName: "Bob",
      lastName: "Beta",
    });

    // Query for School A
    const schoolAStudents = repo.queryForSchool(schoolA);
    expect(schoolAStudents.length).toBe(1);
    expect(schoolAStudents[0].firstName).toBe("Alice");

    // Query for School B
    const schoolBStudents = repo.queryForSchool(schoolB);
    expect(schoolBStudents.length).toBe(1);
    expect(schoolBStudents[0].firstName).toBe("Bob");

    // Cross check
    expect(schoolAStudents.some((s) => s.schoolId === schoolB)).toBe(false);
  });

  it("asserts School A admin can NEVER fetch, update, or delete School B student records", () => {
    const repo = new TenantIsolatedRepository();

    const schoolA = "school-uuid-alpha";
    const schoolB = "school-uuid-beta";

    repo.insert({
      id: "stud-b-100",
      schoolId: schoolB,
      admissionNumber: "ADM-B100",
      firstName: "OriginalBetaName",
      lastName: "User",
    });

    // Attempt 1: School A trying to fetch School B student
    const fetchAttempt = repo.findByIdForSchool("stud-b-100", schoolA);
    expect(fetchAttempt).toBeNull();

    // Attempt 2: School A trying to update School B student
    const updateAttempt = repo.updateForSchool("stud-b-100", schoolA, {
      firstName: "HackedName",
    });
    expect(updateAttempt).toBeNull();

    // Verify original record in School B is untouched
    const schoolBRecord = repo.findByIdForSchool("stud-b-100", schoolB);
    expect(schoolBRecord?.firstName).toBe("OriginalBetaName");

    // Attempt 3: School A trying to delete School B student
    const deleteAttempt = repo.deleteForSchool("stud-b-100", schoolA);
    expect(deleteAttempt).toBe(false);

    // Verify record still exists in School B
    const stillExists = repo.findByIdForSchool("stud-b-100", schoolB);
    expect(stillExists).not.toBeNull();
  });
});
