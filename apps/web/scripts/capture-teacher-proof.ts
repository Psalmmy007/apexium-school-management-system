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

  // 1. Admin Dashboard & Sidebar screenshot (shows "Teacher Workspace" is gone, "Teachers" is present)
  const sidebarShotPath = path.join(ARTIFACT_DIR, "live_admin_sidebar_teachers_verified.png");
  await page.screenshot({ path: sidebarShotPath, fullPage: false });
  console.log("Saved sidebar screenshot:", sidebarShotPath);

  // 2. Navigate to /dashboard/teachers
  await page.goto("http://localhost:3000/dashboard/teachers", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  // If no teachers or to demonstrate live add, click "+ Add New Teacher"
  const addBtn = page.locator("#btn-add-teacher");
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(600);

    // Fill form with real teacher
    await page.fill("#teacher-first-name", "Olawale");
    await page.fill("#teacher-last-name", "Adeleke");
    await page.fill("#teacher-email", "o.adeleke@apexium.edu.ng");
    await page.fill("#teacher-phone", "+234 802 345 6789");

    // Select form class if available
    const formClassSelect = page.locator("#teacher-form-class");
    const options = await formClassSelect.locator("option").all();
    if (options.length > 1) {
      const val = await options[1].getAttribute("value");
      if (val) {
        await formClassSelect.selectOption(val);
      }
    }

    await page.click("#btn-save-teacher");
    await page.waitForTimeout(2500);
  }

  // 3. Capture Teachers Roster screenshot with real data
  const teachersShotPath = path.join(ARTIFACT_DIR, "live_teachers_management_real_data.png");
  await page.screenshot({ path: teachersShotPath, fullPage: false });
  console.log("Saved teachers management screenshot:", teachersShotPath);

  // 4. Capture Academic Structure page to show the teacher appears in the Form Teacher dropdown
  await page.goto("http://localhost:3000/dashboard/academics/structure", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const structureShotPath = path.join(ARTIFACT_DIR, "live_academic_structure_teacher_linked.png");
  await page.screenshot({ path: structureShotPath, fullPage: false });
  console.log("Saved academic structure screenshot:", structureShotPath);

  await browser.close();
}

captureProof().catch(console.error);
