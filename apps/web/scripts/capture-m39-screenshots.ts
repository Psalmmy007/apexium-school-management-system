import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACTS_DIR = "C:/Users/HomePC/.gemini/antigravity/brain/73242aab-42a9-4c41-acd4-cb85915fcda3";

const VIEWPORTS = [
  { name: "375px_mobile", width: 375, height: 667 },
  { name: "390px_phone", width: 390, height: 844 },
  { name: "768px_tablet", width: 768, height: 1024 },
  { name: "1024px_laptop", width: 1024, height: 768 },
  { name: "1440px_desktop", width: 1440, height: 900 },
];

async function capture() {
  console.log("Launching Playwright to capture Milestone 39 verification screenshots...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const targets = [
    { name: "login_page_back_to_home", url: "http://localhost:3000/auth/login" },
    { name: "admin_dashboard_unified", url: "http://localhost:3000/dashboard" },
    { name: "teacher_dashboard_unified", url: "http://localhost:3000/dashboard/teacher" },
    { name: "parent_dashboard_unified", url: "http://localhost:3000/dashboard/parent" },
    { name: "student_dashboard_unified", url: "http://localhost:3000/dashboard/student" },
    { name: "admin_sis_back_nav", url: "http://localhost:3000/dashboard/students" },
    { name: "cbt_platform_unified", url: "http://localhost:3000/dashboard/cbt" },
  ];

  for (const target of targets) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      try {
        await page.goto(target.url, { waitUntil: "networkidle", timeout: 15000 });
      } catch {
        try {
          await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        } catch (e: any) {
          console.warn(`Could not reach ${target.url}: ${e.message}`);
          continue;
        }
      }

      await page.waitForTimeout(500);

      const fileName = `m39_${target.name}_${vp.name}.png`;
      const filePath = path.join(ARTIFACTS_DIR, fileName);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot: ${fileName}`);
    }
  }

  await browser.close();
  console.log("Screenshots captured successfully.");
}

capture().catch((e) => {
  console.error("Screenshot capture error:", e);
});
