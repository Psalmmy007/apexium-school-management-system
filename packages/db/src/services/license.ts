import { db, licenses, licenseEvents, students } from "../index.js";
import { eq, count } from "drizzle-orm";
import crypto from "crypto";

export interface CreateLicenseInput {
  schoolId: string;
  tier: "starter" | "growth" | "enterprise";
  enabledModules?: string[];
  maxStudents?: number;
  validityDays?: number;
}

export interface LicenseValidationResult {
  valid: boolean;
  reason?: string;
  license?: typeof licenses.$inferSelect;
  currentStudentCount: number;
  maxStudents: number;
}

/**
 * Default student seat caps per license tier:
 * Starter: 250 students
 * Growth: 1000 students
 * Enterprise: 10,000 students
 */
export const TIER_STUDENT_CAPS: Record<string, number> = {
  starter: 250,
  growth: 1000,
  enterprise: 10000,
};

/**
 * Default enabled modules per license tier:
 */
export const TIER_MODULES: Record<string, string[]> = {
  starter: ["core_erp"],
  growth: ["core_erp", "cbt", "lms"],
  enterprise: ["core_erp", "cbt", "lms", "teacher_portal", "parent_portal"],
};

/**
 * Generates a unique secure license key
 */
export function generateLicenseKey(prefix = "APX"): string {
  const random = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}-${random.slice(12, 16)}`;
}

/**
 * Issue a new license for a school and log the event.
 */
export async function issueSchoolLicense(input: CreateLicenseInput) {
  const tier = input.tier || "starter";
  const maxStudents = input.maxStudents ?? TIER_STUDENT_CAPS[tier] ?? 250;
  const enabledModules = input.enabledModules ?? TIER_MODULES[tier] ?? ["core_erp"];
  const validityDays = input.validityDays ?? 365;

  const key = generateLicenseKey();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + validityDays * 86400 * 1000);

  const [lic] = await db
    .insert(licenses)
    .values({
      schoolId: input.schoolId,
      key,
      tier,
      enabledModules,
      maxStudents,
      status: "active",
      issuedAt,
      expiresAt,
    })
    .returning();

  // Log issuance event
  await db.insert(licenseEvents).values({
    schoolId: input.schoolId,
    licenseId: lic.id,
    eventType: "issued",
    details: { tier, maxStudents, enabledModules, key },
  });

  return lic;
}

/**
 * Validates a school's license, checking status, expiry date, and seat/student cap.
 */
export async function validateSchoolLicense(schoolId: string): Promise<LicenseValidationResult> {
  const [activeLic] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.schoolId, schoolId));

  const [stuCountRes] = await db
    .select({ total: count() })
    .from(students)
    .where(eq(students.schoolId, schoolId));

  const currentStudentCount = Number(stuCountRes?.total || 0);

  if (!activeLic) {
    // Default trial license if none explicitly provisioned
    return {
      valid: true,
      currentStudentCount,
      maxStudents: 250,
    };
  }

  const now = new Date();
  if (activeLic.expiresAt && activeLic.expiresAt < now) {
    return {
      valid: false,
      reason: `License expired on ${activeLic.expiresAt.toISOString().slice(0, 10)}. Please renew your license.`,
      license: activeLic,
      currentStudentCount,
      maxStudents: activeLic.maxStudents,
    };
  }

  if (activeLic.status !== "active") {
    return {
      valid: false,
      reason: `License is currently ${activeLic.status}.`,
      license: activeLic,
      currentStudentCount,
      maxStudents: activeLic.maxStudents,
    };
  }

  return {
    valid: true,
    license: activeLic,
    currentStudentCount,
    maxStudents: activeLic.maxStudents,
  };
}

/**
 * Enforces student seat limit before creating a new student.
 * Throws a human-readable error if creating the student would exceed the cap.
 */
export async function enforceStudentCap(schoolId: string): Promise<void> {
  const check = await validateSchoolLicense(schoolId);
  if (!check.valid) {
    throw new Error(check.reason || "License validation failed");
  }

  if (check.currentStudentCount >= check.maxStudents) {
    throw new Error(
      `Student limit reached: Your ${check.license?.tier || "current"} license cap is ${check.maxStudents} students (Currently enrolled: ${check.currentStudentCount}). Upgrade your plan to add more students.`
    );
  }
}

/**
 * Checks if a specific module (e.g. "cbt", "lms") is enabled under the school's license.
 */
export async function isModuleEnabled(schoolId: string, moduleName: string): Promise<boolean> {
  const check = await validateSchoolLicense(schoolId);
  if (!check.valid || !check.license) return false;

  const modules = (check.license.enabledModules as string[]) || [];
  return modules.includes(moduleName);
}

/**
 * Upgrade or downgrade a school's license tier and update seat cap & enabled modules immediately.
 */
export async function upgradeSchoolLicense(
  schoolId: string,
  newTier: "starter" | "growth" | "enterprise",
  performedByUserId?: string
) {
  const [existingLic] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.schoolId, schoolId));

  const newMaxStudents = TIER_STUDENT_CAPS[newTier] || 250;
  const newEnabledModules = TIER_MODULES[newTier] || ["core_erp"];

  if (!existingLic) {
    return issueSchoolLicense({
      schoolId,
      tier: newTier,
      maxStudents: newMaxStudents,
      enabledModules: newEnabledModules,
    });
  }

  const isUpgrade = newMaxStudents >= existingLic.maxStudents;
  const eventType = isUpgrade ? "upgraded" : "downgraded";

  const [updatedLic] = await db
    .update(licenses)
    .set({
      tier: newTier,
      maxStudents: newMaxStudents,
      enabledModules: newEnabledModules,
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, existingLic.id))
    .returning();

  await db.insert(licenseEvents).values({
    schoolId,
    licenseId: existingLic.id,
    eventType,
    details: {
      oldTier: existingLic.tier,
      newTier,
      oldMaxStudents: existingLic.maxStudents,
      newMaxStudents,
    },
    performedBy: performedByUserId || null,
  });

  return updatedLic;
}
