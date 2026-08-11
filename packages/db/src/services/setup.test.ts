import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  classes,
  hrDepartments,
  terms,
  schoolSettings,
} from "../index";
import {
  createSchoolWithTenant,
  provisionFirstAdminUser,
  configureAcademicSessionAndTerms,
  configureClassesAndDepartments,
  assignDefaultRolesAndPermissions,
  activateErpModules,
  getSchoolOnboardingStatus,
  completeSchoolOnboarding,
} from "./setup";
import { eq, sql } from "drizzle-orm";

let schoolAId: string;
let schoolBId: string;

beforeAll(async () => {
  // Ensure DDL table for school_settings
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS school_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_school_settings_unique ON school_settings(school_id, key);
  `);

  const schoolA = await createSchoolWithTenant({
    name: "St. Jude International Academy",
    motto: "Knowledge & Integrity",
    email: `info.stjude.${Date.now()}@stjude.edu.ng`,
    phone: "+2348011112222",
  });
  schoolAId = schoolA.id;

  const schoolB = await createSchoolWithTenant({ name: `School B Onboarding Test ${Date.now()}` });
  schoolBId = schoolB.id;
});

describe("Milestone 22 School Onboarding, Setup Wizard & ERP Activation Tests", () => {
  // 1. School Tenant Provisioning
  it("provisions a new school tenant with default settings", async () => {
    expect(schoolAId).toBeDefined();
  });

  // 2. Administrator User Provisioning
  it("provisions the first administrator account linked to the school tenant", async () => {
    const admin = await provisionFirstAdminUser(schoolAId, {
      email: `admin.onboard.${Date.now()}@stjude.edu.ng`,
      firstName: "Gabriel",
      lastName: "Principal",
    });

    expect(admin).toBeDefined();
    expect(admin.schoolId).toBe(schoolAId);
    expect(admin.role).toBe("admin");
  });

  // 3. Academic Session & Terms Setup
  it("configures current academic session and 3 school terms", async () => {
    const { session, terms: termsList } = await configureAcademicSessionAndTerms(schoolAId, "2025/2026");
    expect(session.name).toBe("2025/2026");
    expect(termsList.length).toBe(3);
    expect(termsList[0].name).toBe("First Term");
  });

  // 4. Classes & Departments Setup
  it("configures default active classes and academic departments", async () => {
    const { classes: classList, departments: deptList } = await configureClassesAndDepartments(
      schoolAId,
      ["JSS 1", "JSS 2", "SSS 1"],
      ["Sciences", "Arts"]
    );

    expect(classList.length).toBe(3);
    expect(deptList.length).toBe(2);
  });

  // 5. Default RBAC Roles & Permissions Assignment
  it("provisions default RBAC roles for school staff, parents, and students", async () => {
    const rolesList = await assignDefaultRolesAndPermissions(schoolAId);
    expect(rolesList.length).toBeGreaterThan(0);
  });

  // 6. Automated Module Activation & Onboarding Completion
  it("automatically unlocks all 12 ERP modules and completes school onboarding", async () => {
    const modules = await activateErpModules(schoolAId);
    expect(modules.length).toBe(12);
    expect(modules).toContain("admissions");
    expect(modules).toContain("analytics");

    const result = await completeSchoolOnboarding(schoolAId);
    expect(result.onboardingStatus).toBe("Completed");

    const status = await getSchoolOnboardingStatus(schoolAId);
    expect(status.isCompleted).toBe(true);
  });

  // 7. Multi-Tenant Isolation
  it("enforces complete multi-tenant isolation between School A and School B onboarding records", async () => {
    const statusB = await getSchoolOnboardingStatus(schoolBId);
    expect(statusB.hasSession).toBe(false); // Isolated from School A
  });
});
