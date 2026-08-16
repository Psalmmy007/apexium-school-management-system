import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  schools,
  classes,
  terms,
  subjects,
  gradingScales,
  students,
  guardians,
  studentGuardians,
  users,
  schoolSettings,
  createSchoolWithTenant,
  executeCoreSchoolSetup,
  createGuardian,
  linkStudentGuardian,
  getStudentGuardians,
  getParentChildren,
} from "../index";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

describe("Milestone 40: Setup Wizard Restructure & Dependent-Page Integrity", () => {
  let schoolId: string;

  beforeEach(async () => {
    const school = await createSchoolWithTenant({
      name: `Milestone 40 Academy ${Date.now()}`,
      address: "123 Victory Blvd, Abuja",
      phone: "+2348031234567",
      email: `m40-${Date.now()}@apexium.edu`,
    });
    schoolId = school.id;
  });

  it("1. executeCoreSchoolSetup sets up core structure (terms, classes, subjects, grading scale) without fake people", async () => {
    const customTerms = [
      { name: "First Term", start: "2025-09-08", end: "2025-12-19", isCurrent: true },
      { name: "Second Term", start: "2026-01-12", end: "2026-04-17", isCurrent: false },
      { name: "Third Term", start: "2026-05-04", end: "2026-07-31", isCurrent: false },
    ];

    const customClasses = ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"];
    const customDepts = ["Primary School", "Early Years"];
    const customSubjects = [
      { name: "Mathematics", code: "MTH" },
      { name: "English Language", code: "ENG" },
      { name: "Basic Science & Technology", code: "BST" },
      { name: "Social Studies", code: "SOS" },
    ];

    const customGradeBands = [
      { grade: "A", minScore: 80, maxScore: 100, remark: "Distinction" },
      { grade: "B", minScore: 70, maxScore: 79.99, remark: "Credit" },
      { grade: "C", minScore: 60, maxScore: 69.99, remark: "Merit" },
      { grade: "D", minScore: 50, maxScore: 59.99, remark: "Pass" },
      { grade: "F", minScore: 0, maxScore: 49.99, remark: "Fail" },
    ];

    const result = await executeCoreSchoolSetup({
      schoolId,
      sessionName: "2025/2026",
      terms: customTerms,
      classNames: customClasses,
      departmentNames: customDepts,
      subjects: customSubjects,
      gradeBands: customGradeBands,
    });

    expect(result.success).toBe(true);
    expect(result.termsCount).toBe(3);
    expect(result.classesCount).toBe(6);
    expect(result.departmentsCount).toBe(2);
    expect(result.subjectsCount).toBe(4);
    expect(result.gradingBandsCount).toBe(5);
    expect(result.onboardingStatus).toBe("Completed");

    // Verify Terms written to database with exact dates
    const dbTerms = await db.select().from(terms).where(eq(terms.schoolId, schoolId));
    expect(dbTerms.length).toBe(3);
    const activeTerm = dbTerms.find((t) => t.isCurrent);
    expect(activeTerm).toBeDefined();
    expect(activeTerm?.name).toBe("First Term");

    // Verify Classes written to database
    const dbClasses = await db.select().from(classes).where(eq(classes.schoolId, schoolId));
    expect(dbClasses.length).toBe(6);
    expect(dbClasses.map((c) => c.name)).toEqual(
      expect.arrayContaining(["Primary 1", "Primary 6"])
    );

    // Verify Subjects written to database
    const dbSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
    expect(dbSubjects.length).toBe(4);
    expect(dbSubjects.find((s) => s.code === "BST")?.name).toBe("Basic Science & Technology");

    // Verify Grading Scales written to database
    const dbScales = await db.select().from(gradingScales).where(eq(gradingScales.schoolId, schoolId));
    expect(dbScales.length).toBe(5);
    expect(dbScales.find((g) => g.grade === "A")?.remark).toBe("Distinction");

    // Verify NO fake students were provisioned by the wizard
    const dbStudents = await db.select().from(students).where(eq(students.schoolId, schoolId));
    expect(dbStudents.length).toBe(0);
  });

  it("2. Register student with real class assignment and link reusable guardian", async () => {
    // 1. Core setup
    await executeCoreSchoolSetup({
      schoolId,
      sessionName: "2025/2026",
      classNames: ["JSS 1", "JSS 2"],
    });

    const [jss1Class] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.name, "JSS 1")));
    expect(jss1Class).toBeDefined();

    // 2. Register a real student into JSS 1
    const studentId = crypto.randomUUID();
    const [createdStudent] = await db
      .insert(students)
      .values({
        id: studentId,
        schoolId,
        admissionNumber: `ADM-${Date.now()}-001`,
        firstName: "Chinedu",
        lastName: "Okafor",
        gender: "male",
        classId: jss1Class.id,
        admissionDate: new Date(),
        status: "active",
      })
      .returning();

    expect(createdStudent.classId).toBe(jss1Class.id);

    // 3. Register and link Guardian (Ward Linking)
    const guardian = await createGuardian(schoolId, {
      firstName: "Emeka",
      lastName: "Okafor",
      phone: "+2348098765432",
      email: "emeka.okafor@example.com",
      relationship: "Father",
    });

    const link = await linkStudentGuardian(schoolId, createdStudent.id, guardian.id, "Father", true);
    expect(link).toBeDefined();
    expect(link.studentId).toBe(createdStudent.id);
    expect(link.guardianId).toBe(guardian.id);

    // 4. Query linked guardians for this student
    const linkedGuardians = await getStudentGuardians(schoolId, createdStudent.id);
    expect(linkedGuardians.length).toBe(1);
    expect(linkedGuardians[0].firstName).toBe("Emeka");
    expect(linkedGuardians[0].relationship).toBe("Father");
  });

  it("3. Full chain end-to-end: student registered -> assigned class from setup -> linked to parent -> Parent Portal retrieves student record", async () => {
    // 1. Core setup creates classes
    await executeCoreSchoolSetup({
      schoolId,
      sessionName: "2025/2026",
      classNames: ["SSS 3 Science", "SSS 3 Commercial"],
    });

    const [sss3Class] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.name, "SSS 3 Science")));
    expect(sss3Class).toBeDefined();

    // 2. Register real student into SSS 3 Science
    const studentId = crypto.randomUUID();
    const [realStudent] = await db
      .insert(students)
      .values({
        id: studentId,
        schoolId,
        admissionNumber: `ADM-2026-${Date.now()}`,
        firstName: "Tunde",
        lastName: "Bakare",
        gender: "male",
        classId: sss3Class.id,
        admissionDate: new Date(),
        status: "active",
      })
      .returning();

    // 3. Create a parent user account & guardian record
    const parentUserId = crypto.randomUUID();
    await db.insert(users).values({
      id: parentUserId,
      schoolId,
      email: `parent-m40-${Date.now()}@test.edu`,
      role: "parent",
      firstName: "Funmilayo",
      lastName: "Bakare",
    });

    const guardian = await createGuardian(schoolId, {
      firstName: "Funmilayo",
      lastName: "Bakare",
      phone: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `funmi-${Date.now()}@example.com`,
      relationship: "Mother",
    });

    // 4. Link student to guardian with parentId
    await linkStudentGuardian(schoolId, realStudent.id, guardian.id, "Mother", true, parentUserId);

    // 5. Parent queries Parent Portal for their children
    const parentChildrenByUserId = await getParentChildren(schoolId, parentUserId);
    expect(parentChildrenByUserId.length).toBe(1);
    expect(parentChildrenByUserId[0].id).toBe(realStudent.id);
    expect(parentChildrenByUserId[0].firstName).toBe("Tunde");
    expect(parentChildrenByUserId[0].lastName).toBe("Bakare");
    expect(parentChildrenByUserId[0].classId).toBe(sss3Class.id);

    // Querying by guardian record ID also resolves the linked student
    const parentChildrenByGuardianId = await getParentChildren(schoolId, guardian.id);
    expect(parentChildrenByGuardianId.length).toBe(1);
    expect(parentChildrenByGuardianId[0].id).toBe(realStudent.id);

    // 6. Confirm an unrelated parent sees ZERO children
    const unrelatedParentId = crypto.randomUUID();
    const unrelatedChildren = await getParentChildren(schoolId, unrelatedParentId);
    expect(unrelatedChildren.length).toBe(0);
  });
});
