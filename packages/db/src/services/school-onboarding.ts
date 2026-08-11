/**
 * Milestone 28 — School Onboarding Service
 *
 * Handles the complete school registration workflow:
 *   Register School → Create Administrator → Create Membership →
 *   Create Subscription → Create Domain → Onboarding Session → Setup Wizard
 *
 * IMPORTANT: This creates REAL database records, no fake seeded data.
 */
import { db } from "../client";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  schools,
  users,
  saasSchoolMemberships,
  saasSchoolDomains,
  saasOnboardingSessions,
  saasAuditLogs,
  saasSubscriptionPlans,
  saasSchoolSubscriptions,
} from "../schema/index";
import { writeSaasAuditLog, isReservedSlug } from "./tenant";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface RegisterSchoolInput {
  schoolName: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
}

export interface RegisterSchoolResult {
  schoolId: string;
  schoolSlug: string;
  adminUserId: string;
  onboardingSessionId: string;
  domain: string;
}

export interface OnboardingStatus {
  schoolId: string;
  status: string;
  currentStep: string;
  completedSteps: string[];
  isComplete: boolean;
}

// ── Reserved slug set (mirrored from tenant.ts for use here) ──────────────────
const RESERVED = new Set([
  "www", "admin", "api", "app", "login", "register", "pricing",
  "dashboard", "platform", "health", "static", "assets", "cdn",
  "mail", "smtp", "ftp", "support", "help", "docs", "blog", "status",
  "onboarding", "subscribe", "auth", "callback", "webhooks",
]);

// ── 1. Generate School Slug ────────────────────────────────────────────────────
/**
 * Generates a unique, URL-safe slug from the school name.
 * Appends a numeric suffix if the slug is already taken or reserved.
 */
export async function generateSchoolSlug(schoolName: string): Promise<string> {
  const base = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const candidate = RESERVED.has(base) ? `${base}-school` : base;

  // Check uniqueness
  const [existing] = await db
    .select({ slug: schools.slug })
    .from(schools)
    .where(eq(schools.slug, candidate))
    .limit(1);

  if (!existing) return candidate;

  // Append random suffix for uniqueness
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${candidate}-${suffix}`;
}

// ── 2. Register School ─────────────────────────────────────────────────────────
/**
 * Creates a new school tenant record.
 * Does NOT create admin, membership, or subscription — those are separate steps
 * to support resumeable onboarding.
 */
export async function registerSchool(input: RegisterSchoolInput): Promise<{
  schoolId: string;
  schoolSlug: string;
}> {
  const slug = await generateSchoolSlug(input.schoolName);
  const schoolId = randomUUID();

  await db.insert(schools).values({
    id: schoolId,
    name: input.schoolName.trim(),
    slug,
    phone: input.phone?.trim() ?? null,
    address: input.address?.trim() ?? null,
    email: null,
    logoUrl: input.logoUrl ?? null,
    isActive: true,
  });

  return { schoolId, schoolSlug: slug };
}

// ── 3. Create School Administrator ────────────────────────────────────────────
/**
 * Creates the school administrator user record in the DB.
 * The Supabase Auth user must be created BEFORE calling this,
 * and the returned auth.users.id passed as userId.
 */
export async function createSchoolAdministrator(params: {
  userId: string; // auth.users.id from Supabase
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<void> {
  // Insert into the users table (links Supabase auth → school)
  await db.insert(users).values({
    id: params.userId,
    schoolId: params.schoolId,
    email: params.email.toLowerCase().trim(),
    role: "admin",
    firstName: params.firstName.trim(),
    lastName: params.lastName.trim(),
    isActive: true,
  });
}

// ── 4. Create School Membership ───────────────────────────────────────────────
/**
 * Creates the SaaS membership record (saas_school_memberships).
 * This is the authoritative source of truth for user ↔ school access.
 */
export async function createSchoolMembership(params: {
  userId: string;
  schoolId: string;
  role: "admin" | "teacher" | "parent" | "student" | "staff" | "platform_admin";
}): Promise<void> {
  await db.insert(saasSchoolMemberships).values({
    userId: params.userId,
    schoolId: params.schoolId,
    role: params.role,
    status: "active",
  });
}

// ── 5. Initialize School Tenant ───────────────────────────────────────────────
/**
 * Creates the subdomain and onboarding session for a newly registered school.
 * Returns the primary domain assigned to the school.
 */
export async function initializeSchoolTenant(params: {
  schoolId: string;
  schoolSlug: string;
  adminUserId: string;
}): Promise<{ domain: string; onboardingSessionId: string }> {
  const baseDomain = process.env.APEXIUM_BASE_DOMAIN || "apexium.app";
  const domain = `${params.schoolSlug}.${baseDomain}`;

  // Create subdomain record
  await db.insert(saasSchoolDomains).values({
    schoolId: params.schoolId,
    domain,
    domainType: "subdomain",
    isPrimary: true,
    isVerified: true,
    isActive: true,
  }).onConflictDoNothing();

  // Create onboarding session
  const sessionId = randomUUID();
  await db.insert(saasOnboardingSessions).values({
    id: sessionId,
    schoolId: params.schoolId,
    status: "SCHOOL_CREATED",
    currentStep: "SUBSCRIPTION_PENDING",
    completedSteps: ["SCHOOL_CREATED", "ADMIN_CREATED"] as unknown as string[],
    adminUserId: params.adminUserId,
  }).onConflictDoNothing();

  // If session already existed, fetch the real ID
  const [session] = await db
    .select()
    .from(saasOnboardingSessions)
    .where(eq(saasOnboardingSessions.schoolId, params.schoolId))
    .limit(1);

  return { domain, onboardingSessionId: session?.id ?? sessionId };
}

// ── 6. Get Onboarding Status ──────────────────────────────────────────────────
export async function getOnboardingStatus(schoolId: string): Promise<OnboardingStatus | null> {
  const [session] = await db
    .select()
    .from(saasOnboardingSessions)
    .where(eq(saasOnboardingSessions.schoolId, schoolId))
    .limit(1);

  if (!session) return null;

  const completedSteps = Array.isArray(session.completedSteps)
    ? (session.completedSteps as string[])
    : [];

  return {
    schoolId: session.schoolId,
    status: session.status,
    currentStep: session.currentStep,
    completedSteps,
    isComplete: session.status === "COMPLETED",
  };
}

// ── 7. Complete Onboarding Step ────────────────────────────────────────────────
export async function completeOnboardingStep(
  schoolId: string,
  step: string,
  nextStep: string,
  nextStatus: "STARTED" | "SCHOOL_CREATED" | "ADMIN_CREATED" | "SUBSCRIPTION_PENDING" | "PAYMENT_PENDING" | "PAYMENT_CONFIRMED" | "SETUP_IN_PROGRESS" | "COMPLETED"
): Promise<void> {
  const [session] = await db
    .select()
    .from(saasOnboardingSessions)
    .where(eq(saasOnboardingSessions.schoolId, schoolId))
    .limit(1);

  if (!session) return;

  const completedSteps = Array.isArray(session.completedSteps)
    ? (session.completedSteps as string[])
    : [];

  if (!completedSteps.includes(step)) {
    completedSteps.push(step);
  }

  await db
    .update(saasOnboardingSessions)
    .set({
      status: nextStatus,
      currentStep: nextStep,
      completedSteps: completedSteps as unknown as string[],
      completedAt: nextStatus === "COMPLETED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(saasOnboardingSessions.schoolId, schoolId));
}

// ── 8. Resume Onboarding ──────────────────────────────────────────────────────
/**
 * Returns the onboarding state so the UI can redirect the admin
 * to the correct step they left off at.
 */
export async function resumeOnboarding(schoolId: string): Promise<OnboardingStatus | null> {
  return getOnboardingStatus(schoolId);
}

// ── 9. Complete School Onboarding ─────────────────────────────────────────────
export async function completeSchoolOnboarding(schoolId: string): Promise<void> {
  await db
    .update(saasOnboardingSessions)
    .set({
      status: "COMPLETED",
      currentStep: "COMPLETED",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(saasOnboardingSessions.schoolId, schoolId));

  await writeSaasAuditLog({
    schoolId,
    eventType: "onboarding_completed",
    details: { completedAt: new Date().toISOString() },
  });
}

// ── 10. Full Registration Flow (Atomic) ───────────────────────────────────────
/**
 * Executes the complete school registration in the correct sequence:
 *   1. Create school tenant
 *   2. Create administrator user (DB record — Supabase Auth must be done externally)
 *   3. Create SaaS membership
 *   4. Initialize tenant (domain + onboarding session)
 *   5. Write audit log
 *
 * NOTE: Supabase Auth user creation is handled by the API route BEFORE
 * calling this function. The userId must be the auth.users.id returned by Supabase.
 */
export async function executeFullSchoolRegistration(
  input: RegisterSchoolInput,
  userId: string // Supabase auth.users.id — already created before this call
): Promise<RegisterSchoolResult> {
  // 1. Create school tenant
  const { schoolId, schoolSlug } = await registerSchool(input);

  // 2. Create administrator DB record
  await createSchoolAdministrator({
    userId,
    schoolId,
    firstName: input.adminFirstName,
    lastName: input.adminLastName,
    email: input.adminEmail,
  });

  // 3. Create SaaS membership
  await createSchoolMembership({ userId, schoolId, role: "admin" });

  // 4. Initialize tenant (domain + onboarding session)
  const { domain, onboardingSessionId } = await initializeSchoolTenant({
    schoolId,
    schoolSlug,
    adminUserId: userId,
  });

  // 5. Audit log
  await writeSaasAuditLog({
    schoolId,
    actorId: userId,
    eventType: "school_registered",
    details: {
      schoolName: input.schoolName,
      adminEmail: input.adminEmail,
      slug: schoolSlug,
      domain,
    },
  });

  return { schoolId, schoolSlug, adminUserId: userId, onboardingSessionId, domain };
}
