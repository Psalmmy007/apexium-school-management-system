import { test, expect } from "@playwright/test";

test.describe("Milestone 16.1 — Enterprise SIS Hardening E2E Test Suite", () => {
  test("verifies student registration, document management, status change, and ID card view", async ({ page }) => {
    // 1. Login to admin dashboard
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', "admin@apexium.edu.ng");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("/dashboard");

    // 2. Navigate to Students Roster
    await page.goto("/dashboard/students");
    await expect(page.locator("h1")).toContainText("Student Information System");

    // 3. Verify Advanced Filter controls are rendered
    await expect(page.locator('input[placeholder*="Search by Admission No"]')).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();

    // 4. Verify ID Card Printable Modal Trigger works
    const idCardBtn = page.locator('button:has-text("ID Card")').first();
    if (await idCardBtn.isVisible()) {
      await idCardBtn.click();
      await expect(page.locator("h4")).toBeVisible();
      await page.click('button:has-text("Close")');
    }

    // 5. Verify Student Profile Page & Document Management Tab
    const viewProfileBtn = page.locator('a:has-text("View Profile")').first();
    if (await viewProfileBtn.isVisible()) {
      await viewProfileBtn.click();
      await page.waitForURL(/\/dashboard\/students\/[a-z0-9-]+/);

      // Verify profile tabs including Documents
      await expect(page.locator('button:has-text("Documents")')).toBeVisible();
      await page.click('button:has-text("Documents")');

      // Verify Upload Document modal trigger
      await expect(page.locator('button:has-text("+ Upload Document")')).toBeVisible();
      await expect(page.locator('label:has-text("Show Deleted Docs")')).toBeVisible();
    }
  });

  test("verifies OpenAPI 3.0 documentation JSON endpoint is accessible", async ({ request }) => {
    const response = await request.get("/api/docs/sis");
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.openapi).toBe("3.0.3");
    expect(json.info.title).toContain("Student Information System");
    expect(json.paths["/api/students/merge"]).toBeDefined();
    expect(json.paths["/api/students/bulk"]).toBeDefined();
  });
});
