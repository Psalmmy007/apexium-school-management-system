import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

async function auditLiveNavOverlap() {
  console.log("\n📸 Capturing Top & Scrolled Nav Screenshots from Live Site...\n");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const pagesToTest = [
    { name: "landing", url: "https://apexium-school-management-system.vercel.app/" },
    { name: "pricing", url: "https://apexium-school-management-system.vercel.app/pricing" },
    { name: "register", url: "https://apexium-school-management-system.vercel.app/register" },
    { name: "login", url: "https://apexium-school-management-system.vercel.app/auth/login" },
  ];

  for (const item of pagesToTest) {
    try {
      console.log(`Navigating to ${item.url}...`);
      await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(2000);

      // 1. Capture at top of page (scrollY = 0)
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
      const topPath = path.join(ARTIFACT_DIR, `nav_top_${item.name}.png`);
      await page.screenshot({ path: topPath, clip: { x: 0, y: 0, width: 1440, height: 500 } });
      console.log(`✅ Saved: nav_top_${item.name}.png`);

      // 2. Capture while scrolled down (scrollY = 350)
      await page.evaluate(() => window.scrollTo(0, 350));
      await page.waitForTimeout(600);
      const scrolledPath = path.join(ARTIFACT_DIR, `nav_scrolled_${item.name}.png`);
      await page.screenshot({ path: scrolledPath, clip: { x: 0, y: 0, width: 1440, height: 500 } });
      console.log(`✅ Saved: nav_scrolled_${item.name}.png`);
    } catch (e) {
      console.error(`Error on ${item.name}:`, e);
    }
  }

  // Mobile 375px viewport test
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("https://apexium-school-management-system.vercel.app/", { waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, "nav_top_mobile_375px.png"),
    clip: { x: 0, y: 0, width: 375, height: 450 },
  });
  console.log("✅ Saved: nav_top_mobile_375px.png");

  await browser.close();
  console.log("\n✨ Live nav overlap verification complete!\n");
}

auditLiveNavOverlap().catch((err) => {
  console.error("Live audit failed:", err);
  process.exit(1);
});
