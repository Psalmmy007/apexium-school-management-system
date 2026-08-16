import {
  db,
  schools,
  users,
  classes,
  students,
  hrDepartments,
  terms,
  schoolSettings,
  subjects,
  gradingScales,
  saasSchoolMemberships,
} from "../index";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { DEFAULT_WAEC_GRADE_BANDS, type GradeBand } from "./grading";

export interface ProvisionSchoolParams {
  name: string;
  slug?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  motto?: string;
}

export interface ResolveSchoolParams {
  userId?: string;
  currentSchoolId?: string | null;
  schoolName?: string;
  schoolEmail?: string;
  address?: string;
  phone?: string;
  motto?: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminEmail?: string;
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

export interface TermInput {
  name: string;
  start: string | Date;
  end: string | Date;
  isCurrent?: boolean;
}

export interface SubjectInput {
  name: string;
  code?: string;
}

export interface CoreSetupParams {
  schoolId: string;
  sessionName?: string;
  terms?: TermInput[];
  classNames?: string[];
  departmentNames?: string[];
  subjects?: SubjectInput[];
  gradeBands?: GradeBand[];
}

export const DEFAULT_SUBJECTS: SubjectInput[] = [
  { name: "Mathematics", code: "MTH" },
  { name: "English Language", code: "ENG" },
  { name: "Basic Science", code: "BSC" },
  { name: "Physics", code: "PHY" },
  { name: "Chemistry", code: "CHM" },
  { name: "Biology", code: "BIO" },
  { name: "Economics", code: "ECO" },
  { name: "Civic Education", code: "CIV" },
];

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

// ── 1b. Resolve or Provision School For Admin ────────────────
export async function resolveOrProvisionSchoolForAdmin(params: ResolveSchoolParams) {
  const { userId, currentSchoolId, schoolName, schoolEmail, address, phone, motto } = params;

  // 1. If valid schoolId is provided, check if school exists
  if (
    currentSchoolId &&
    typeof currentSchoolId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentSchoolId.trim())
  ) {
    const [existingSchool] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, currentSchoolId.trim()))
      .limit(1);

    if (existingSchool) {
      if (schoolName && schoolName.trim() !== "") {
        const [updated] = await db
          .update(schools)
          .set({
            name: schoolName.trim(),
            ...(address && { address: address.trim() }),
            ...(phone && { phone: phone.trim() }),
            ...(schoolEmail && { email: schoolEmail.trim() }),
            updatedAt: new Date(),
          })
          .where(eq(schools.id, existingSchool.id))
          .returning();
        return updated || existingSchool;
      }
      return existingSchool;
    }
  }

  // 2. If user already has an active school membership in database
  if (userId) {
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser?.schoolId) {
      const [userSchool] = await db.select().from(schools).where(eq(schools.id, existingUser.schoolId)).limit(1);
      if (userSchool) {
        if (schoolName && schoolName.trim() !== "") {
          const [updated] = await db
            .update(schools)
            .set({
              name: schoolName.trim(),
              ...(address && { address: address.trim() }),
              ...(phone && { phone: phone.trim() }),
              updatedAt: new Date(),
            })
            .where(eq(schools.id, userSchool.id))
            .returning();
          return updated || userSchool;
        }
        return userSchool;
      }
    }
  }

  // 3. Otherwise, create a brand-new school entity for this administrator
  const effectiveName = schoolName?.trim() || "Apexium Model Academy";
  const newSchool = await createSchoolWithTenant({
    name: effectiveName,
    address: address?.trim() || "Main Campus",
    phone: phone?.trim() || "+2348000000000",
    email: schoolEmail?.trim() || (userId ? `admin-${userId}@apexium.edu` : "admin@apexium.edu"),
    motto: motto?.trim() || "Excellence & Character",
  });

  // 4. Attach user to this school in `users` and `saasSchoolMemberships`
  if (userId) {
    const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser) {
      await db
        .update(users)
        .set({
          schoolId: newSchool.id,
          role: "admin",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      await db
        .insert(users)
        .values({
          id: userId,
          schoolId: newSchool.id,
          email: params.adminEmail || `admin-${userId}@apexium.edu`,
          firstName: params.adminFirstName || "School",
          lastName: params.adminLastName || "Administrator",
          role: "admin",
        })
        .onConflictDoNothing();
    }

    try {
      await db
        .insert(saasSchoolMemberships)
        .values({
          id: crypto.randomUUID(),
          schoolId: newSchool.id,
          userId: userId,
          role: "admin",
          status: "active",
        })
        .onConflictDoNothing();
    } catch {
      // ignore if saas table doesn't exist
    }
  }

  return newSchool;
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
  sessionName: string = "2025/2026",
  customTerms?: TermInput[]
) {
  const termDefs: TermInput[] = customTerms && customTerms.length > 0
    ? customTerms
    : [
        { name: "First Term", start: "2025-09-01", end: "2025-12-15", isCurrent: true },
        { name: "Second Term", start: "2026-01-10", end: "2026-04-10", isCurrent: false },
        { name: "Third Term", start: "2026-04-25", end: "2026-07-25", isCurrent: false },
      ];

  const createdTerms = [];
  for (let i = 0; i < termDefs.length; i++) {
    const t = termDefs[i];
    const [created] = await db
      .insert(terms)
      .values({
        schoolId,
        session: sessionName,
        name: t.name,
        startDate: new Date(t.start),
        endDate: new Date(t.end),
        isCurrent: t.isCurrent !== undefined ? t.isCurrent : i === 0,
        status: "active",
      })
      .returning();
    createdTerms.push(created);
  }

  return { session: { name: sessionName }, terms: createdTerms };
}

// ── 4. Configure Classes and Departments ─────────────────────
export async function configureClassesAndDepartments(
  schoolId: string,
  classNames: string[] = ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
  departmentNames: string[] = ["Sciences", "Arts & Humanities", "Commercial"]
) {
  const createdDepts = [];
  for (const deptName of departmentNames) {
    if (!deptName || !deptName.trim()) continue;
    const [d] = await db
      .insert(hrDepartments)
      .values({
        schoolId,
        departmentName: deptName.trim(),
        code: deptName.trim().substring(0, 3).toUpperCase(),
      })
      .returning();
    createdDepts.push(d);
  }

  const createdClasses = [];
  for (let i = 0; i < classNames.length; i++) {
    const className = classNames[i];
    if (!className || !className.trim()) continue;
    const [c] = await db
      .insert(classes)
      .values({
        schoolId,
        name: className.trim(),
        code: className.trim().replace(/\s+/g, "").toUpperCase(),
        capacity: 40,
        displayOrder: i + 1,
        status: "active",
      })
      .returning();
    createdClasses.push(c);
  }

  return { classes: createdClasses, departments: createdDepts };
}

// ── 5. Configure Subjects ────────────────────────────────────
export async function configureSubjects(
  schoolId: string,
  subjectsList: SubjectInput[] = DEFAULT_SUBJECTS
) {
  const createdSubjects = [];
  for (const s of subjectsList) {
    if (!s.name || !s.name.trim()) continue;
    const [sub] = await db
      .insert(subjects)
      .values({
        schoolId,
        name: s.name.trim(),
        code: s.code?.trim() || s.name.trim().substring(0, 3).toUpperCase(),
      })
      .returning();
    createdSubjects.push(sub);
  }
  return createdSubjects;
}

// ── 6. Configure Grading Scale ───────────────────────────────
export async function configureGradingScale(
  schoolId: string,
  gradeBands: GradeBand[] = DEFAULT_WAEC_GRADE_BANDS
) {
  const createdBands = [];
  for (let i = 0; i < gradeBands.length; i++) {
    const band = gradeBands[i];
    const [created] = await db
      .insert(gradingScales)
      .values({
        schoolId,
        name: "WAEC Grade Scale",
        grade: band.grade,
        minScore: band.minScore,
        maxScore: band.maxScore,
        remark: band.remark,
        sortOrder: i + 1,
      })
      .returning();
    createdBands.push(created);
  }
  return createdBands;
}

// ── 7. Master Core Setup Execution ───────────────────────────
export async function executeCoreSchoolSetup(params: CoreSetupParams) {
  const { schoolId } = params;

  // 1. Session & Terms
  const sessionResult = await configureAcademicSessionAndTerms(
    schoolId,
    params.sessionName || "2025/2026",
    params.terms
  );

  // 2. Classes & Departments
  const classNames = params.classNames && params.classNames.length > 0
    ? params.classNames
    : ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];
  const departmentNames = params.departmentNames && params.departmentNames.length > 0
    ? params.departmentNames
    : ["Sciences", "Arts & Humanities", "Commercial"];

  const classResult = await configureClassesAndDepartments(
    schoolId,
    classNames,
    departmentNames
  );

  // 3. Subjects
  const subjectsResult = await configureSubjects(
    schoolId,
    params.subjects && params.subjects.length > 0 ? params.subjects : DEFAULT_SUBJECTS
  );

  // 4. Grading Scales
  const gradingResult = await configureGradingScale(
    schoolId,
    params.gradeBands && params.gradeBands.length > 0 ? params.gradeBands : DEFAULT_WAEC_GRADE_BANDS
  );

  // 5. Complete Onboarding & Activate Modules
  await completeSetupWizardOnboarding(schoolId);

  return {
    success: true,
    session: sessionResult.session,
    termsCount: sessionResult.terms.length,
    classesCount: classResult.classes.length,
    departmentsCount: classResult.departments.length,
    subjectsCount: subjectsResult.length,
    gradingBandsCount: gradingResult.length,
    onboardingStatus: "Completed",
  };
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
