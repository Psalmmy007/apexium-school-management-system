import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  classes,
  academicSessions,
  terms,
  schoolDirectoryViews,
  verifyEmailDeliverability,
  checkDomainMismatch,
  createLightweightSchoolListing,
  verifySchoolListingToken,
  searchPublicSchoolDirectory,
  trackSchoolProfileView,
  generateWeeklyInterestReport,
  claimUnconvertedSchool,
  dispatchWeeklyDirectoryInterestReports,
} from "../index";
import { eq, sql } from "drizzle-orm";

describe("Milestone 43 — Public School Directory, Lightweight Listings & Growth Loop", () => {
  const testId = Date.now();

  beforeAll(async () => {
    await db.execute(sql`
      ALTER TABLE schools
      ADD COLUMN IF NOT EXISTS listing_status varchar(30) NOT NULL DEFAULT 'active_tenant',
      ADD COLUMN IF NOT EXISTS school_type varchar(50),
      ADD COLUMN IF NOT EXISTS state varchar(100),
      ADD COLUMN IF NOT EXISTS city varchar(100),
      ADD COLUMN IF NOT EXISTS listing_verified boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_token varchar(128),
      ADD COLUMN IF NOT EXISTS flagged_domain_mismatch boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS flag_reason varchar(255),
      ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS school_directory_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        event_type varchar(30) NOT NULL,
        period_reported boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
  });

  it("1. Email Deliverability: validates real MX domains and rejects invalid/unresolvable domains", async () => {
    // Valid domain (mocked/test domain safeguard)
    const valid = await verifyEmailDeliverability("contact@example.com");
    expect(valid.valid).toBe(true);
    expect(valid.domain).toBe("example.com");

    // Invalid format
    await expect(verifyEmailDeliverability("not-an-email")).rejects.toThrow(/invalid email address format/i);
  });

  it("2. Domain Mismatch: flags free consumer emails and approves matching institutional domains", () => {
    const consumerFlag = checkDomainMismatch("principal.lagos@gmail.com", "Lagos High School");
    expect(consumerFlag.flagged).toBe(true);
    expect(consumerFlag.reason).toMatch(/public consumer email domain/i);

    const matchingFlag = checkDomainMismatch("admissions@lagoshigh.edu.ng", "Lagos High School");
    expect(matchingFlag.flagged).toBe(false);
    expect(matchingFlag.reason).toBeNull();
  });

  it("3. Lightweight Listing Creation: creates unconverted unverified listing without dashboard account", async () => {
    const res = await createLightweightSchoolListing({
      name: `Prestige Academy ${testId}`,
      email: `admissions@prestige-${testId}.example.com`,
      phone: "+2348011223344",
      state: "Lagos",
      city: "Ikeja",
      schoolType: "secondary",
      address: "10 Innovation Way, Ikeja",
    });

    expect(res.school.listingStatus).toBe("listed_unconverted");
    expect(res.school.listingVerified).toBe(false);
    expect(res.verificationToken).toBeDefined();

    // Verify unverified listing does NOT appear in public directory search
    const searchBefore = await searchPublicSchoolDirectory({
      query: `Prestige Academy ${testId}`,
    });
    expect(searchBefore.schools.some((s) => s.id === res.school.id)).toBe(false);

    // Verify verification link publishes listing
    const verifiedSchool = await verifySchoolListingToken(res.verificationToken);
    expect(verifiedSchool.listingVerified).toBe(true);
    expect(verifiedSchool.verificationToken).toBeNull();

    const searchAfter = await searchPublicSchoolDirectory({
      query: `Prestige Academy ${testId}`,
    });
    expect(searchAfter.schools.some((s) => s.id === res.school.id)).toBe(true);
  });

  it("4. Explicit 3-Badge State Verification: asserts exact 3 distinct badges and conditional Apply action", async () => {
    // School A: active_tenant WITH classes and active term
    const [schoolA] = await db
      .insert(schools)
      .values({
        name: `Full ERP Active School ${testId}`,
        slug: `erp-active-${testId}`,
        email: `admin@erp-${testId}.example.com`,
        state: "Lagos",
        city: "Lekki",
        schoolType: "secondary",
        listingStatus: "active_tenant",
        listingVerified: true,
        isActive: true,
      })
      .returning();

    await db.insert(terms).values({
      schoolId: schoolA.id,
      name: "First Term",
      session: "2026/2027",
      isCurrent: true,
    });

    await db.insert(classes).values({
      schoolId: schoolA.id,
      name: "JSS 1 Gold",
      capacity: 35,
    });

    // School B: active_tenant WITHOUT classes/terms configured
    const [schoolB] = await db
      .insert(schools)
      .values({
        name: `ERP Empty Setup School ${testId}`,
        slug: `erp-empty-${testId}`,
        email: `admin@empty-${testId}.example.com`,
        state: "Lagos",
        city: "Surulere",
        schoolType: "primary",
        listingStatus: "active_tenant",
        listingVerified: true,
        isActive: true,
      })
      .returning();

    // School C: listed_unconverted (verified)
    const [schoolC] = await db
      .insert(schools)
      .values({
        name: `Directory Only School ${testId}`,
        slug: `dir-only-${testId}`,
        email: `admin@dir-${testId}.example.com`,
        state: "Lagos",
        city: "Yaba",
        schoolType: "combined",
        listingStatus: "listed_unconverted",
        listingVerified: true,
        isActive: true,
      })
      .returning();

    // Search and test badge states
    const searchRes = await searchPublicSchoolDirectory({ query: `${testId}` });

    const foundA = searchRes.schools.find((s) => s.id === schoolA.id);
    const foundB = searchRes.schools.find((s) => s.id === schoolB.id);
    const foundC = searchRes.schools.find((s) => s.id === schoolC.id);

    // 1. School A: active_tenant + classes + term -> Online Admissions Badge + Apply CTA
    expect(foundA).toBeDefined();
    expect(foundA?.badgeState).toBe("Apexium Partner (Online Admissions)");
    expect(foundA?.admissionsConfigured).toBe(true);
    expect(foundA?.hasApplyAction).toBe(true);

    // 2. School B: active_tenant with NO classes/terms -> Portal Active Badge + NO Apply CTA
    expect(foundB).toBeDefined();
    expect(foundB?.badgeState).toBe("Apexium Partner (Portal Active)");
    expect(foundB?.admissionsConfigured).toBe(false);
    expect(foundB?.hasApplyAction).toBe(false);

    // 3. School C: listed_unconverted -> Directory Listing Badge + NO Apply CTA
    expect(foundC).toBeDefined();
    expect(foundC?.badgeState).toBe("Directory Listing");
    expect(foundC?.admissionsConfigured).toBe(false);
    expect(foundC?.hasApplyAction).toBe(false);
  });

  it("5. Directory Search Filters: correctly filters by State, City, and School Type", async () => {
    // Search with state filter
    const lagosResults = await searchPublicSchoolDirectory({
      state: "Lagos",
      query: `${testId}`,
    });
    expect(lagosResults.schools.length).toBeGreaterThan(0);
    lagosResults.schools.forEach((s) => {
      expect(s.state?.toLowerCase()).toBe("lagos");
    });

    // Search with schoolType filter
    const primaryResults = await searchPublicSchoolDirectory({
      schoolType: "primary",
      query: `${testId}`,
    });
    expect(primaryResults.schools.length).toBeGreaterThan(0);
    primaryResults.schools.forEach((s) => {
      expect(s.schoolType).toBe("primary");
    });
  });

  it("6. Growth Loop: tracks accurate interest and generates exact weekly reports without embellishment", async () => {
    const [targetSchool] = await db
      .insert(schools)
      .values({
        name: `Growth Loop Test School ${testId}`,
        slug: `growth-sch-${testId}`,
        email: `growth@school-${testId}.example.com`,
        listingStatus: "listed_unconverted",
        listingVerified: true,
        isActive: true,
      })
      .returning();

    // Log 3 search impressions and 2 direct profile views
    await db.insert(schoolDirectoryViews).values([
      { schoolId: targetSchool.id, eventType: "search_impression" },
      { schoolId: targetSchool.id, eventType: "search_impression" },
      { schoolId: targetSchool.id, eventType: "search_impression" },
    ]);
    await trackSchoolProfileView(targetSchool.id);
    await trackSchoolProfileView(targetSchool.id);

    const report = await generateWeeklyInterestReport(targetSchool.id);
    expect(report.searchImpressions).toBe(3);
    expect(report.profileViews).toBe(2);
    expect(report.totalViews).toBe(5);
    expect(report.shouldSend).toBe(true);

    // Test zero-activity school is skipped
    const [zeroSchool] = await db
      .insert(schools)
      .values({
        name: `Zero Activity School ${testId}`,
        slug: `zero-sch-${testId}`,
        email: `zero@school-${testId}.example.com`,
        listingStatus: "listed_unconverted",
        listingVerified: true,
        isActive: true,
      })
      .returning();

    const zeroReport = await generateWeeklyInterestReport(zeroSchool.id);
    expect(zeroReport.totalViews).toBe(0);
    expect(zeroReport.shouldSend).toBe(false);

    // Dispatcher test
    const dispatched = await dispatchWeeklyDirectoryInterestReports();
    const sentToTarget = dispatched.reports.find((r) => r.schoolSlug === targetSchool.slug);
    expect(sentToTarget).toBeDefined();
    expect(sentToTarget?.totalViews).toBe(5);
    expect(sentToTarget?.searchImpressions).toBe(3);
    expect(sentToTarget?.profileViews).toBe(2);

    // Assert zero-activity school was skipped
    expect(dispatched.reports.some((r) => r.schoolSlug === zeroSchool.slug)).toBe(false);
  });

  it("7. School Claim Conversion: converts unconverted listing into active_tenant smoothly", async () => {
    const [unconverted] = await db
      .insert(schools)
      .values({
        name: `Claimable Academy ${testId}`,
        slug: `claimable-${testId}`,
        email: `contact@claimable-${testId}.example.com`,
        address: "50 Independence Street",
        state: "Oyo",
        city: "Ibadan",
        listingStatus: "listed_unconverted",
        listingVerified: true,
        isActive: true,
      })
      .returning();

    const claimed = await claimUnconvertedSchool(unconverted.slug);
    expect(claimed.listingStatus).toBe("active_tenant");
    expect(claimed.claimedAt).toBeDefined();
    expect(claimed.name).toBe(`Claimable Academy ${testId}`);
    expect(claimed.address).toBe("50 Independence Street");
  });
});
