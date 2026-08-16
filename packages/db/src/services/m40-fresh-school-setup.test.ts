import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  schools,
  users,
  classes,
  terms,
  subjects,
  gradingScales,
  schoolSettings,
  saasSchoolMemberships,
  resolveOrProvisionSchoolForAdmin,
  executeCoreSchoolSetup,
} from "../index";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

describe("Milestone 40: Fresh School Setup & Dynamic Tenant Resolution", () => {
  it("proves a brand-new administrator account with NO initial schoolId can execute setup end-to-end", async () => {
    // 1. Create a fresh admin user with NO schoolId (simulating an account created prior to tenant setup)
    const freshUserId = crypto.randomUUID();
    const adminEmail = `fresh-admin-${Date.now()}@example.com`;

    // 2. Resolve/provision school dynamically during wizard execution
    const resolvedSchool = await resolveOrProvisionSchoolForAdmin({
      userId: freshUserId,
      currentSchoolId: null, // No initial school context
      schoolName: "Fresh Hope International School",
      schoolEmail: adminEmail,
      address: "Plot 100 Victoria Island, Lagos",
      phone: "+2348011223344",
      motto: "Knowledge and Integrity",
      adminFirstName: "Adebayo",
      adminLastName: "Ogunlesi",
      adminEmail,
    });

    expect(resolvedSchool).toBeDefined();
    expect(resolvedSchool.id).toBeDefined();
    expect(resolvedSchool.name).toBe("Fresh Hope International School");

    // 3. Verify user is now properly linked to this newly created school
    const [linkedUser] = await db.select().from(users).where(eq(users.id, freshUserId)).limit(1);
    expect(linkedUser).toBeDefined();
    expect(linkedUser.schoolId).toBe(resolvedSchool.id);
    expect(linkedUser.role).toBe("admin");

    // 4. Verify SaaS school membership record is created
    const [membership] = await db
      .select()
      .from(saasSchoolMemberships)
      .where(and(eq(saasSchoolMemberships.userId, freshUserId), eq(saasSchoolMemberships.schoolId, resolvedSchool.id)))
      .limit(1);
    expect(membership).toBeDefined();
    expect(membership.status).toBe("active");

    // 5. Execute Core Setup on this dynamically resolved school
    const setupResult = await executeCoreSchoolSetup({
      schoolId: resolvedSchool.id,
      sessionName: "2025/2026",
      terms: [
        { name: "First Term", start: "2025-09-01", end: "2025-12-15", isCurrent: true },
        { name: "Second Term", start: "2026-01-10", end: "2026-04-10", isCurrent: false },
        { name: "Third Term", start: "2026-04-25", end: "2026-07-25", isCurrent: false },
      ],
      classNames: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
      departmentNames: ["Sciences", "Arts"],
      subjects: [
        { name: "Mathematics", code: "MTH" },
        { name: "English Language", code: "ENG" },
      ],
      gradeBands: [
        { grade: "A1", minScore: 75, maxScore: 100, remark: "Distinction" },
        { grade: "F9", minScore: 0, maxScore: 39.99, remark: "Fail" },
      ],
    });

    expect(setupResult.success).toBe(true);
    expect(setupResult.termsCount).toBe(3);
    expect(setupResult.classesCount).toBe(6);
    expect(setupResult.subjectsCount).toBe(2);
    expect(setupResult.gradingBandsCount).toBe(2);
    expect(setupResult.onboardingStatus).toBe("Completed");

    // 6. Verify records exist in PostgreSQL
    const schoolClasses = await db.select().from(classes).where(eq(classes.schoolId, resolvedSchool.id));
    expect(schoolClasses.length).toBe(6);

    const schoolTerms = await db.select().from(terms).where(eq(terms.schoolId, resolvedSchool.id));
    expect(schoolTerms.length).toBe(3);
  });

  it("proves an existing school admin updating school details preserves tenant continuity", async () => {
    // 1. Initial school creation
    const initialSchool = await resolveOrProvisionSchoolForAdmin({
      schoolName: "Initial School Name",
      address: "Old Address",
    });

    const adminUserId = crypto.randomUUID();
    await db.insert(users).values({
      id: adminUserId,
      schoolId: initialSchool.id,
      email: `admin-update-${Date.now()}@example.com`,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });

    // 2. Admin goes through setup and updates school name and address
    const updatedSchool = await resolveOrProvisionSchoolForAdmin({
      userId: adminUserId,
      currentSchoolId: initialSchool.id,
      schoolName: "Updated Model Academy",
      address: "New Campus Address, Abuja",
    });

    expect(updatedSchool.id).toBe(initialSchool.id);
    expect(updatedSchool.name).toBe("Updated Model Academy");
    expect(updatedSchool.address).toBe("New Campus Address, Abuja");
  });
});
