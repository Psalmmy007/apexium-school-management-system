import * as path from "path";
import { chromium } from "playwright";
import { db, schools, createLightweightSchoolListing, verifySchoolListingToken } from "@apexium/db";
import { eq } from "drizzle-orm";

async function main() {
  const testTimestamp = Date.now();
  const res = await createLightweightSchoolListing({
    name: `Apexium High College ${testTimestamp}`,
    email: `contact@apexiumhigh-${testTimestamp}.example.com`,
    phone: "+234 802 334 4556",
    address: "15 Mission Road, Garki",
    state: "FCT - Abuja",
    city: "Garki Area 2",
    schoolType: "secondary",
  });

  await verifySchoolListingToken(res.verificationToken);
  const target = res.school;

  console.log(`Created & verified unconverted school: ${target.name} (${target.slug})`);

  // Direct check
  const [check] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, target.slug));
  console.log("Direct DB check in script:", check ? { name: check.name, slug: check.slug, listingStatus: check.listingStatus } : "NOT FOUND");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

  console.log(`Navigating to http://localhost:3000/s/${target.slug} ...`);
  await page.goto(`http://localhost:3000/s/${target.slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#school-claim-action-btn", { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(artifactDir, "m43_unconverted_school_honest_page.png"),
    fullPage: false,
  });
  console.log("Captured m43_unconverted_school_honest_page.png successfully!");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
