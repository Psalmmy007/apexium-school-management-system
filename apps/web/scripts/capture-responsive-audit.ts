import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

const VIEWPORTS = [
  { name: "375px_android", width: 375, height: 812, label: "375px (Low-end Android)" },
  { name: "390px_phone", width: 390, height: 844, label: "390px (Mid-range Phone)" },
  { name: "768px_tablet", width: 768, height: 1024, label: "768px (Tablet)" },
  { name: "1024px_laptop", width: 1024, height: 768, label: "1024px (Small Laptop)" },
  { name: "1440px_desktop", width: 1440, height: 900, label: "1440px (Desktop)" },
];

const PAGES = [
  { id: "landing", path: "/", name: "Landing Page" },
  { id: "login", path: "/auth/login", name: "Login Portal" },
];

async function captureScreenshots(stage: "before" | "after") {
  console.log(`\n📸 Capturing ${stage.toUpperCase()} screenshots at 5 viewports across 2 pages...\n`);

  const browser = await chromium.launch();

  for (const p of PAGES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });

      const url = `http://localhost:3000${p.path}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      const filename = `${p.id}_${vp.name}_${stage}.png`;
      const fullPath = path.join(ARTIFACTS_DIR, filename);

      await page.screenshot({ path: fullPath, fullPage: false });
      console.log(`Saved: ${filename} (${vp.label} - ${p.name})`);

      await page.close();
    }
  }

  await browser.close();
  console.log(`\n✅ Completed capturing 10 ${stage} screenshots!`);
}

const stageArg = (process.argv[2] as "before" | "after") || "before";
captureScreenshots(stageArg).catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
