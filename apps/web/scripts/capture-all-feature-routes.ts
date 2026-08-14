import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "https://apexium-school-management-system.vercel.app";
const OUTPUT_DIR = path.resolve(__dirname, "../public/screenshots");
const ARTIFACT_DIR = path.resolve("C:/Users/HomePC/.gemini/antigravity/brain/73242aab-42a9-4c41-acd4-cb85915fcda3");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface Panel {
  id: string;
  panelNumber: string;
  name: string;
  desktopRoute: string;
  mobileRoute: string;
}

const PANELS: Panel[] = [
  {
    id: "sis",
    panelNumber: "01/06",
    name: "Student Information & Admissions",
    desktopRoute: "/dashboard/students",
    mobileRoute: "/dashboard/students",
  },
  {
    id: "attendance",
    panelNumber: "02/06",
    name: "Daily Attendance & Sync",
    desktopRoute: "/dashboard/attendance",
    mobileRoute: "/dashboard/attendance",
  },
  {
    id: "grading",
    panelNumber: "03/06",
    name: "Academics & Report Card Generation",
    desktopRoute: "/dashboard/reports",
    mobileRoute: "/dashboard/reports",
  },
  {
    id: "fees",
    panelNumber: "04/06",
    name: "Parent Portal & Fee Invoices",
    desktopRoute: "/dashboard/parent/fees",
    mobileRoute: "/dashboard/parent/fees",
  },
  {
    id: "cbt",
    panelNumber: "05/06",
    name: "Computer-Based Testing (CBT)",
    desktopRoute: "/dashboard/cbt",
    mobileRoute: "/dashboard/cbt",
  },
  {
    id: "timetable",
    panelNumber: "06/06",
    name: "Timetable & Scheduling",
    desktopRoute: "/dashboard/timetable",
    mobileRoute: "/dashboard/timetable",
  },
];

async function runCapture() {
  const browser = await chromium.launch();

  // 1. Authenticate Desktop Context
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();

  console.log("🔐 Authenticating Desktop session...");
  await desktopPage.goto(`${BASE_URL}/auth/login?demo=admin`, { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.click("#login-submit");
  await desktopPage.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 20000 });
  console.log("✅ Desktop logged in at:", desktopPage.url());

  // 2. Authenticate Mobile Context
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log("🔐 Authenticating Mobile session...");
  await mobilePage.goto(`${BASE_URL}/auth/login?demo=admin`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.click("#login-submit");
  await mobilePage.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 20000 });
  console.log("✅ Mobile logged in at:", mobilePage.url());

  // 3. Capture all 6 panels
  for (const p of PANELS) {
    console.log(`\n📸 Capturing ${p.panelNumber}: ${p.name}`);

    // Desktop
    await desktopPage.goto(`${BASE_URL}${p.desktopRoute}`, { waitUntil: "networkidle" });
    await desktopPage.waitForTimeout(1500);
    const deskFile = `${p.id}_web.png`;
    const deskPath = path.resolve(OUTPUT_DIR, deskFile);
    await desktopPage.screenshot({ path: deskPath });
    fs.copyFileSync(deskPath, path.resolve(ARTIFACT_DIR, deskFile));
    console.log(`  ✅ Desktop screenshot: ${deskFile} (from ${p.desktopRoute})`);

    // Mobile
    await mobilePage.goto(`${BASE_URL}${p.mobileRoute}`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1500);
    const mobFile = `${p.id}_mobile.png`;
    const mobPath = path.resolve(OUTPUT_DIR, mobFile);
    await mobilePage.screenshot({ path: mobPath });
    fs.copyFileSync(mobPath, path.resolve(ARTIFACT_DIR, mobFile));
    console.log(`  ✅ Mobile screenshot: ${mobFile} (from ${p.mobileRoute})`);
  }

  await browser.close();
  console.log("\n✨ All 12 real authenticated screenshots captured and saved to public and artifacts directory!\n");
}

runCapture().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
