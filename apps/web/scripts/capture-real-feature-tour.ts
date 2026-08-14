import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "https://apexium-school-management-system.vercel.app";
const OUTPUT_DIR = path.resolve(__dirname, "../public/screenshots");
const ARTIFACT_DIR = path.resolve("C:/Users/HomePC/.gemini/antigravity/brain/73242aab-42a9-4c41-acd4-cb85915fcda3");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface PanelCapture {
  id: string;
  panelNumber: string;
  title: string;
  desktopRoute: string;
  desktopCaption: string;
  mobileRoute: string;
  mobileCaption: string;
}

const PANELS: PanelCapture[] = [
  {
    id: "sis",
    panelNumber: "01/06",
    title: "Student Information & Admissions",
    desktopRoute: "/dashboard/students",
    desktopCaption: "Admin SIS Student Roster & Admission Records",
    mobileRoute: "/dashboard/students",
    mobileCaption: "Mobile Student Roster & Quick Actions",
  },
  {
    id: "attendance",
    panelNumber: "02/06",
    title: "Daily Attendance & Sync",
    desktopRoute: "/dashboard/attendance",
    desktopCaption: "School-Wide Daily Attendance Register & Statuses",
    mobileRoute: "/dashboard/attendance",
    mobileCaption: "Mobile Roll-Call & Attendance Marker",
  },
  {
    id: "grading",
    panelNumber: "03/06",
    title: "Academics & Report Card Generation",
    desktopRoute: "/dashboard/reports",
    desktopCaption: "Bulk Report Card Batch Compilation & PDF Queue",
    mobileRoute: "/dashboard/reports",
    mobileCaption: "Mobile Report Card Status & Queue Tracking",
  },
  {
    id: "fees",
    panelNumber: "04/06",
    title: "Parent Portal & Fee Invoices",
    desktopRoute: "/dashboard/parent/fees",
    desktopCaption: "Parent Fee Invoicing, Installments & Verified Receipts",
    mobileRoute: "/dashboard/parent/fees",
    mobileCaption: "Mobile Parent Fee Breakdown & Paystack Checkout",
  },
  {
    id: "cbt",
    panelNumber: "05/06",
    title: "Computer-Based Testing (CBT)",
    desktopRoute: "/dashboard/cbt",
    desktopCaption: "CBT Exam Authoring, Question Banks & Auto-Grading",
    mobileRoute: "/dashboard/cbt",
    mobileCaption: "Mobile CBT Exam Console & Timed Session",
  },
  {
    id: "timetable",
    panelNumber: "06/06",
    title: "Timetable & Scheduling",
    desktopRoute: "/dashboard/timetable",
    desktopCaption: "Multi-Period Master Timetable Matrix & Clash Prevention",
    mobileRoute: "/dashboard/timetable",
    mobileCaption: "Mobile Class Schedule & Period Timeline",
  },
];

async function captureRealScreenshots() {
  console.log(`\n📸 Starting Real Feature Tour Capture against: ${BASE_URL}\n`);
  const browser = await chromium.launch();

  // 1. Authenticate Desktop Context as Demo Admin
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();

  console.log("🔑 Logging in on Desktop context...");
  await desktopPage.goto(`${BASE_URL}/auth/login?demo=admin`, { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.click("#login-submit");
  await desktopPage.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 25000 });
  console.log("✅ Desktop authenticated successfully at:", desktopPage.url());

  // 2. Authenticate Mobile Context as Demo Admin
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log("🔑 Logging in on Mobile context...");
  await mobilePage.goto(`${BASE_URL}/auth/login?demo=admin`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.click("#login-submit");
  await mobilePage.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 25000 });
  console.log("✅ Mobile authenticated successfully at:", mobilePage.url());

  // 3. Capture all 6 panels
  for (const panel of PANELS) {
    console.log(`\n📸 Capturing Panel ${panel.panelNumber}: ${panel.title}`);

    // Desktop capture
    const desktopUrl = `${BASE_URL}${panel.desktopRoute}`;
    console.log(`  -> Desktop Route: ${desktopUrl}`);
    await desktopPage.goto(desktopUrl, { waitUntil: "networkidle" });
    await desktopPage.waitForTimeout(1500);

    const desktopFile = `${panel.id}_web.png`;
    const desktopPublicPath = path.resolve(OUTPUT_DIR, desktopFile);
    const desktopArtifactPath = path.resolve(ARTIFACT_DIR, desktopFile);

    await desktopPage.screenshot({ path: desktopPublicPath });
    fs.copyFileSync(desktopPublicPath, desktopArtifactPath);
    console.log(`  ✅ Desktop saved: ${desktopFile}`);

    // Mobile capture
    const mobileUrl = `${BASE_URL}${panel.mobileRoute}`;
    console.log(`  -> Mobile Route: ${mobileUrl}`);
    await mobilePage.goto(mobileUrl, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1500);

    const mobileFile = `${panel.id}_mobile.png`;
    const mobilePublicPath = path.resolve(OUTPUT_DIR, mobileFile);
    const mobileArtifactPath = path.resolve(ARTIFACT_DIR, mobileFile);

    await mobilePage.screenshot({ path: mobilePublicPath });
    fs.copyFileSync(mobilePublicPath, mobileArtifactPath);
    console.log(`  ✅ Mobile saved: ${mobileFile}`);
  }

  await browser.close();
  console.log("\n🎉 All 12 real authenticated screenshots captured and synchronized successfully!\n");
}

captureRealScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
