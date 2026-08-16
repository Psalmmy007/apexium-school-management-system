import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = path.resolve("C:/Users/HomePC/.gemini/antigravity/brain/73242aab-42a9-4c41-acd4-cb85915fcda3");

async function captureProof() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("Navigating to login page...");
  await page.goto("http://localhost:3000/auth/login?demo=admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.click("#login-submit");
  await page.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 25000 });
  await page.waitForTimeout(2500);

  // 1. Dashboard overview screenshot
  const dashboardShotPath = path.join(ARTIFACT_DIR, "live_admin_dashboard_real_stats.png");
  await page.screenshot({ path: dashboardShotPath, fullPage: false });
  console.log("Saved dashboard screenshot:", dashboardShotPath);

  // 2. Attendance page screenshot (with enrolled student)
  await page.goto("http://localhost:3000/dashboard/attendance", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const attendanceShotPath = path.join(ARTIFACT_DIR, "live_attendance_real_roster.png");
  await page.screenshot({ path: attendanceShotPath, fullPage: false });
  console.log("Saved attendance screenshot:", attendanceShotPath);

  // 3. Attendance page screenshot when selecting an empty class (e.g., JSS 1)
  const classSelect = page.locator("#select-class");
  const options = await classSelect.locator("option").all();
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && text.includes("0 students")) {
      const val = await opt.getAttribute("value");
      if (val) {
        await classSelect.selectOption(val);
        await page.waitForTimeout(3000);
        break;
      }
    }
  }

  const emptyClassShotPath = path.join(ARTIFACT_DIR, "live_attendance_empty_class_selection.png");
  await page.screenshot({ path: emptyClassShotPath, fullPage: false });
  console.log("Saved empty class screenshot:", emptyClassShotPath);

  await browser.close();
}

captureProof().catch(console.error);
