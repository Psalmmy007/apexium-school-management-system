import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Helpers ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "E2E tests require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Generate a unique slug for each test run so tests are idempotent
const TEST_RUN_ID = Date.now().toString(36);
const TEST_SCHOOL_NAME = `E2E Test School ${TEST_RUN_ID}`;
const TEST_SCHOOL_SLUG = `e2e-test-${TEST_RUN_ID}`;
const TEST_PASSWORD = "E2eTestPass123!";

interface TestUser {
  email: string;
  role: "admin" | "teacher" | "parent" | "student";
  firstName: string;
  lastName: string;
}

const TEST_USERS: TestUser[] = [
  { email: `admin-${TEST_RUN_ID}@e2e.test`, role: "admin", firstName: "Admin", lastName: "User" },
  { email: `teacher-${TEST_RUN_ID}@e2e.test`, role: "teacher", firstName: "Teacher", lastName: "User" },
  { email: `parent-${TEST_RUN_ID}@e2e.test`, role: "parent", firstName: "Parent", lastName: "User" },
  { email: `student-${TEST_RUN_ID}@e2e.test`, role: "student", firstName: "Student", lastName: "User" },
];

// ── Fixture: create school and users once for all role tests ───
let schoolId: string;
const createdAuthUserIds: string[] = [];

test.beforeAll(async () => {
  const admin = getAdminClient();

  // 1. Create the school (tenant) in our DB
  const { db, schools, users } = await import("@apexium/db");

  const [school] = await db
    .insert(schools)
    .values({
      name: TEST_SCHOOL_NAME,
      slug: TEST_SCHOOL_SLUG,
    })
    .returning({ id: schools.id });

  schoolId = school.id;

  // 2. Create one Supabase Auth user per role, then insert DB profile
  for (const u of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true, // skip email verification in tests
      user_metadata: {
        school_id: schoolId,
        role: u.role,
        first_name: u.firstName,
        last_name: u.lastName,
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create auth user ${u.email}: ${error?.message}`);
    }

    createdAuthUserIds.push(data.user.id);

    await db.insert(users).values({
      id: data.user.id,
      schoolId,
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
    });
  }
});

test.afterAll(async () => {
  const admin = getAdminClient();

  // Clean up: delete auth users (DB rows cascade-delete via FK)
  for (const id of createdAuthUserIds) {
    await admin.auth.admin.deleteUser(id);
  }

  // Delete the school (cascades to users table)
  const { db, schools } = await import("@apexium/db");
  const { eq } = await import("drizzle-orm");
  await db.delete(schools).where(eq(schools.id, schoolId));
});

// ── Helper: sign in and verify dashboard ──────────────────────
async function signInAndVerifyDashboard(
  page: Page,
  email: string,
  role: string
) {
  await page.goto("/auth/login");

  // Fill login form
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.click("#login-submit");

  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Dashboard heading must be visible
  await expect(page.locator("h1")).toContainText("Welcome back");

  // Dashboard overview section must exist (empty state)
  await expect(page.locator("#dashboard-overview")).toBeVisible();

  // Role badge must show correct role
  const badge = page.locator(`text=${role}`).first();
  await expect(badge).toBeVisible();

  // Sign out before next test
  await page.evaluate(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
  });
}

// ── Tests ──────────────────────────────────────────────────────

test("admin can log in and sees empty dashboard", async ({ page }) => {
  await signInAndVerifyDashboard(page, TEST_USERS[0].email, "admin");
});

test("teacher can log in and sees empty dashboard", async ({ page }) => {
  await signInAndVerifyDashboard(page, TEST_USERS[1].email, "teacher");
});

test("parent can log in and sees empty dashboard", async ({ page }) => {
  await signInAndVerifyDashboard(page, TEST_USERS[2].email, "parent");
});

test("student can log in and sees empty dashboard", async ({ page }) => {
  await signInAndVerifyDashboard(page, TEST_USERS[3].email, "student");
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
});
