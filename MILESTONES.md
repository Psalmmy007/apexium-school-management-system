# MILESTONES.md — Build Checklist (Milestone 0 → 5)

Rules for how to use this file are in `AGENTS.md`. Work top to bottom, one unchecked task at a time. Do not skip ahead. Do not start a milestone marked below the current one.

---

## Milestone 0: Foundation & Architecture — [x] COMPLETE

- [x] Initialize pnpm monorepo: `apps/web` (Next.js, App Router, TypeScript, Tailwind), `apps/worker` (Node.js + TypeScript), `packages/types` (shared TypeScript types), `packages/db` (Drizzle schema + client)
- [x] Set up Drizzle ORM connected to a Postgres database (Supabase project)
- [x] Create initial schema: `schools` (tenants) table, `users` table, `roles` (admin, teacher, parent, student) — every future table must reference `school_id`
- [x] Set up authentication with role-based sessions
- [x] Set up base layout, navigation shell, Tailwind config
- [x] Set up GitHub Actions CI: lint + type-check + test on every push, blocking merge on failure
- [x] Set up reproducible local dev setup (Supabase CLI or docker-compose for Postgres/Redis)
- [x] Write automated test: create a school, create one user per role, log each in, confirm each sees an empty dashboard

**Definition of Done (must pass automatically, not just "look right"):** The automated test above passes in CI.

---

## Milestone 1: Student Information System (SIS) — [x] COMPLETE

- [x] Student schema: biodata, photo reference, guardian/parent links, class/section assignment, `school_id`
- [x] Student CRUD: API (Next.js Route Handlers) + admin UI pages (list, add, edit, view)
- [x] Bulk CSV import for rosters, with row-level error reporting (which rows failed and why)
- [x] Automated test: create two schools, add students to each, assert School A's admin can never query, see, or edit School B's students

**Definition of Done:** A roster can be imported and edited through the UI, and the tenant-isolation test passes.

---

## Milestone 2: Attendance (offline-first, web/PWA) — [x] COMPLETE

- [x] Set up RxDB with the IndexedDB storage adapter in `apps/web`, plus a basic PWA service worker so the app is usable offline in the browser
- [x] Attendance schema (per student, per class, per period/day, `school_id`) + sync endpoint (Next.js Route Handler) that RxDB replicates against
- [x] Teacher UI: mark student attendance
- [x] Staff attendance (same pattern, separate schema)
- [x] Automated test simulating offline attendance entry from two separate sessions for the same class, then reconciling — confirm no data is silently lost or wrongly overwritten

**Definition of Done:** Attendance can be marked with the browser's network disabled, and appears correctly on the admin dashboard once reconnected; the conflict test passes.

---

## Milestone 3: Timetable / Class Scheduling — [x] COMPLETE

- [x] Timetable schema: subject, teacher, class, period, `school_id`
- [x] Conflict prevention enforced at the data/service layer (a teacher cannot be assigned to two classes in the same period; a class cannot have two subjects in the same period) — not just a UI warning
- [x] Admin UI to build and edit a timetable
- [x] Automated test: attempt to create a double-booking, assert the system rejects it

**Definition of Done:** A full week's timetable can be built for a class, and the double-booking test passes.

---

## Milestone 4: Academics — Scores & Grading — [x] COMPLETE

- [x] Score entry schema + API + UI, per subject per term
- [x] Configurable grading scheme (WAEC-style grade bands, stored as config, not hardcoded)
- [x] Class ranking computation
- [x] Build a hand-verified sample dataset (a small class with known correct grades and ranks) and an automated test asserting the system's output matches it exactly

**Definition of Done:** The automated test against the verified sample dataset passes exactly — no rounding or ranking discrepancies.

---

## Milestone 5: Report Card Generation — [ ] NOT STARTED

- [ ] Report card PDF template (matches the grading data from Milestone 4, includes affective/psychomotor rating fields)
- [ ] Background job in `apps/worker` (BullMQ) that generates PDFs — this must NOT run inside a Next.js request/response cycle
- [ ] Next.js route that enqueues a bulk-generation job (e.g., "generate report cards for this whole class") and returns immediately
- [ ] A way for the admin UI to check job status and download completed PDFs
- [ ] Automated test: enqueue generation for a full class (simulate at least 100+ students), verify every PDF is produced correctly and the job doesn't crash or time out

**Definition of Done:** Bulk report card generation for a full class completes successfully and reliably, verified by the automated test — including at a batch size much larger than one real class, to prove it won't break under real load.

---

## STOP after Milestone 5

Do not begin Promotion & Session Transition (Milestone 6) or Load & Reliability Hardening (Milestone 7) unless explicitly instructed. Wait for the human.
