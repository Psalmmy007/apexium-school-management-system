/**
 * Milestone 28 — Tenant Resolution Service
 *
 * Central authority for mapping hostnames, slugs, and user IDs to school tenants.
 * The client NEVER determines the tenant. This service is server-side only.
 *
 * Tenant resolution priority:
 *   1. Hostname subdomain  (schoola.apexium.example → School A)
 *   2. School slug         (explicit lookup, e.g. registration flow)
 *   3. User membership     (authenticated user → their verified school membership)
 *
 * Cross-tenant access is NEVER allowed unless explicitly authorized.
 */
import { db } from "../client";
import { eq, and } from "drizzle-orm";
import {
  schools,
  saasSchoolDomains,
  saasSchoolMemberships,
  saasOnboardingSessions,
  saasAuditLogs,
  saasSchoolSubscriptions,
} from "../schema/index";

// ── Constants ─────────────────────────────────────────────────────────────────
// Reserved slugs that cannot be used as school identifiers
const RESERVED_SLUGS = new Set([
  "www", "admin", "api", "app", "login", "register", "pricing",
  "dashboard", "platform", "health", "static", "assets", "cdn",
  "mail", "smtp", "ftp", "support", "help", "docs", "blog", "status",
  "onboarding", "subscribe", "auth", "callback", "webhooks",
]);

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TenantContext {
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  isActive: boolean;
  domain: string | null;
}

export interface TenantMembership {
  userId: string;
  schoolId: string;
  role: string;
  status: string;
}

export interface TenantStatus {
  schoolId: string;
  isActive: boolean;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
}

// ── 1. Resolve Tenant from Hostname ────────────────────────────────────────────
/**
 * Maps a hostname to a school tenant by looking up the domain table.
 * This is the primary resolution method in the middleware.
 *
 * Example: schoola.apexium.example → { schoolId: "...", schoolName: "School A" }
 */
export async function resolveTenantFromHostname(
  hostname: string
): Promise<TenantContext | null> {
  if (!hostname) return null;

  // Strip port if present
  const host = hostname.split(":")[0].toLowerCase();

  // Check if it matches the base domain pattern
  const baseDomain = (process.env.APEXIUM_BASE_DOMAIN || "").toLowerCase();

  let slug: string | null = null;

  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    // Extract slug from subdomain: schoola.apexium.example → "schoola"
    slug = host.slice(0, host.length - baseDomain.length - 1);
  }

  // Also try a direct domain lookup (for custom domains and testing)
  try {
    const [domainRecord] = await db
      .select({
        schoolId: saasSchoolDomains.schoolId,
        domain: saasSchoolDomains.domain,
      })
      .from(saasSchoolDomains)
      .where(
        and(
          eq(saasSchoolDomains.domain, host),
          eq(saasSchoolDomains.isActive, true)
        )
      )
      .limit(1);

    if (domainRecord) {
      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, domainRecord.schoolId))
        .limit(1);

      if (school) {
        return {
          schoolId: school.id,
          schoolName: school.name,
          schoolSlug: school.slug,
          isActive: school.isActive,
          domain: host,
        };
      }
    }
  } catch {
    // Fall through to slug-based lookup
  }

  // Try slug-based lookup if we extracted a slug
  if (slug && !RESERVED_SLUGS.has(slug)) {
    return resolveTenantFromSchoolSlug(slug);
  }

  return null;
}

// ── 2. Resolve Tenant from School Slug ────────────────────────────────────────
/**
 * Maps a school slug to a tenant context.
 * Used during registration, login with school identifier, and subdomain routing.
 */
export async function resolveTenantFromSchoolSlug(
  slug: string
): Promise<TenantContext | null> {
  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) return null;

  try {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.slug, slug.toLowerCase()))
      .limit(1);

    if (!school) return null;

    // Get the primary domain for this school
    const [domainRecord] = await db
      .select()
      .from(saasSchoolDomains)
      .where(
        and(
          eq(saasSchoolDomains.schoolId, school.id),
          eq(saasSchoolDomains.isPrimary, true),
          eq(saasSchoolDomains.isActive, true)
        )
      )
      .limit(1);

    return {
      schoolId: school.id,
      schoolName: school.name,
      schoolSlug: school.slug,
      isActive: school.isActive,
      domain: domainRecord?.domain ?? null,
    };
  } catch {
    return null;
  }
}

// ── 3. Get Authenticated Tenant ───────────────────────────────────────────────
/**
 * Resolves the tenant context for an authenticated user via their membership.
 * This is the only way a user's tenant is determined after login.
 * The userId comes from the verified session — never from the client.
 */
export async function getAuthenticatedTenant(
  userId: string
): Promise<TenantContext | null> {
  if (!userId) return null;

  try {
    const [membership] = await db
      .select({
        schoolId: saasSchoolMemberships.schoolId,
        membershipStatus: saasSchoolMemberships.status,
      })
      .from(saasSchoolMemberships)
      .where(
        and(
          eq(saasSchoolMemberships.userId, userId),
          eq(saasSchoolMemberships.status, "active")
        )
      )
      .limit(1);

    if (!membership) return null;

    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, membership.schoolId))
      .limit(1);

    if (!school) return null;

    const [domainRecord] = await db
      .select()
      .from(saasSchoolDomains)
      .where(
        and(
          eq(saasSchoolDomains.schoolId, school.id),
          eq(saasSchoolDomains.isPrimary, true),
          eq(saasSchoolDomains.isActive, true)
        )
      )
      .limit(1);

    return {
      schoolId: school.id,
      schoolName: school.name,
      schoolSlug: school.slug,
      isActive: school.isActive,
      domain: domainRecord?.domain ?? null,
    };
  } catch {
    return null;
  }
}

// ── 4. Assert Tenant Membership ───────────────────────────────────────────────
/**
 * Verifies that userId has an active membership in schoolId.
 * Throws if membership is not found or is inactive.
 * Call this before ANY cross-school data operation.
 */
export async function assertTenantMembership(
  userId: string,
  schoolId: string
): Promise<TenantMembership> {
  const [membership] = await db
    .select()
    .from(saasSchoolMemberships)
    .where(
      and(
        eq(saasSchoolMemberships.userId, userId),
        eq(saasSchoolMemberships.schoolId, schoolId),
        eq(saasSchoolMemberships.status, "active")
      )
    )
    .limit(1);

  if (!membership) {
    // Log the cross-tenant attempt
    await writeSaasAuditLog({
      schoolId,
      actorId: userId,
      eventType: "cross_tenant_attempt",
      details: {
        attemptedSchoolId: schoolId,
        userId,
        reason: "no_active_membership",
      },
    }).catch(() => {});

    throw new Error(`User ${userId} does not have an active membership in school ${schoolId}`);
  }

  return {
    userId: membership.userId,
    schoolId: membership.schoolId,
    role: membership.role,
    status: membership.status,
  };
}

// ── 5. Assert Tenant Access ───────────────────────────────────────────────────
/**
 * Verifies both membership AND that the school is active.
 * Use this for ERP module access checks.
 */
export async function assertTenantAccess(
  userId: string,
  schoolId: string
): Promise<{ membership: TenantMembership; tenant: TenantContext }> {
  const membership = await assertTenantMembership(userId, schoolId);

  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  if (!school || !school.isActive) {
    throw new Error(`School ${schoolId} is not active`);
  }

  return {
    membership,
    tenant: {
      schoolId: school.id,
      schoolName: school.name,
      schoolSlug: school.slug,
      isActive: school.isActive,
      domain: null,
    },
  };
}

// ── 6. Get Tenant Status ──────────────────────────────────────────────────────
/**
 * Returns the current operational status of a school tenant including
 * subscription state. Used by subscription enforcement middleware.
 */
export async function getTenantStatus(schoolId: string): Promise<TenantStatus | null> {
  try {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!school) return null;

    // Get the most recent subscription
    const [subscription] = await db
      .select()
      .from(saasSchoolSubscriptions)
      .where(eq(saasSchoolSubscriptions.schoolId, schoolId))
      .orderBy(saasSchoolSubscriptions.createdAt)
      .limit(1);

    return {
      schoolId: school.id,
      isActive: school.isActive,
      subscriptionStatus: subscription?.status ?? null,
      subscriptionEndsAt: subscription?.endsAt ?? null,
    };
  } catch {
    return null;
  }
}

// ── 7. Is Tenant Active ───────────────────────────────────────────────────────
/**
 * Quick check: is this school's subscription active?
 * Returns false for expired, cancelled, suspended, or missing subscriptions.
 */
export async function isTenantActive(schoolId: string): Promise<boolean> {
  const status = await getTenantStatus(schoolId);
  if (!status) return false;
  if (!status.isActive) return false;

  if (status.subscriptionStatus === "active") {
    // Also check expiry
    if (status.subscriptionEndsAt && status.subscriptionEndsAt < new Date()) {
      return false;
    }
    return true;
  }

  return false;
}

// ── 8. Is Reserved Slug ───────────────────────────────────────────────────────
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

// ── 9. Write SaaS Audit Log ───────────────────────────────────────────────────
/**
 * Writes a platform-level audit event. Fire-and-forget safe (never throws).
 */
export async function writeSaasAuditLog(params: {
  schoolId?: string;
  actorId?: string;
  eventType: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(saasAuditLogs).values({
      schoolId: params.schoolId ?? null,
      actorId: params.actorId ?? null,
      eventType: params.eventType,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    // Audit log failure must never crash the application
  }
}

// ── 10. Get School by Slug (lightweight) ──────────────────────────────────────
export async function getSchoolBySlug(slug: string) {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, slug.toLowerCase()))
    .limit(1);
  return school ?? null;
}

// ── 11. Get School Onboarding Status ─────────────────────────────────────────
export async function getOnboardingSession(schoolId: string) {
  const [session] = await db
    .select()
    .from(saasOnboardingSessions)
    .where(eq(saasOnboardingSessions.schoolId, schoolId))
    .limit(1);
  return session ?? null;
}
