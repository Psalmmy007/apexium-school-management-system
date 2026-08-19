import { chromium } from "playwright";
import * as path from "path";
import { db, schools } from "@apexium/db";

async function main() {
  const allSchools = await db.select().from(schools).limit(10);
  const realSchool = allSchools[allSchools.length - 1] || allSchools[0];
  const slug = realSchool ? realSchool.slug : "school-a-promo-1785148644324";
  console.log(`Using school slug: ${slug} (${realSchool?.name})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

  // 1. Marketing landing page with School Finder
  console.log("Navigating to http://localhost:3000/ ...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#school-finder-input", { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Type sequentially to trigger input events
  await page.locator("#school-finder-input").click();
  await page.locator("#school-finder-input").pressSequentially("School", { delay: 150 });
  await page.waitForSelector("#school-finder-results", { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(artifactDir, "m42_marketing_landing_school_finder_active.png"),
    fullPage: false,
  });
  console.log("Captured m42_marketing_landing_school_finder_active.png");

  // 2. School portal landing page
  console.log(`Navigating to http://localhost:3000/s/${slug} ...`);
  await page.goto(`http://localhost:3000/s/${slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#school-apply-admission-btn", { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(artifactDir, "m42_school_portal_admissions_cta.png"),
    fullPage: false,
  });
  console.log("Captured m42_school_portal_admissions_cta.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
