import {
  db,
  schools,
  users,
  classes,
  students,
  hrDepartments,
  terms,
  schoolSettings,
} from "../index";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export interface ProvisionSchoolParams {
  name: string;
  slug?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  motto?: string;
}

export interface AdminUserParams {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface StaffData {
  email: string;
  firstName: string;
  lastName: string;
  departmentId?: string;
}

export interface StudentData {
  firstName: string;
  lastName: string;
  admissionNumber?: string;
  classId?: string;
}

// ── 1. Create School & Provision Tenant Settings ─────────────
export async function createSchoolWithTenant(params: ProvisionSchoolParams) {
  const slug = params.slug || params.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();

  const [school] = await db
    .insert(schools)
    .values({
      name: params.name,
      slug,
      email: params.email || `info@${slug}.edu.ng`,
      phone: params.phone || "+2348000000000",
      address: params.address || "Main Campus",
    })
    .returning();

  // Create Default School Settings
  await db
    .insert(schoolSettings)
    .values({
      schoolId: school.id,
      key: "onboarding_status",
      value: "In_Progress",
    })
    .onConflictDoNothing();

  await db
    .insert(schoolSettings)
    .values({
      schoolId: school.id,
      key: "activated_modules",
      value: JSON.stringify([
        "admissions",
        "students",
        "teachers",
        "finance",
        "hostel",
        "library",
        "transport",
        "hr",
        "cbt",
        "lms",
        "communication",
        "analytics",
      ]),
    })
    .onConflictDoNothing();

  return school;
}

// ── 2. Provision Administrator User ──────────────────────────
export async function provisionFirstAdminUser(schoolId: string, params: AdminUserParams) {
  const [adminUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      role: "admin",
      isActive: true,
    })
    .returning();

  return adminUser;
}

// ── 3. Configure Academic Session and Terms ──────────────────
export async function configureAcademicSessionAndTerms(
  schoolId: string,
  sessionName: string = "2025/2026"
) {
  const termNames = [
    { name: "First Term", start: "2025-09-01", end: "2025-12-15", isCurrent: true },
    { name: "Second Term", start: "2026-01-10", end: "2026-04-10", isCurrent: false },
    { name: "Third Term", start: "2026-04-25", end: "2026-07-25", isCurrent: false },
  ];

  const createdTerms = [];
  for (const t of termNames) {
    const [created] = await db
      .insert(terms)
      .values({
        schoolId,
        session: sessionName,
        name: t.name,
        startDate: new Date(t.start),
        endDate: new Date(t.end),
        isCurrent: t.isCurrent,
        status: "active",
      })
      .returning();
    createdTerms.push(created);
  }

  return { session: { name: sessionName }, terms: createdTerms };
}

// ── 4. Configure Default Classes and Departments ─────────────
export async function configureClassesAndDepartments(
  schoolId: string,
  classNames: string[] = ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
  departmentNames: string[] = ["Sciences", "Arts & Humanities", "Commercial"]
) {
  const createdDepts = [];
  for (const deptName of departmentNames) {
    const [d] = await db
      .insert(hrDepartments)
      .values({
        schoolId,
        departmentName: deptName,
        code: deptName.substring(0, 3).toUpperCase(),
      })
      .returning();
    createdDepts.push(d);
  }

  const createdClasses = [];
  for (let i = 0; i < classNames.length; i++) {
    const className = classNames[i];
    const [c] = await db
      .insert(classes)
      .values({
        schoolId,
        name: className,
        code: className.replace(/\s+/g, "").toUpperCase(),
        capacity: 40,
        displayOrder: i + 1,
        status: "active",
      })
      .returning();
    createdClasses.push(c);
  }

  return { classes: createdClasses, departments: createdDepts };
}

// ── 5. Provision Teachers & Staff ────────────────────────────
export async function provisionTeachersAndStaff(schoolId: string, staffList: StaffData[]) {
  const createdStaff = [];
  for (const s of staffList) {
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        role: "teacher",
        isActive: true,
      })
      .returning();
    createdStaff.push(user);
  }
  return createdStaff;
}

// ── 6. Provision Students & Assign to Classes ────────────────
export async function provisionStudentsAndClassAssignments(schoolId: string, studentList: StudentData[]) {
  const createdStudents = [];
  for (let i = 0; i < studentList.length; i++) {
    const st = studentList[i];
    const admNum = st.admissionNumber || `ADM-${Date.now()}-${i + 1}`;

    const [std] = await db
      .insert(students)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        admissionNumber: admNum,
        firstName: st.firstName,
        lastName: st.lastName,
        classId: st.classId,
        status: "active",
      })
      .returning();
    createdStudents.push(std);
  }
  return createdStudents;
}

// ── 7. Assign Default RBAC Roles ─────────────────────────────
export async function assignDefaultRolesAndPermissions(schoolId: string) {
  return [
    { name: "Administrator" },
    { name: "Teacher" },
    { name: "Accountant" },
    { name: "Parent" },
    { name: "Student" },
  ];
}

// ── 8. Automatically Activate All 12 ERP Modules ────────────
export async function activateErpModules(schoolId: string) {
  const modulesList = [
    "admissions",
    "students",
    "teachers",
    "finance",
    "hostel",
    "library",
    "transport",
    "hr",
    "cbt",
    "lms",
    "communication",
    "analytics",
  ];

  await db
    .insert(schoolSettings)
    .values({
      schoolId,
      key: "activated_modules",
      value: JSON.stringify(modulesList),
    })
    .onConflictDoUpdate({
      target: [schoolSettings.schoolId, schoolSettings.key],
      set: { value: JSON.stringify(modulesList) },
    });

  return modulesList;
}

// ── 9. Get & Complete School Onboarding Wizard Status ────────
export async function getSchoolOnboardingStatus(schoolId: string) {
  const [statusSetting] = await db
    .select()
    .from(schoolSettings)
    .where(and(eq(schoolSettings.schoolId, schoolId), eq(schoolSettings.key, "onboarding_status")));

  const [termCount] = await db.select().from(terms).where(eq(terms.schoolId, schoolId));
  const [classCount] = await db.select().from(classes).where(eq(classes.schoolId, schoolId));
  const [studentCount] = await db.select().from(students).where(eq(students.schoolId, schoolId));

  const isCompleted = statusSetting?.value === "Completed" || (!!termCount && !!classCount);

  return {
    status: isCompleted ? "Completed" : statusSetting?.value || "In_Progress",
    isCompleted,
    hasSession: !!termCount,
    hasClass: !!classCount,
    hasStudents: !!studentCount,
  };
}

export async function completeSetupWizardOnboarding(schoolId: string) {
  await db
    .insert(schoolSettings)
    .values({
      schoolId,
      key: "onboarding_status",
      value: "Completed",
    })
    .onConflictDoUpdate({
      target: [schoolSettings.schoolId, schoolSettings.key],
      set: { value: "Completed" },
    });

  await activateErpModules(schoolId);

  return { success: true, onboardingStatus: "Completed" };
}
