import { chromium } from "playwright";
import * as path from "path";
import { db, schools } from "@apexium/db";

async function main() {
  const testTimestamp = Date.now();

  const [unconvertedSchool] = await db
    .insert(schools)
    .values({
      name: `St. Jude Premier College ${testTimestamp}`,
      slug: `st-jude-${testTimestamp}`,
      email: "inquiries@stjudepremier.example.com",
      phone: "+234 802 334 4556",
      address: "15 Mission Road, Garki",
      state: "FCT - Abuja",
      city: "Garki Area 2",
      schoolType: "secondary",
      listingStatus: "listed_unconverted",
      listingVerified: true,
      isActive: true,
    })
    .returning();

  console.log(`Created sample unconverted school: ${unconvertedSchool.name} (${unconvertedSchool.slug})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

  // 1. Landing Page with Dual CTAs
  console.log("Navigating to http://localhost:3000/ ...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#hero-primary-cta", { timeout: 30000 });
  await page.waitForSelector("#hero-list-school-cta", { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(artifactDir, "m43_marketing_landing_dual_ctas.png"),
    fullPage: false,
  });
  console.log("Captured m43_marketing_landing_dual_ctas.png");

  // 2. Directory Search with State Filter
  await page.locator("#school-finder-state-filter").selectOption("Lagos");
  await page.waitForSelector("#school-finder-results", { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(artifactDir, "m43_directory_search_results.png"),
    fullPage: false,
  });
  console.log("Captured m43_directory_search_results.png");

  // 3. Lightweight Listing Form Page (/list-school)
  console.log("Navigating to http://localhost:3000/list-school ...");
  await page.goto("http://localhost:3000/list-school", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#submit-directory-listing-btn", { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(artifactDir, "m43_lightweight_listing_form.png"),
    fullPage: false,
  });
  console.log("Captured m43_lightweight_listing_form.png");

  // 4. Honest Unconverted School Page (/s/[slug])
  console.log(`Navigating to http://localhost:3000/s/${unconvertedSchool.slug} ...`);
  await page.goto(`http://localhost:3000/s/${unconvertedSchool.slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#school-claim-action-btn", { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(artifactDir, "m43_unconverted_school_honest_page.png"),
    fullPage: false,
  });
  console.log("Captured m43_unconverted_school_honest_page.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
