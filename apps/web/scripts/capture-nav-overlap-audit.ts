import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function auditNavOverlap() {
  console.log("\n📸 Capturing Top & Scrolled Nav Screenshots...\n");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const pagesToTest = [
    { name: "landing", url: "http://localhost:3000/" },
    { name: "pricing", url: "http://localhost:3000/pricing" },
    { name: "register", url: "http://localhost:3000/register" },
    { name: "login", url: "http://localhost:3000/auth/login" },
  ];

  for (const item of pagesToTest) {
    try {
      console.log(`Navigating to ${item.url}...`);
      await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);

      // 1. Capture at top of page (scrollY = 0)
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const topPath = path.join(ARTIFACT_DIR, `nav_top_${item.name}.png`);
      await page.screenshot({ path: topPath, clip: { x: 0, y: 0, width: 1440, height: 600 } });
      console.log(`✅ Saved: nav_top_${item.name}.png`);

      // 2. Capture while scrolled down (scrollY = 350)
      await page.evaluate(() => window.scrollTo(0, 350));
      await page.waitForTimeout(500);
      const scrolledPath = path.join(ARTIFACT_DIR, `nav_scrolled_${item.name}.png`);
      await page.screenshot({ path: scrolledPath, clip: { x: 0, y: 0, width: 1440, height: 600 } });
      console.log(`✅ Saved: nav_scrolled_${item.name}.png`);
    } catch (e) {
      console.error(`Error on ${item.name}:`, e);
    }
  }

  // Also test mobile viewport (375px) for landing page
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, "nav_top_mobile_375px.png"),
    clip: { x: 0, y: 0, width: 375, height: 500 },
  });
  console.log("✅ Saved: nav_top_mobile_375px.png");

  await browser.close();
  console.log("\n✨ All nav overlap verification screenshots captured successfully!\n");
}

auditNavOverlap().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
