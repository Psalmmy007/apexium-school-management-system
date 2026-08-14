import { chromium } from "@playwright/test";
import path from "path";

async function captureRebuiltLanding() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  console.log("Navigating to live production deployment...");
  await page.goto("https://apexium-school-management-system.vercel.app", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2000);

  const proofSection = page.locator("#proof");
  const securitySection = page.locator("#security");

  const artifactDir = "C:\\Users\\HomePC\\.gemini\\antigravity\\brain\\73242aab-42a9-4c41-acd4-cb85915fcda3";

  await proofSection.screenshot({
    path: path.join(artifactDir, "rebuilt_product_tour_section.png"),
  });
  console.log("Saved: rebuilt_product_tour_section.png");

  await securitySection.screenshot({
    path: path.join(artifactDir, "rebuilt_security_guarantees_section.png"),
  });
  console.log("Saved: rebuilt_security_guarantees_section.png");

  await browser.close();
}

captureRebuiltLanding().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
