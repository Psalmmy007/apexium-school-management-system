import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { db, schools, classes, terms } from "@apexium/db";
import { eq, sql } from "drizzle-orm";
import { POST as createListingHandler } from "./api/schools/list/route";
import { GET as verifyListingHandler } from "./api/schools/verify-listing/route";
import { GET as searchDirectoryHandler } from "./api/schools/search/route";
import { GET as getFlaggedHandler, PATCH as patchFlaggedHandler } from "./api/platform/directory/flagged/route";
import SchoolSlugLandingPage from "./s/[slug]/page";

describe("Milestone 43 — Public School Directory & Lightweight Listing Growth Loop", () => {
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

  it("1. Lightweight Listing API: validates deliverability, creates unconverted listing with domain check", async () => {
    const req = new NextRequest("http://localhost/api/schools/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Horizon Heights Academy ${testId}`,
        email: `principal.horizon@gmail.com`, // Consumer domain -> will flag
        phone: "+2348039988776",
        address: "Plot 80, Victoria Island",
        state: "Lagos",
        city: "Lagos Island",
        schoolType: "combined",
      }),
    });

    const res = await createListingHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.school.listingStatus).toBe("listed_unconverted");
    expect(data.school.listingVerified).toBe(false);
    expect(data.flaggedDomainMismatch).toBe(true);
    expect(data.verificationToken).toBeDefined();

    // Verify record in database
    const [dbSchool] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, data.school.id));

    expect(dbSchool.listingStatus).toBe("listed_unconverted");
    expect(dbSchool.listingVerified).toBe(false);
    expect(dbSchool.flaggedDomainMismatch).toBe(true);
  });

  it("2. Verification Gate: unverified listing is hidden from directory search; token verification publishes it", async () => {
    // 1. Search before verification
    const searchReq1 = new NextRequest(`http://localhost/api/schools/search?q=Horizon+Heights+${testId}`);
    const searchRes1 = await searchDirectoryHandler(searchReq1);
    const searchData1 = await searchRes1.json();
    expect(searchData1.schools.some((s: any) => s.name.includes(`${testId}`))).toBe(false);

    // 2. Fetch the created school's verification token
    const [unverifiedSchool] = await db
      .select()
      .from(schools)
      .where(eq(schools.name, `Horizon Heights Academy ${testId}`));

    expect(unverifiedSchool.verificationToken).toBeDefined();

    // 3. Verify token via API
    const verifyReq = new NextRequest(
      `http://localhost/api/schools/verify-listing?token=${unverifiedSchool.verificationToken}&format=json`
    );
    const verifyRes = await verifyListingHandler(verifyReq);
    const verifyData = await verifyRes.json();

    expect(verifyRes.status).toBe(200);
    expect(verifyData.success).toBe(true);
    expect(verifyData.school.listingVerified).toBe(true);

    // 4. Search after verification
    const searchReq2 = new NextRequest(`http://localhost/api/schools/search?q=${testId}`);
    const searchRes2 = await searchDirectoryHandler(searchReq2);
    const searchData2 = await searchRes2.json();

    expect(searchData2.schools.length).toBeGreaterThan(0);
    const published = searchData2.schools.find((s: any) => s.id === unverifiedSchool.id);
    expect(published).toBeDefined();
    expect(published.badgeState).toBe("Directory Listing");
    expect(published.hasApplyAction).toBe(false);
  });

  it("3. Safe-Only Public Data: search results contain zero internal operational or financial metrics", async () => {
    const searchReq = new NextRequest(`http://localhost/api/schools/search?q=${testId}`);
    const searchRes = await searchDirectoryHandler(searchReq);
    const searchData = await searchRes.json();

    expect(searchData.schools.length).toBeGreaterThan(0);
    const item = searchData.schools[0];

    // Allowed public safe fields
    expect(item.name).toBeDefined();
    expect(item.slug).toBeDefined();
    expect(item.address).toBeDefined();
    expect(item.badgeState).toBeDefined();

    // Strictly asserted ABSENT fields (no operational leakage)
    expect((item as any).studentCount).toBeUndefined();
    expect((item as any).teacherCount).toBeUndefined();
    expect((item as any).totalRevenue).toBeUndefined();
    expect((item as any).bankAccountNumber).toBeUndefined();
    expect((item as any).feeBalances).toBeUndefined();
  });

  it("4. Honest Unconverted School Page (/s/[slug]): renders contact card & claim CTA with ZERO application forms", async () => {
    const [unconverted] = await db
      .select()
      .from(schools)
      .where(eq(schools.name, `Horizon Heights Academy ${testId}`));

    // Render the React component for /s/[slug]
    const rendered = await SchoolSlugLandingPage({ params: { slug: unconverted.slug } });
    const renderedMarkup = renderToStaticMarkup(rendered);

    // Assert honest directory notice exists
    expect(renderedMarkup).toContain("Apexium Verified School Directory Profile");
    expect(renderedMarkup).toContain("Online Application Status");
    expect(renderedMarkup).toContain("has not yet activated digital online applications");
    expect(renderedMarkup).toContain("Claim This School");

    // Assert strictly that NO admissions application form or inputs are rendered
    expect(renderedMarkup).not.toContain("First Name *");
    expect(renderedMarkup).not.toContain("Last Name *");
    expect(renderedMarkup).not.toContain("Submit Application");
    expect(renderedMarkup).not.toContain("Start Application");
  });
});
