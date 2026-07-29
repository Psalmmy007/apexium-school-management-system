import { describe, it, expect, beforeAll } from "vitest";
import { db, schools, students } from "../index";
import {
  createAcademicSection,
  getAcademicSections,
  createClass,
  getClassesWithHierarchy,
  createStream,
} from "./academic-structure";
import { createGuardian, searchGuardians, linkStudentGuardian, getStudentGuardians } from "./guardians";

describe("Milestone 16: Academic Structure & Reusable Guardians", () => {
  let schoolId: string;
  let studentId: string;

  beforeAll(async () => {
    const [sch] = await db
      .insert(schools)
      .values({ name: "Structure Test School", slug: `struct-sch-${Date.now()}` })
      .returning();
    schoolId = sch.id;

    const [st] = await db
      .insert(students)
      .values({
        schoolId,
        admissionNumber: `ADM/STRUCT/${Date.now()}`,
        firstName: "Test",
        lastName: "Student",
      })
      .returning();
    studentId = st.id;
  });

  it("creates and retrieves academic sections", async () => {
    const sec = await createAcademicSection(schoolId, {
      name: "Senior Secondary",
      code: "SSS",
      displayOrder: 1,
    });
    expect(sec.name).toBe("Senior Secondary");

    const sections = await getAcademicSections(schoolId);
    expect(sections.length).toBeGreaterThan(0);
  });

  it("creates classes and streams under academic structure", async () => {
    const cls = await createClass(schoolId, {
      name: "SS 1",
      code: "SS1",
      capacity: 40,
    });
    expect(cls.name).toBe("SS 1");

    const stream = await createStream(schoolId, {
      classId: cls.id,
      name: "Gold Stream",
      capacity: 20,
    });
    expect(stream.name).toBe("Gold Stream");

    const hierarchy = await getClassesWithHierarchy(schoolId);
    expect(hierarchy.classes.some((c) => c.id === cls.id)).toBe(true);
  });

  it("creates reusable guardians and links multiple children", async () => {
    const guardian = await createGuardian(schoolId, {
      firstName: "Samuel",
      lastName: "Johnson",
      phone: `+234${Date.now()}`,
      email: "samuel@parent.com",
    });
    expect(guardian.phone).toContain("+234");

    const searchRes = await searchGuardians(schoolId, "Samuel");
    expect(searchRes.length).toBeGreaterThan(0);

    const link = await linkStudentGuardian(schoolId, studentId, guardian.id, "Father", true);
    expect(link.relationship).toBe("Father");

    const guardiansList = await getStudentGuardians(schoolId, studentId);
    expect(guardiansList.length).toBeGreaterThan(0);
  });
});
