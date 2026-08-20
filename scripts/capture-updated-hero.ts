import * as path from "path";
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

  console.log("Navigating to http://localhost:3000/ ...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#hero-primary-cta", { timeout: 30000 });
  await page.waitForSelector("#hero-list-school-cta", { timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(artifactDir, "updated_hero_dual_ctas.png"),
    fullPage: false,
  });
  console.log("Captured updated_hero_dual_ctas.png successfully!");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
