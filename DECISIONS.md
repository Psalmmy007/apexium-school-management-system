# DECISIONS.md — Technical Decisions Log

This file records every technical decision made during development. It exists so there is always a clear, traceable reason for every architectural choice. All decisions here were made by the agent without asking the user — this is by design per AGENTS.md.

---

## Decision 001 — Auth provider: Supabase Auth
**Date:** 2026-07-26
**Context:** AGENTS.md listed "Supabase Auth (or Auth.js if Supabase Auth is unavailable)" as the auth system.
**Decision:** Use Supabase Auth as the primary auth provider. It is listed first, integrates natively with the Supabase Postgres database (including Row Level Security), and the `@supabase/ssr` package provides first-class Next.js App Router support.
**Why not Auth.js:** Auth.js would require a separate adapter to work with Supabase Postgres and adds unnecessary complexity.

---

## Decision 002 — Node.js version: 20 LTS in CI, 18+ minimum locally
**Date:** 2026-07-26
**Context:** Node.js 25 is installed locally, but CI should use a stable LTS release.
**Decision:** Require Node.js 18+ locally (per `package.json` engines field) and use Node.js 20 LTS in GitHub Actions. Node 20 is the current LTS and is supported by all dependencies.

---

## Decision 003 — pnpm version: 11 (latest) locally, pinned to 11 in CI
**Date:** 2026-07-26
**Context:** pnpm 11.9.0 is installed locally.
**Decision:** Pin pnpm to major version 11 in CI (`pnpm/action-setup@v4` with `version: 11`). This matches the local version and avoids unexpected behaviour from auto-upgrading in CI.

---

## Decision 004 — Database connection: postgres.js driver
**Date:** 2026-07-26
**Context:** Drizzle ORM supports multiple Postgres drivers (postgres.js, node-postgres, neon).
**Decision:** Use `postgres` (postgres.js) as the Drizzle driver. It is the most popular, fully supported by Drizzle, and works with any standard Postgres server including Supabase. No proprietary driver lock-in.

---

## Decision 005 — Session storage: Supabase Auth cookies via @supabase/ssr
**Date:** 2026-07-26
**Context:** Auth session needs to work in Next.js Server Components and middleware.
**Decision:** Use `@supabase/ssr` with cookie-based sessions. This is the official Supabase recommendation for Next.js App Router. Sessions are stored in HTTP-only cookies, which is more secure than localStorage.

---

## Decision 006 — E2E test isolation: unique slug per test run + cleanup in afterAll
**Date:** 2026-07-26
**Context:** E2E tests create real schools and users in the Supabase database. Tests need to be repeatable without manual cleanup.
**Decision:** Each E2E test run generates a unique ID (timestamp-based) and appends it to all created resource names/slugs. `afterAll` deletes all resources created in `beforeAll`. This makes tests idempotent and safe to run in CI.

---

## Decision 007 — E2E tests use service role key (not admin user login)
**Date:** 2026-07-26
**Context:** E2E tests need to create users in Supabase Auth and insert records in the database before testing.
**Decision:** Use the Supabase service role key (stored as a CI secret, never committed) to create test fixtures via the admin API. This is the standard pattern for seeding test data in Supabase projects.

---

## Decision 008 — Nigerian timezone as default in Playwright config
**Date:** 2026-07-26
**Context:** The primary target market for this system is Nigerian schools. Date/time handling needs to be correct for that locale.
**Decision:** Set `timezoneId: "Africa/Lagos"` in Playwright config. This ensures E2E tests catch timezone-related bugs. This can be overridden per-test if needed.

---

## Decision 009 — Monorepo workspace package naming: @apexium/* scope
**Date:** 2026-07-26
**Context:** Workspace packages need a consistent naming convention.
**Decision:** Use `@apexium/` as the npm scope for all workspace packages (`@apexium/web`, `@apexium/worker`, `@apexium/types`, `@apexium/db`). This is standard monorepo practice and avoids name collisions.

---

## Decision 010 — user_metadata in Supabase Auth mirrors DB profile fields
**Date:** 2026-07-26
**Context:** Server Components need the user's role and school_id to render the correct UI. Querying the DB on every page load adds latency.
**Decision:** Store `school_id`, `role`, `first_name`, `last_name` in Supabase Auth `user_metadata` at account creation time. This allows Server Components to read role/school from the JWT without a DB round-trip. The `users` table in our DB remains the source of truth; metadata is kept in sync whenever the profile is updated.

---

## Decision 011 — UI/UX Design System: Corporate Glassmorphism + Dark Sidebar
**Date:** 2026-07-26
**Context:** Need a cohesive, high-contrast, scalable design system for the multi-tenant ERP shell and components.
**Decision:** Adopt Corporate Glassmorphism styling powered by UI UX Pro Max skill guidelines. Dark Slate-900 sidebar (`#0F172A`), Indigo-600 primary brand (`#4F46E5`), Sky-500 secondary (`#0EA5E9`), Emerald-500 present (`#10B981`), Amber-500 warning (`#F59E0B`), and Red-500 danger (`#EF4444`). Inter typography with strict scaling (12px-36px). Responsive 4-tier breakpoint behavior.

---

## Decision 012 — Offline Attendance Reconciliation: Last-Write-Wins (LWW) + Conflict Audit Logging
**Date:** 2026-07-26
**Context:** When multiple teachers mark attendance offline for the same class or student, the system must reconcile state upon reconnection without data loss or unhandled DB errors.
**Decision:** Implement Last-Write-Wins (LWW) conflict resolution based on `updatedAt` timestamps. When syncing, the record with the newer timestamp updates the database. The sync endpoint returns a structured `conflictLog` array recording every reconciled entry (student ID, previous status, winning status, timestamps). Outdated or stale sync attempts do not overwrite newer entries.

---

## Decision 013 — Term status column type: varchar(20)
**Date:** 2026-07-27
**Context:** We need to extend the `terms` table with a `status` field (active/closed).
**Decision:** Use `varchar("status", { length: 20 }).notNull().default("active")` instead of a custom PostgreSQL enum. This is highly portable, avoids potential enum-related migration issues across environments, and is straightforward to typecheck using TypeScript union types.

---

## Decision 017 — Unified Standard Back Navigation Component with Strict Hierarchy
**Date:** 2026-08-15
**Context:** Browser history back is unreliable across deep links, login redirects, and tab restores. Subpages need a deterministic in-UI parent destination while root dashboard homepages must not display empty back elements.
**Decision:** Implement `<BackNavigation href="..." label="..." />` adhering to design tokens (`bg-slate-800 border-slate-700` with Lucide `ArrowLeft`), strict min 44x44px touch targets for mobile accessibility, and explicit hierarchical routing (subpage -> parent section -> root dashboard). Root dashboard homepages (`/`, `/dashboard`, `/dashboard/teacher`, `/dashboard/parent`, `/dashboard/student`) do not render a back button. Login page `/auth/login` renders a dedicated "Back to Home" button targeting `/`.

---

## Decision 018 — Platform Operator Role Model Separation & Server-Side Security Isolation
**Date:** 2026-08-15
**Context:** School administrators (`role: "admin"`) are tenant-scoped users bound to a single school (`school_id`). Platform operators (superadmins) manage the global SaaS multi-tenant infrastructure and must not be bound to any school tenancy or conflated with school admins.
**Decision:** Defined `PlatformUserRole = "platform_operator"` as distinct from `SchoolUserRole = "admin" | "teacher" | "parent" | "student"`. Created an authoritative `saas_platform_operators` table. Locked down `/platform` routes and API endpoints (`/api/platform/schools`, `/api/saas/analytics`, `/api/operations/diagnostics`, `/api/performance/benchmark`) on the server to reject school admins with HTTP 403 Forbidden. Removed `/platform` from `PUBLIC_ROUTES` and removed all links from the school admin dashboard navigation. Built a dedicated server-only CLI provisioning tool (`scripts/provision-platform-operator.ts`) for founders/operators.

---

## Decision 019 — Decoupled CBT Entrance Assessments for Applicants & Multi-Purpose Webhooks
**Date:** 2026-08-19
**Context:** Prospective applicants need to sit entrance assessments and pay application/acceptance fees before becoming students. Prematurely inserting prospective candidates into the `students` table would create fake/premature student records and pollute the active school roster.
**Decision:** Extended `cbtExamSessions` with an optional `admission_application_id` and made `student_id` nullable, allowing applicants to sit scheduled CBT entrance exams using their application reference and guardian email without requiring a user account or student record. Extended Paystack HMAC webhook processing to support `admission_application_fee` and `admission_acceptance_fee` alongside `feeInvoices`. Student records are only created upon verified acceptance and enrollment.
