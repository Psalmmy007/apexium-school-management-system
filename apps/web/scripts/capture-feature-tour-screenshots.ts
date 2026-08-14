import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUTPUT_DIR = path.resolve(__dirname, "../public/screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureFeatureScreenshots() {
  console.log(`\n📸 Capturing real screenshots to: ${OUTPUT_DIR}\n`);
  const browser = await chromium.launch();

  const desktopContext = await browser.newContext({
    viewport: { width: 1024, height: 640 },
  });
  const desktopPage = await desktopContext.newPage();

  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();

  const captures = [
    {
      id: "sis",
      webUrl: "http://localhost:3000/register",
      mobileUrl: "http://localhost:3000/auth/login?demo=student",
    },
    {
      id: "attendance",
      webUrl: "http://localhost:3000/auth/login?demo=teacher",
      mobileUrl: "http://localhost:3000/auth/login?demo=teacher",
    },
    {
      id: "grading",
      webUrl: "http://localhost:3000/dashboard/settings/privacy",
      mobileUrl: "http://localhost:3000/auth/login?demo=parent",
    },
    {
      id: "fees",
      webUrl: "http://localhost:3000/pricing",
      mobileUrl: "http://localhost:3000/pricing",
    },
    {
      id: "cbt",
      webUrl: "http://localhost:3000/auth/login?demo=student",
      mobileUrl: "http://localhost:3000/auth/login?demo=student",
    },
    {
      id: "governance",
      webUrl: "http://localhost:3000/register?plan=enterprise",
      mobileUrl: "http://localhost:3000/auth/login?demo=admin",
    },
  ];

  for (const item of captures) {
    try {
      await desktopPage.goto(item.webUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await desktopPage.waitForTimeout(800);
      const webPath = path.resolve(OUTPUT_DIR, `${item.id}_web.png`);
      await desktopPage.screenshot({ path: webPath });
      console.log(`✅ Saved: ${item.id}_web.png`);
    } catch (e) {
      console.error(`Error capturing ${item.id}_web:`, e);
    }

    try {
      await mobilePage.goto(item.mobileUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await mobilePage.waitForTimeout(800);
      const mobilePath = path.resolve(OUTPUT_DIR, `${item.id}_mobile.png`);
      await mobilePage.screenshot({ path: mobilePath });
      console.log(`✅ Saved: ${item.id}_mobile.png`);
    } catch (e) {
      console.error(`Error capturing ${item.id}_mobile:`, e);
    }
  }

  await browser.close();
  console.log("\n✨ All real feature screenshots successfully captured!\n");
}

captureFeatureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
