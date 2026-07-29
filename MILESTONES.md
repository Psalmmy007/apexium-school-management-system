# MILESTONES.md — Build Checklist (Milestone 0 → 12)

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

**Definition of Done:** The automated test above passes in CI.

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
- [x] Conflict resolution decision recorded in DECISIONS.md, with a permanent `attendance_conflict_logs` table so any conflict can be looked up later

**Definition of Done:** Attendance can be marked with the browser's network disabled, and appears correctly on the admin dashboard once reconnected; the conflict test passes; conflicts are permanently queryable.

---

## Milestone 3: Timetable / Class Scheduling — [x] COMPLETE

- [x] Timetable schema: subject, teacher, class, period, `school_id`
- [x] Conflict prevention enforced at the data/service layer — not just a UI warning
- [x] Admin UI to build and edit a timetable
- [x] Automated test: attempt to create a double-booking, assert the system rejects it

**Definition of Done:** A full week's timetable can be built for a class, and the double-booking test passes.

---

## Milestone 4: Academics — Scores & Grading — [x] COMPLETE

- [x] Score entry schema + API + UI, per subject per term
- [x] Configurable grading scheme (WAEC-style grade bands, stored as config, not hardcoded)
- [x] Class ranking computation
- [x] Hand-verified sample dataset with an automated test asserting the system's output matches it exactly

**Definition of Done:** The automated test against the verified sample dataset passes exactly.

---

## Milestone 5: Report Card Generation — [x] COMPLETE

- [x] Report card PDF template (grading data + affective/psychomotor rating fields)
- [x] Background job in `apps/worker` (BullMQ) that generates PDFs
- [x] Next.js route that enqueues a bulk-generation job and returns immediately
- [x] Admin UI to check job status and download completed PDFs
- [x] Automated test: enqueue generation for 100+ students, verify no crash/timeout

**Definition of Done:** Bulk report card generation completes successfully and reliably.

---

## Milestone 6: Promotion & Session Transition — [x] COMPLETE

- [x] Extend the `terms`/session model with a `status` field (active/closed), `school_id` included
- [x] Promotion workflow: bulk-promote all students in a class to the next class/section for the new session
- [x] Exception handling: a student can instead be marked to **repeat** the current class, or to **graduate/leave**, as explicit selectable choices per student
- [x] Historical integrity: prior-term scores, attendance, and rankings remain permanently linked to that term and fully queryable after promotion
- [x] Admin UI: review roster, choose promote/repeat/graduate per student, confirm and execute for the whole class
- [x] Automated test: promote a full class with at least one repeat and one graduate case; verify correct outcomes and that prior-term records remain unchanged and retrievable

**Definition of Done:** A class is promoted to a new session — including a repeat case and a graduate case handled correctly — with every student's prior-term history intact, proven by test.

---

## Milestone 7: Load & Reliability Hardening — [x] COMPLETE

- [x] Write a load-testing script (k6 or Artillery, both free/open-source) simulating multiple schools concurrently marking attendance and generating report cards
- [x] Run the load test at 5–10x realistic expected concurrent usage; record results
- [x] Add indexes based on actual slow-query evidence from the load test, not guesses
- [x] Confirm and document the backup configuration
- [x] Perform a real backup **restore drill**: restore an actual backup into a test database and verify it matches the original exactly
- [x] Write results to a `RELIABILITY.md` file

**Definition of Done:** The load test at 5–10x expected usage holds up without crashes/unacceptable errors, and a real backup restore has been verified once.

---

## Milestone 8: License Center — [x] COMPLETE

- [x] License schema: `licenses` table (`school_id`, tier/plan, enabled-modules flags, seat/student cap, status, issued_at, expires_at) + `license_events` table logging every renewal/upgrade/downgrade
- [x] License key generation and activation service
- [x] Module-gating: license record determines which modules (Core ERP, and later CBT/Learning/etc.) a school can access; enforced at the route/middleware level, not just hidden in the UI
- [x] Seat/student-count enforcement: creating a student beyond the licensed cap is rejected with a clear, specific in-app message — never a silent failure
- [x] Expiry tracking with automated renewal reminders at configurable intervals before expiry (e.g. 30/14/3 days out)
- [x] Superadmin dashboard (for you, not the schools) listing every licensed school, tier, status, expiry, and seat usage, with search/filter
- [x] Self-service upgrade/downgrade: a school admin can change tier without contacting support; caps and module access update immediately
- [x] Offline license validation: a cached check that works without internet, requiring only periodic (not constant) online re-validation — a school must never be locked out mid-day purely because it's genuinely offline
- [x] Automated test covering: exceeding the student cap is rejected; an expired license blocks gated-module access but never deletes or hides existing data (read access to your own data should survive an expiry); an upgrade correctly raises caps and unlocks modules immediately

**Definition of Done:** Licensing, capping, expiry, and upgrades are all enforced automatically and verified by test — and an expired license never results in data loss or an unexplained lockout.

---

## Milestone 9: CBT Platform — [x] COMPLETE

- [x] Question bank schema: subjects, questions (MCQ/theory/objective), options, correct answers, difficulty/tags, `school_id`
- [x] Exam schema: exam definition (title, subject, duration, question set, class/term) + student exam session tracking (start time, answers, status)
- [x] Exam-taking UI: timed, with auto-submit on timeout, randomized question/option order per student
- [x] Continuous answer auto-save: answers persist locally (RxDB/IndexedDB) as the student progresses and sync continuously to the server — not only at final submission
- [x] Auto-grading service for objective/MCQ questions; theory questions flagged for manual grading
- [x] Result analytics: per-question, per-class, per-subject breakdown for teachers/admins
- [x] Lockdown/anti-cheat mode: restrict copy-paste and tab/app switching during an exam
- [x] Automated test: simulate a browser crash/refresh mid-exam — verify every previously answered question is preserved, the student resumes exactly where they left off, and the timer correctly continues rather than resetting
- [x] Automated test: two students taking the same exam receive different (randomized) question/option order and are both graded correctly against their own presented order

**Definition of Done:** A full exam can be taken including a simulated mid-exam crash with zero answer loss and a correctly continuing timer — this is the single most important guarantee for this module, given real exam-day stakes.

---

## Milestone 10: Learning Portal (LMS) — [x] COMPLETE

- [x] Lesson schema: lessons (title, subject, class, term, content body, attachments), curriculum/scheme-of-work topic mapping, `school_id`
- [x] Assignment schema: definition, due date, submission records (student, file/text, submitted_at, grade, feedback)
- [x] Teacher UI: create lesson notes with attachments, create assignments
- [x] Student UI: view lessons, submit assignments (file upload via Cloudflare R2), see feedback/grades
- [x] Video/audio content: support external embeds (YouTube/Vimeo links) as the default path — avoids hosting cost and bandwidth strain — with an optional low-resolution direct upload path
- [x] Low-bandwidth mode: content defaults to text/compressed-first with an explicit "load media" action rather than auto-loading heavy content
- [x] Gradebook integration: assignment grades write into the same score structure used by the Milestone 4 Academics module — not a separate, disconnected gradebook
- [x] Automated test: full cycle — teacher creates lesson + assignment, student submits, teacher grades — and the resulting grade is verifiably the same data the core Academics module reads, proving the shared data model wasn't broken

**Definition of Done:** A full lesson-to-graded-assignment cycle works end to end, and the grade is provably the same underlying record the core gradebook sees.

---

## Milestone 11: Teacher Portal — [x] COMPLETE

- [x] Teacher home dashboard: unified view of assigned classes, today's timetable, pending grading, recent messages — pulled from existing Core ERP/Learning Portal data, not duplicated
- [x] Messaging schema: threaded messages between teacher and parent/admin, `school_id`, read/unread status
- [x] Messaging UI: teacher can message a parent (via the existing guardian relationship from Milestone 1) or admin, and see reply threads
- [x] Fast bulk score/attendance entry UI (spreadsheet-like, whole class in one screen) if not already fully covered by earlier milestones
- [x] Confirm offline capability (attendance/grading) still holds inside this unified portal — no regression from the Milestone 2 guarantee
- [x] Automated test: teacher messages a parent linked to one of their real students; verify the message is correctly scoped to that school and that relationship, not accessible to unrelated parents

**Definition of Done:** A teacher can see their day, do bulk entry, and message a parent from one place — with messaging correctly scoped per-tenant and tied to a real guardian relationship, verified by test.

---

## Milestone 12: Parent Portal — [x] COMPLETE

- [x] Parent account linkage: login tied to existing guardian records from Milestone 1, supporting multiple children under one parent account
- [x] Parent dashboard: per-child attendance, grades, and report card downloads (reusing Milestone 5's PDF generation), switchable across multiple children
- [x] Minimal fee schema (ahead of a full future Finance module): fee structure per class/term, invoices, payments, outstanding balance calculation, `school_id`
- [x] Paystack integration for online fee payment, with the payment webhook — not the client-side response — as the source of truth for confirming payment
- [x] Installment plan support: a fee split into scheduled installments, with automated reminders as each due date approaches
- [x] Parent-side messaging inbox for threads started in Milestone 11, with reply capability
- [x] Announcements/events calendar, school-wide or class-specific, visible to relevant parents
- [x] WhatsApp/SMS-first notification channel (via Termii or Africa's Talking) for fee reminders, announcements, and messages — not in-app/email only
- [x] Automated test: create a fee with 3 installments, simulate one payment via a Paystack webhook call, verify the balance updates correctly and a reminder fires for the next unpaid installment; verify a parent with 2 children sees both correctly and only their own children's data

**Definition of Done:** A parent can log in, see accurate multi-child data, pay a fee installment with the webhook handled reliably (real money is involved here, this cannot be optimistic-UI-only), and receive reminders — all scoped correctly and verified by test.

---

## Milestone 13: Student Portal — [x] COMPLETE

- [x] Student account linkage: login tied to the existing student record from Milestone 1, ensuring every student can only access their own data within their `school_id`
- [x] Student dashboard: personalized overview displaying today's timetable, attendance summary, upcoming assignments, CBT exams, announcements, and recent academic performance
- [x] Timetable view: reuse Milestone 3 timetable data, presented in a mobile-friendly weekly schedule
- [x] Attendance history: display attendance records from Milestone 2 with daily, weekly, term, and yearly summaries
- [x] Academic results: display subject scores, Continuous Assessment (CA), examination scores, grades, rankings, and cumulative averages from Milestone 4
- [x] Report card downloads: reuse Milestone 5 PDF generation to allow students to download their own report cards
- [x] CBT integration: display available exams, completed exams, scores, corrections (where permitted), and examination history from Milestone 9
- [x] Learning Portal integration: display enrolled lessons, assignments, submission history, teacher feedback, and grades from Milestone 10
- [x] Announcements & calendar: display school announcements, class-specific notices, events, examination schedules, and assignment deadlines
- [x] Student profile management: allow updating profile photo, password, notification preferences, and limited personal information without compromising SIS records
- [x] Notification centre: display unread announcements, assignment reminders, CBT reminders, fee reminders, and teacher messages
- [x] Offline-first capability: previously viewed lessons, timetable, assignments, and announcements remain accessible when internet connectivity is unavailable
- [x] Automated test: create two schools, multiple students, and verify every student can access only their own academic records, lessons, CBT sessions, attendance, report cards, and announcements while remaining completely isolated from students belonging to another school

**Definition of Done:** A student can log in and securely access every academic resource relevant to them—including timetable, attendance, grades, CBT, LMS, announcements, and report cards—with complete tenant isolation proven by automated tests.

---

## Milestone 14: Library Management System — [x] COMPLETE

- [x] Library schema: books, categories, authors, publishers, ISBN, editions, copies, barcodes, shelves, borrowing history, reservations, fines, and `school_id`
- [x] Book catalogue management: librarians can create, edit, archive, and search books
- [x] Multiple copy management: support multiple physical copies of the same title while tracking each copy independently
- [x] Barcode support: automatically generate and print barcodes for book copies
- [x] Borrowing workflow: librarians issue books to students and staff while enforcing borrowing limits configured per school
- [x] Book returns: calculate overdue periods, fines, and automatically update inventory availability
- [x] Reservation system: students and teachers may reserve unavailable books and receive notifications when available
- [x] Fine management: configurable overdue fine rules stored per school rather than hardcoded
- [x] Search engine: fast searching by title, author, subject, ISBN, barcode, category, or keyword
- [x] Inventory auditing: identify missing books, damaged books, archived books, and total library stock
- [x] Reports: borrowing statistics, overdue reports, popular books, inactive books, outstanding fines, and inventory summaries
- [x] Automated test: borrow, renew, reserve, return, and fine calculation workflow executed across multiple schools proving complete tenant isolation and accurate inventory tracking

**Definition of Done:** Books can be catalogued, borrowed, reserved, renewed, returned, audited, and reported on accurately while maintaining complete inventory integrity and tenant isolation.

---

## Milestone 15: Hostel Management System — [x] COMPLETE

- [x] Hostel schema: hostels, blocks, rooms, beds, allocations, occupancy records, transfers, hostel staff, maintenance records, and `school_id`
- [x] Room allocation engine: allocate students to available beds while preventing over-allocation
- [x] Capacity enforcement: room and hostel capacities enforced at the service layer rather than only through UI validation
- [x] Hostel transfer workflow: transfer students between rooms or hostels while preserving allocation history
- [x] Occupancy dashboard: real-time occupancy statistics showing available beds, occupied beds, maintenance blocks, and reserved rooms
- [x] Hostel attendance integration: optional hostel roll-call linked with the attendance module
- [x] Hostel fee integration: connect hostel allocations with the Finance module for automatic hostel billing
- [x] Maintenance management: record damaged rooms, unavailable beds, repairs, inspections, and maintenance schedules
- [x] Student hostel profile: display hostel assignment, roommates, room details, and hostel rules
- [x] Reports: occupancy reports, vacancy reports, maintenance reports, allocation history, and hostel fee summaries
- [x] Automated test: allocate students until capacity is reached, verify over-allocation is rejected, perform transfers, verify occupancy statistics remain correct, and confirm tenant isolation across multiple schools

**Definition of Done:** Students can be allocated, transferred, tracked, and billed for hostel accommodation with strict capacity enforcement and complete historical integrity verified by automated testing.