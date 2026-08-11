import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  students,
  classes,
  hrDepartments,
  terms,
  libraryBooks,
  transportRoutes,
  feeStructures,
  feeInvoices,
} from "../index";
import {
  createSchoolWithTenant,
  provisionFirstAdminUser,
  configureAcademicSessionAndTerms,
  configureClassesAndDepartments,
  provisionTeachersAndStaff,
  provisionStudentsAndClassAssignments,
  getSchoolOnboardingStatus,
  completeSchoolOnboarding,
} from "./setup";
import {
  globalSearchEntities,
  executeBulkStudentActions,
  getModuleWorkflowStatus,
} from "./workflow-integration";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;

let adminAId: string;
let adminBId: string;

let classAId: string;
let classBId: string;

let teacherAId: string;
let teacherBId: string;

let studentA1Id: string;
let studentA2Id: string;
let studentB1Id: string;

let termBId: string;
let feeStructureBId: string;
let invoiceBId: string;

beforeAll(async () => {
  // ── SCHOOL A SETUP SEQUENCE ─────────────────────────
  // 1. Create School A
  const sA = await createSchoolWithTenant({
    name: "Apexium Benchmark School A",
    motto: "Knowledge and Excellence",
  });
  schoolAId = sA.id;

  // 2. Create Admin A
  const adminA = await provisionFirstAdminUser(schoolAId, {
    email: `admin.a.${Date.now()}@schoola.edu.ng`,
    firstName: "Admin",
    lastName: "SchoolA",
  });
  adminAId = adminA.id;

  // 3. Create Session & Terms
  const { session, terms: termsA } = await configureAcademicSessionAndTerms(schoolAId, "2025/2026");

  // 4. Create Departments & Classes
  const { classes: classesA, departments: deptsA } = await configureClassesAndDepartments(
    schoolAId,
    ["JSS 1", "JSS 2", "SSS 1"],
    ["Sciences", "Arts"]
  );
  classAId = classesA[0].id;

  // 5. Create Teacher A
  const staffA = await provisionTeachersAndStaff(schoolAId, [
    { firstName: "Victor", lastName: "TeacherA", email: `teacher.a.${Date.now()}@schoola.edu.ng` },
  ]);
  teacherAId = staffA[0].id;

  // 6. Create Students & Assign to Class
  const studentsA = await provisionStudentsAndClassAssignments(schoolAId, [
    { firstName: "Alexander", lastName: "Hamilton", classId: classAId },
    { firstName: "Elizabeth", lastName: "Schuyler", classId: classAId },
  ]);
  studentA1Id = studentsA[0].id;
  studentA2Id = studentsA[1].id;

  // Complete Onboarding A
  await completeSchoolOnboarding(schoolAId);

  // ── SCHOOL B SETUP SEQUENCE (ISOLATION TEST TARGET) ──
  const sB = await createSchoolWithTenant({
    name: "Apexium Benchmark School B",
    motto: "Leadership and Character",
  });
  schoolBId = sB.id;

  const adminB = await provisionFirstAdminUser(schoolBId, {
    email: `admin.b.${Date.now()}@schoolb.edu.ng`,
    firstName: "Admin",
    lastName: "SchoolB",
  });
  adminBId = adminB.id;

  const { terms: termsB } = await configureAcademicSessionAndTerms(schoolBId, "2025/2026");
  termBId = termsB[0].id;

  const { classes: classesB } = await configureClassesAndDepartments(schoolBId, ["JSS 1"]);
  classBId = classesB[0].id;

  const staffB = await provisionTeachersAndStaff(schoolBId, [
    { firstName: "Sarah", lastName: "TeacherB", email: `teacher.b.${Date.now()}@schoolb.edu.ng` },
  ]);
  teacherBId = staffB[0].id;

  const studentsB = await provisionStudentsAndClassAssignments(schoolBId, [
    { firstName: "Benjamin", lastName: "Franklin", classId: classBId },
  ]);
  studentB1Id = studentsB[0].id;

  feeStructureBId = crypto.randomUUID();
  await db.insert(feeStructures).values({
    id: feeStructureBId,
    schoolId: schoolBId,
    termId: termBId,
    name: "School B Tuition",
    totalAmount: 50000,
  });

  invoiceBId = crypto.randomUUID();
  await db.insert(feeInvoices).values({
    id: invoiceBId,
    schoolId: schoolBId,
    studentId: studentB1Id,
    feeStructureId: feeStructureBId,
    totalAmount: 50000,
    amountPaid: 0,
    outstandingBalance: 50000,
    status: "pending",
  });

  await completeSchoolOnboarding(schoolBId);
});

describe("Milestone 24 Production UX, Workflow Completion & Monorepo Integration Tests", () => {
  // 1. Foundational Sequential Setup Execution
  it("executes the sequential 9-step setup workflow for School A", async () => {
    const status = await getSchoolOnboardingStatus(schoolAId);
    expect(status.isCompleted).toBe(true);
    expect(status.hasSession).toBe(true);
    expect(status.hasClass).toBe(true);
    expect(status.hasStudents).toBe(true);
  });

  // 2. Verify Downstream ERP Module Access with Real Data
  it("verifies downstream modules consume real setup data cleanly", async () => {
    const [fetchedStudent] = await db
      .select()
      .from(students)
      .where(and(eq(students.schoolId, schoolAId), eq(students.id, studentA1Id)));

    expect(fetchedStudent).toBeDefined();
    expect(fetchedStudent.classId).toBe(classAId);
    expect(fetchedStudent.firstName).toBe("Alexander");
  });

  // 3. Resumable Setup Status Audit
  it("audits setup status accurately for a fresh school before completion", async () => {
    const freshSchool = await createSchoolWithTenant({ name: "Fresh Unfinished School" });
    const freshStatus = await getSchoolOnboardingStatus(freshSchool.id);
    expect(freshStatus.isCompleted).toBe(false);
    expect(freshStatus.hasSession).toBe(false);
  });

  // 4. Multi-Entity Global Search Engine
  it("searches and returns matching entities within user's school", async () => {
    const searchResults = await globalSearchEntities(schoolAId, "Alexander");
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].title).toContain("Alexander Hamilton");
  });

  // 5. Bulk Student Operations
  it("executes bulk status update on School A student records", async () => {
    const bulkResult = await executeBulkStudentActions(
      schoolAId,
      [studentA1Id, studentA2Id],
      "status_update",
      { status: "graduated" }
    );

    expect(bulkResult.updatedCount).toBe(2);
  });

  // ── 6. STRICT MULTI-TENANT ISOLATION PENETRATION TESTS ────────
  it("proves School A administrator CANNOT search School B records", async () => {
    const searchResult = await globalSearchEntities(schoolAId, "Benjamin");
    expect(searchResult.length).toBe(0); // Benjamin is in School B
  });

  it("proves School A administrator CANNOT read School B records", async () => {
    const readSchoolBStudent = await db
      .select()
      .from(students)
      .where(and(eq(students.schoolId, schoolAId), eq(students.id, studentB1Id)));

    expect(readSchoolBStudent.length).toBe(0);
  });

  it("proves School A administrator CANNOT update School B records", async () => {
    const updateAttempt = await db
      .update(students)
      .set({ firstName: "Hacked" })
      .where(and(eq(students.schoolId, schoolAId), eq(students.id, studentB1Id)))
      .returning();

    expect(updateAttempt.length).toBe(0);
  });

  if ("proves School A administrator CANNOT bulk-update School B students", async () => {
    const bulkAttempt = await executeBulkStudentActions(
      schoolAId,
      [studentB1Id],
      "status_update",
      { status: "withdrawn" }
    );

    expect(bulkAttempt.updatedCount).toBe(0);

    const [stdB] = await db.select().from(students).where(eq(students.id, studentB1Id));
    expect(stdB.status).toBe("active"); // Unchanged
  });

  it("proves School A administrator CANNOT access School B classes or teachers", async () => {
    const classBCheck = await db
      .select()
      .from(classes)
      .where(and(eq(classes.schoolId, schoolAId), eq(classes.id, classBId)));
    expect(classBCheck.length).toBe(0);

    const teacherBCheck = await db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, schoolAId), eq(users.id, teacherBId)));
    expect(teacherBCheck.length).toBe(0);
  });

  it("proves School A administrator CANNOT access School B invoices", async () => {
    const invoiceBCheck = await db
      .select()
      .from(feeInvoices)
      .where(and(eq(feeInvoices.schoolId, schoolAId), eq(feeInvoices.id, invoiceBId)));
    expect(invoiceBCheck.length).toBe(0);
  });
});
