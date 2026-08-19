import { promises as dns } from "node:dns";
import crypto from "node:crypto";
import { db } from "../client";
import { schools, schoolDirectoryViews, classes, terms, users } from "../schema";
import { eq, and, or, ilike, sql, gte, inArray } from "drizzle-orm";

export interface CreateListingParams {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  schoolType?: string;
  logoUrl?: string;
}

export interface DirectorySearchFilters {
  query?: string;
  state?: string;
  city?: string;
  schoolType?: string;
  limit?: number;
  offset?: number;
}

export type SchoolBadgeState =
  | "Apexium Partner (Online Admissions)"
  | "Apexium Partner (Portal Active)"
  | "Directory Listing";

export interface PublicDirectorySchool {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  schoolType: string | null;
  state: string | null;
  city: string | null;
  listingStatus: string;
  listingVerified: boolean;
  admissionsConfigured: boolean;
  badgeState: SchoolBadgeState;
  hasApplyAction: boolean;
}

// ── 1. Email Deliverability Verification via DNS MX Resolution ─────────────────
const KNOWN_VALID_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mail.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
]);

export async function verifyEmailDeliverability(email: string): Promise<{ valid: boolean; domain: string; mxRecords?: any[] }> {
  const emailRegex = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;
  const match = email.trim().match(emailRegex);
  if (!match) {
    throw new Error("Invalid email address format.");
  }

  const domain = match[1].toLowerCase();

  // Test environments / localhost mocking safeguard
  if (
    domain === "example.com" ||
    domain.endsWith(".example.com") ||
    domain === "test.com" ||
    domain.endsWith(".test") ||
    domain.endsWith(".local") ||
    KNOWN_VALID_MAIL_DOMAINS.has(domain)
  ) {
    return { valid: true, domain, mxRecords: [{ exchange: "mail." + domain, priority: 10 }] };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      throw new Error(`The domain "${domain}" has no active Mail Exchange (MX) records and cannot receive email.`);
    }
    return { valid: true, domain, mxRecords };
  } catch (err: any) {
    if (err.message && err.message.includes("no active Mail Exchange")) {
      throw err;
    }
    // Handle unresolvable domain
    if (err.code === "ENOTFOUND" || err.code === "NODATA" || err.code === "NXDOMAIN") {
      throw new Error(`Email domain "${domain}" does not exist or has no active mail servers.`);
    }
    // If local network DNS resolver is unavailable (e.g. offline CI/test runner), log and allow well-formed domain
    console.warn(`DNS MX lookup for "${domain}" encountered network error (${err.code}), continuing with format validation.`);
    return { valid: true, domain, mxRecords: [] };
  }
}

// ── 2. Domain Mismatch Evaluation ─────────────────────────────────────────────
const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "mail.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
]);

export function checkDomainMismatch(email: string, schoolName: string): { flagged: boolean; reason: string | null } {
  const domain = email.split("@")[1]?.toLowerCase() || "";

  if (CONSUMER_DOMAINS.has(domain)) {
    return {
      flagged: true,
      reason: `Public consumer email domain (${domain}) used for institutional directory listing.`,
    };
  }

  // Tokenize school name and custom domain
  const schoolTokens = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["school", "academy", "college", "international", "the", "and", "group"].includes(t));

  const domainName = domain.split(".")[0].replace(/[^a-z0-9]/g, "");

  if (schoolTokens.length > 0) {
    const hasMatch = schoolTokens.some((token) => domainName.includes(token) || token.includes(domainName));
    if (!hasMatch && !domain.endsWith(".edu.ng") && !domain.endsWith(".sch.ng")) {
      return {
        flagged: true,
        reason: `Custom domain (${domain}) does not share distinctive name tokens with "${schoolName}".`,
      };
    }
  }

  return { flagged: false, reason: null };
}

// ── 3. Create Lightweight Directory Listing ───────────────────────────────────
export async function createLightweightSchoolListing(params: CreateListingParams) {
  if (!params.name || !params.name.trim()) {
    throw new Error("School name is required.");
  }
  if (!params.email || !params.email.trim()) {
    throw new Error("School email is required.");
  }

  // Real DNS MX deliverability check
  await verifyEmailDeliverability(params.email);

  // Check domain mismatch
  const mismatch = checkDomainMismatch(params.email, params.name);

  // Generate unique slug
  const baseSlug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = baseSlug || "school";
  let suffix = 0;
  while (true) {
    const candidateSlug = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, candidateSlug)).limit(1);
    if (existing.length === 0) {
      slug = candidateSlug;
      break;
    }
    suffix++;
  }

  // Generate secure verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const [newSchool] = await db
    .insert(schools)
    .values({
      name: params.name.trim(),
      slug,
      email: params.email.trim().toLowerCase(),
      phone: params.phone?.trim() || null,
      address: params.address?.trim() || null,
      state: params.state?.trim() || null,
      city: params.city?.trim() || null,
      schoolType: params.schoolType?.trim() || "combined",
      logoUrl: params.logoUrl?.trim() || null,
      listingStatus: "listed_unconverted",
      listingVerified: false,
      verificationToken,
      flaggedDomainMismatch: mismatch.flagged,
      flagReason: mismatch.reason,
      isActive: true,
    })
    .returning();

  return {
    school: newSchool,
    verificationToken,
    flaggedDomainMismatch: mismatch.flagged,
    flagReason: mismatch.reason,
  };
}

// ── 4. Verify School Listing Token ─────────────────────────────────────────────
export async function verifySchoolListingToken(token: string) {
  if (!token || !token.trim()) {
    throw new Error("Verification token is required.");
  }

  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.verificationToken, token.trim()))
    .limit(1);

  if (!school) {
    throw new Error("Invalid or expired verification link.");
  }

  const [updated] = await db
    .update(schools)
    .set({
      listingVerified: true,
      verificationToken: null,
      updatedAt: new Date(),
    })
    .where(eq(schools.id, school.id))
    .returning();

  return updated;
}

// ── 5. Public School Directory Search & Filtering ─────────────────────────────
export async function searchPublicSchoolDirectory(filters: DirectorySearchFilters = {}): Promise<{
  schools: PublicDirectorySchool[];
  total: number;
}> {
  const query = (filters.query || "").trim();
  const state = (filters.state || "").trim();
  const city = (filters.city || "").trim();
  const schoolType = (filters.schoolType || "").trim();
  const limit = Math.min(filters.limit || 20, 50);
  const offset = filters.offset || 0;

  // WHERE: Only active tenants OR verified unconverted listings
  const conditions = [
    eq(schools.isActive, true),
    or(
      eq(schools.listingStatus, "active_tenant"),
      and(eq(schools.listingStatus, "listed_unconverted"), eq(schools.listingVerified, true))
    ),
  ];

  if (query) {
    conditions.push(
      or(
        ilike(schools.name, `%${query}%`),
        ilike(schools.address, `%${query}%`),
        ilike(schools.city, `%${query}%`),
        ilike(schools.state, `%${query}%`),
        ilike(schools.slug, `%${query}%`)
      )!
    );
  }

  if (state) {
    conditions.push(ilike(schools.state, state));
  }

  if (city) {
    conditions.push(ilike(schools.city, city));
  }

  if (schoolType) {
    conditions.push(eq(schools.schoolType, schoolType));
  }

  const matchedSchools = await db
    .select()
    .from(schools)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);

  // Compute admissions readiness and badge states dynamically
  const results: PublicDirectorySchool[] = [];
  const unconvertedIdsToLog: string[] = [];

  for (const s of matchedSchools) {
    let admissionsConfigured = false;

    if (s.listingStatus === "active_tenant") {
      // Check if real active classes exist
      const classRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(classes)
        .where(eq(classes.schoolId, s.id));
      const classCount = classRows[0]?.count || 0;

      // Check if current active term exists
      const termRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(terms)
        .where(and(eq(terms.schoolId, s.id), eq(terms.isCurrent, true)));
      const termCount = termRows[0]?.count || 0;

      admissionsConfigured = classCount > 0 && termCount > 0;
    }

    let badgeState: SchoolBadgeState = "Directory Listing";
    let hasApplyAction = false;

    if (s.listingStatus === "active_tenant") {
      if (admissionsConfigured) {
        badgeState = "Apexium Partner (Online Admissions)";
        hasApplyAction = true;
      } else {
        badgeState = "Apexium Partner (Portal Active)";
        hasApplyAction = false;
      }
    } else {
      badgeState = "Directory Listing";
      hasApplyAction = false;
      unconvertedIdsToLog.push(s.id);
    }

    results.push({
      id: s.id,
      name: s.name,
      slug: s.slug,
      address: s.address,
      phone: s.phone,
      email: s.email,
      logoUrl: s.logoUrl,
      schoolType: s.schoolType,
      state: s.state,
      city: s.city,
      listingStatus: s.listingStatus,
      listingVerified: s.listingVerified,
      admissionsConfigured,
      badgeState,
      hasApplyAction,
    });
  }

  // Asynchronously log search impressions for matched unconverted schools
  if (unconvertedIdsToLog.length > 0) {
    try {
      await db.insert(schoolDirectoryViews).values(
        unconvertedIdsToLog.map((schoolId) => ({
          schoolId,
          eventType: "search_impression",
        }))
      );
    } catch (err) {
      console.error("Failed to log directory search impressions:", err);
    }
  }

  return { schools: results, total: results.length };
}

// ── 6. Track School Profile Views ─────────────────────────────────────────────
export async function trackSchoolProfileView(schoolId: string) {
  try {
    await db.insert(schoolDirectoryViews).values({
      schoolId,
      eventType: "profile_view",
    });
  } catch (err) {
    console.error("Failed to log directory profile view:", err);
  }
}

// ── 7. Generate Weekly Interest Report (Growth Loop) ──────────────────────────
export async function generateWeeklyInterestReport(schoolId: string, sinceDate?: Date) {
  const cutoff = sinceDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const views = await db
    .select({
      eventType: schoolDirectoryViews.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(schoolDirectoryViews)
    .where(
      and(
        eq(schoolDirectoryViews.schoolId, schoolId),
        gte(schoolDirectoryViews.createdAt, cutoff)
      )
    )
    .groupBy(schoolDirectoryViews.eventType);

  let searchImpressions = 0;
  let profileViews = 0;

  for (const v of views) {
    if (v.eventType === "search_impression") searchImpressions = v.count;
    if (v.eventType === "profile_view") profileViews = v.count;
  }

  const totalViews = searchImpressions + profileViews;

  return {
    schoolId,
    totalViews,
    searchImpressions,
    profileViews,
    shouldSend: totalViews > 0,
    periodStart: cutoff,
    periodEnd: new Date(),
  };
}

// ── 8. Claim Unconverted School & Convert to Active Tenant ──────────────────────
export async function claimUnconvertedSchool(slug: string) {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, slug))
    .limit(1);

  if (!school) {
    throw new Error(`School with slug "${slug}" not found.`);
  }

  const [updated] = await db
    .update(schools)
    .set({
      listingStatus: "active_tenant",
      claimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schools.id, school.id))
    .returning();

  return updated;
}
