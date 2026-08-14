import { chromium } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://apexium-school-management-system.vercel.app";

async function testLoginAndCheck() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log("Navigating to login page...");
  await page.goto(`${BASE_URL}/auth/login?demo=admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  console.log("Clicking sign in button...");
  await page.click("#login-submit");

  // Wait for navigation or error
  await page.waitForTimeout(5000);

  console.log("Current URL after sign in:", page.url());
  const errorElement = await page.$("#login-error");
  if (errorElement) {
    const errorText = await errorElement.textContent();
    console.error("❌ Login error encountered:", errorText);
  }

  await page.screenshot({ path: path.resolve(__dirname, "../public/screenshots/test_after_login.png") });
  await browser.close();
}

testLoginAndCheck().catch(console.error);
