# AGENTS.md — Project Rules for the School ERP Core Build

Antigravity reads this file automatically. These rules apply to every agent working on this project, for every task, at every milestone. They are not suggestions — they override the agent's own judgment when there's a conflict.

## What this project is

A multi-tenant School ERP web application. Full current scope, all fully specified in MILESTONES.md (Milestones 0–12): Student Information System, Attendance, Timetable, Academics/Grading, Report Card Generation, Promotion/Session Transition, Load & Reliability Hardening, License Center, CBT Platform, Learning Portal, Teacher Portal, and Parent Portal. Student Portal, Library, Hostel, Transport, Inventory, Payroll, and Finance are future work and are explicitly out of scope until a new milestone file is provided.

## Tech stack — do not substitute any of these without explicit permission

- Framework: Next.js (App Router) — handles both the frontend and the backend (Route Handlers / Server Actions). No separate backend framework.
- Language: TypeScript everywhere, including the background worker.
- ORM: Drizzle ORM.
- Database: PostgreSQL, hosted on Supabase during this build phase.
- Auth: Supabase Auth (or Auth.js if Supabase Auth is unavailable — pick one and stay consistent).
- Offline/local storage: RxDB over IndexedDB in the browser (this is a web app, not mobile, for now).
- Background jobs (PDF generation, bulk imports): a separate Node.js worker (`apps/worker`) using BullMQ + Redis. Never generate PDFs or do bulk processing inside a Next.js request — it will time out.
- Styling: Tailwind CSS.
- Testing: Vitest for unit/integration tests, Playwright for end-to-end tests.
- Monorepo: pnpm workspaces — `apps/web`, `apps/worker`, `packages/types`, `packages/db`.

## The most important rule: never ask the user a technical question

The person running this project is non-technical. They cannot correctly answer questions like "should this use optimistic or pessimistic locking?" or "REST or RPC-style routes?" or "what should the session timeout be?" If you ask, you will get a wrong or random answer, and the project will break.

Instead:
- When a technical decision is needed, choose the most standard, well-documented, secure, boring option. Boring and proven beats clever.
- Write the decision and a one-sentence reason to `DECISIONS.md` (create it if it doesn't exist) so there's a record. Do not pause for approval on these.
- The **only** thing you are allowed to stop and ask about is something only the human can actually provide — a real credential (e.g. "I need a Supabase project URL and anon key — here's exactly how to get them, step by step"), a business decision genuinely outside this spec, or a milestone checkpoint (see below). When you do ask, use plain, non-technical language and give the exact steps, not jargon.

## Non-negotiable architecture rule: multi-tenancy from the first migration

Every table that stores school data must include a `school_id` column from the very first migration, even while there's only one test school in the system. Do not add this later. Do not skip it "for now."

## How to work: one task at a time, self-verified

1. Open `MILESTONES.md`. Find the current milestone (the first one not marked complete) and the first unchecked task inside it.
2. Implement only that one task.
3. Write or update automated tests that prove the task works.
4. Run the full test suite. If anything fails, fix it before doing anything else — do not move to the next task with failing tests.
5. Commit the change to git with a clear, plain-English commit message.
6. Check the task off in `MILESTONES.md`.
7. Repeat from step 1 for the next unchecked task in the same milestone.
8. When every task in the milestone is checked off, run that milestone's **Definition of Done** verification exactly as written in `MILESTONES.md`. This must be an automated test or script — not your own judgment call.
9. If the Definition of Done passes: mark the milestone complete in `MILESTONES.md`, write a short plain-English summary to `PROGRESS.md` (see format below), and **stop**. Wait for the human to say "continue" before starting the next milestone. Do not start the next milestone on your own, even if you're confident.
10. If the Definition of Done fails: keep working on that milestone. Do not report it as complete.

## PROGRESS.md summary format (plain English, no jargon)

Each milestone checkpoint entry should read like this:

```
## Milestone [N]: [Name] — COMPLETE
Date: [date]

What this means in plain terms: [1-3 sentences a non-technical person can understand — e.g. "The system can now save a full list of students for a school and keep two schools' data completely separate."]

Proof it works: [what automated test/check confirms this, in plain terms]

Nothing needed from you right now — just reply "continue" when you're ready for the next milestone.
```

## Other standing rules

- Never commit secrets or API keys. Use environment variables and add real values only to a local `.env` file that is git-ignored.
- Keep each git commit small and scoped to one task.
- If you discover the spec in `MILESTONES.md` is ambiguous or technically wrong in a way that would make the product worse, do not silently guess — write the concern to `DECISIONS.md`, choose the safest reasonable interpretation, proceed, and flag it in the next `PROGRESS.md` checkpoint in plain language.
