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

## Milestone 16: Student Information System (SIS) Production Hardening — [x] COMPLETE

- [x] Student registration redesign: replace the current single-page registration form with a guided multi-step admission wizard
- [x] Passport upload: implement secure passport photo upload via `/api/upload/passport` with image validation, preview, replacement, and URL-based storage
- [x] Reusable guardians: introduce dedicated `guardians` and `student_guardians` tables so one guardian can be linked to multiple students while preserving relationship types (Father, Mother, Sponsor, Legal Guardian)
- [x] Guardian search: allow searching existing guardians by phone number, email, or name before creating new guardian records to eliminate duplicate parent records
- [x] Extended student biodata: capture admission date, nationality, state of origin, LGA, religion, blood group, genotype, previous school, medical conditions, allergies, emergency contacts, and other production-grade SIS fields
- [x] Student document management: upload and manage admission documents including passport photographs, birth certificates, transfer letters, previous academic records, and medical reports
- [x] Academic Structure module: implement Academic Sections, Classes, Arms/Streams, Class Teachers, display ordering, capacity management, archive, and restore functionality
- [x] Academic assignment: assign students to Sections, Classes, and Arms using the Academic Structure module with capacity validation
- [x] Student profile page: build a comprehensive profile displaying passport, biodata, academic assignment, attendance, academic performance, guardian information, hostel assignment, and uploaded documents
- [x] Student status management: support Active, Suspended, Withdrawn, Graduated, Alumni, and Expelled statuses while maintaining complete historical records
- [x] Student activity timeline: maintain an audit history for admissions, transfers, promotions, guardian updates, document uploads, hostel allocations, and status changes
- [x] Admission number generation: configurable admission number formats with automatic sequential generation for each school
- [x] Duplicate detection: prevent duplicate admissions by checking admission numbers, guardian information, student biodata, and configurable matching rules
- [x] First-Time School Setup Wizard: create a guided setup process covering school profile, academic session, terms, academic structure, subjects, and administrator configuration with a one-click Nigerian K–12 template
- [x] Contextual empty states: replace empty tables, dropdowns, and dashboards with reusable empty-state components containing clear descriptions and direct action buttons
- [x] Dashboard layout hardening: eliminate duplicate rendering, sidebar height inconsistencies, scrolling glitches, viewport issues, and white-space layout bugs across all dashboards
- [x] Performance optimisation: optimise student management pages using pagination, search, filtering, lazy loading, and efficient data fetching
- [x] Offline support: ensure previously viewed student records, academic structure, and profile information remain accessible through the existing offline architecture
- [x] Automated integration test: create multiple schools with hundreds of students, reusable guardians, academic structures, uploaded documents, and profile updates while verifying admission workflow, duplicate prevention, status transitions, school setup, document management, tenant isolation, and complete production readiness

**Definition of Done:** Apexium provides a fully production-ready Student Information System featuring enterprise-grade admissions, guardian management, academic structure, document management, profile management, school onboarding, operational hardening, and complete tenant isolation verified through comprehensive automated integration tests.

---

## Milestone 16.1: Enterprise SIS Hardening (Production Ready) — [x] COMPLETE

- [x] Enterprise Admission Number Generator: atomic sequence generator (`admission_sequences`) using row-level atomic SQL increment (`SET current_number = current_number + 1 RETURNING current_number`), preventing duplicate admission numbers under heavy parallel registrations with per-school configurable templates (e.g. `APS/2026/000001`, `SCH001-26-0001`, `JSS-2026-105`)
- [x] Non-Destructive Student Merge Engine: merges duplicate student records without data loss by marking the source student `isReadOnly = true`, `status = 'inactive'`, and `mergedIntoId = targetStudentId`, while atomically re-linking all 9+ child entities (attendance, scores, fee invoices, documents, guardians, hostel allocations, CBT sessions, LMS submissions, library loans) and logging audit timeline events to both records
- [x] Enterprise Search & Scaling: multi-field server-side search across name, admission number, roll number, status, class, and section, backed by composite database indexes (`idx_students_status_class_section`, `idx_students_name_dob`) optimized for 100k+ student scale
- [x] Upload Security Hardening: magic-number buffer inspection (verifying real binary headers for JPEG, PNG, PDF, WEBP, DOCX), dangerous executable extension blocklist, SHA-256 content hashing (`fileHash`), and filename sanitization across passport & document upload routes
- [x] Document Soft-Delete & Restore Engine: soft-delete support (`isDeleted`, `deletedAt`, `deletedBy`, `deleteReason`) preserving underlying storage files, complete with user resolution (`deletedByUserName`), audit logging, and single-click document restoration API & UI
- [x] Printable Student ID Cards: structured payload API (`/api/students/[id]/id-card`) and client modal with embedded QR code verification payload, barcode representation data, passport photo, and official school branding
- [x] Enterprise RBAC Matrix: centralized backend authorization module (`canPerformAction`) enforcing role-based permissions across all SIS endpoints (`superadmin`, `admin`, `teacher`, `parent`, `student`) with strict tenant isolation
- [x] Bulk Operations Engine: transactional execution for bulk promotion, class assignment, suspension, restoration, archiving, and CSV export, featuring `dryRun=true` preview mode returning affected counts, eligible lists, and conflict warnings
- [x] Extended Activity Timeline: comprehensive audit trail capturing class changes, stream changes, guardian links, document uploads/soft-deletions/restorations, merge operations, and status transitions
- [x] Enterprise Testing & Verification: 85 Vitest integration tests, Playwright E2E suite, `tsc --noEmit` validation, zero-error production build (`pnpm --filter @apexium/web build`), live migration, and OpenAPI 3.0 documentation JSON (`/api/docs/sis`)

**Definition of Done:** All 10 requirements of Milestone 16.1 are fully implemented, backward-compatible, hardened, and verified with 85/85 passing integration tests, zero TypeScript errors, zero production build errors, and complete tenant isolation.

---

## Milestone 17: Transport Management System — [x] COMPLETE

- [x] Transport schema: vehicles, drivers, routes, route stops, transport assignments, daily trips, transport attendance, maintenance records, fuel logs, transport fee plans, and `school_id`
- [x] Vehicle management: administrators can create, edit, archive, and manage school buses and transport vehicles including registration numbers, capacities, insurance, inspection dates, and operational status
- [x] Driver management: maintain driver and transport staff records including licence information, contact details, employment status, assigned vehicles, and assignment history
- [x] Route management: create transport routes with pickup points, drop-off points, stop sequences, estimated arrival times, and assigned vehicles
- [x] Student transport allocation: assign students to transport routes while enforcing vehicle capacity limits and preventing duplicate route assignments
- [x] Daily transport operations: record departure times, arrival times, trip status, assigned drivers, and route completion history
- [x] Transport attendance: record students boarding and alighting vehicles for every trip with complete attendance history
- [x] Parent Portal integration: allow parents to view transport routes, pickup times, assigned vehicles, and transport status from Milestone 12
- [x] Finance integration: connect transport subscriptions and transport fees with the Finance module for automated billing and payment tracking
- [x] Vehicle maintenance: schedule servicing, inspections, repairs, insurance renewals, and automatically flag overdue maintenance activities
- [x] Reports: transport allocation reports, vehicle utilisation reports, transport attendance reports, maintenance reports, fuel consumption reports, and transport fee summaries
- [x] Automated test: create two schools, multiple vehicles, drivers, routes, and transport assignments while verifying vehicle capacity enforcement, transport attendance, maintenance scheduling, fee integration, and complete tenant isolation

**Definition of Done:** Schools can manage vehicles, routes, drivers, transport assignments, attendance, maintenance, and transport billing with complete tenant isolation and automated verification across multiple schools.

---

## Milestone 18: Human Resources & Payroll — [x] COMPLETE

- [x] Human Resources schema: employees, departments, positions, salary structures, payroll records, allowances, deductions, leave requests, employment history, contracts, tax records, pension records, and `school_id`
- [x] Employee management: administrators can create, edit, archive, and manage teaching and non-teaching staff records with complete employment history
- [x] Department management: organise staff into departments, positions, reporting structures, and employment categories
- [x] Leave management: staff can submit leave requests while administrators approve, reject, and track annual leave, sick leave, maternity leave, study leave, and unpaid leave
- [x] Salary structure management: configure salary grades, allowances, bonuses, deductions, taxes, pensions, and statutory contributions per school
- [x] Payroll processing: generate monthly payroll automatically using salary structures, attendance records, approved leave, allowances, and deductions
- [x] Staff attendance integration: reuse staff attendance records from Milestone 2 when calculating payroll and attendance summaries
- [x] Payslip generation: generate downloadable PDF payslips showing complete salary breakdowns, deductions, taxes, and net salary
- [x] Employee self-service: staff can securely access their profiles, attendance summaries, leave balances, payroll history, and payslips
- [x] Reports: payroll summaries, departmental salary reports, leave reports, attendance reports, tax reports, pension reports, and employee statistics
- [x] Audit logging: record every payroll generation, salary adjustment, leave approval, and employment change with immutable audit history
- [x] Automated test: create two schools with multiple employees, process payroll, approve leave requests, generate payslips, verify attendance integration, and confirm complete tenant isolation

**Definition of Done:** Schools can manage employees, leave, payroll, statutory deductions, and staff self-service while maintaining complete payroll accuracy and tenant isolation verified through automated tests.

---

## Milestone 19: Finance & Accounting — [x] COMPLETE

- [x] Finance schema: chart of accounts, journal entries, ledgers, invoices, receipts, expenses, bank accounts, budgets, vendors, assets, liabilities, audit logs, and `school_id`
- [x] Chart of accounts: administrators can configure accounting structures suitable for each school's financial requirements
- [x] Double-entry accounting engine: every financial transaction automatically creates balanced debit and credit journal entries
- [x] General ledger: maintain complete accounting records with immutable financial history and audit trails
- [x] Revenue management: consolidate school fees, hostel fees, transport fees, library fines, and all other income into a unified accounting system
- [x] Expense management: record operational expenses, vendor payments, purchase approvals, and expense categories
- [x] Budget management: create annual and departmental budgets while monitoring expenditure against approved budgets
- [x] Bank reconciliation: reconcile bank transactions, cash balances, transfers, deposits, and withdrawals
- [x] Financial statements: generate trial balance, income statement, balance sheet, cash flow statement, and general ledger reports
- [x] Dashboard analytics: display revenue trends, expenditure trends, outstanding receivables, budget utilisation, and financial performance indicators
- [x] Audit logging: record every accounting transaction, financial adjustment, approval, and reconciliation with complete historical integrity
- [x] Automated test: create two schools, process income and expense transactions, verify balanced journal entries, generate financial statements, confirm audit integrity, and prove complete tenant isolation

**Definition of Done:** Schools can operate a complete double-entry accounting system with accurate financial reporting, audit trails, and seamless integration with every revenue-generating module while maintaining complete tenant isolation.

---

## Milestone 20: Communication & Notification Centre — [x] COMPLETE

- [x] Communication schema: announcements, notification templates, email queue, SMS queue, push notifications, recipients, delivery logs, notification preferences, schedules, and `school_id`
- [x] Notification engine: provide a unified communication system supporting in-app notifications, email, SMS, and push notifications
- [x] Announcement management: administrators can publish school-wide, class-specific, department-specific, teacher, parent, and student announcements
- [x] Notification templates: configurable templates supporting placeholders for names, classes, fees, examinations, attendance, assignments, and report cards
- [x] Scheduled notifications: automatically send reminders for school fees, assignments, examinations, attendance, library returns, hostel payments, and transport subscriptions
- [x] Parent communication integration: integrate notifications with the Parent Portal developed in Milestone 12
- [x] Student communication integration: integrate notifications with the Student Portal developed in Milestone 13
- [x] Teacher communication integration: integrate notifications with the Teacher Portal developed in Milestone 11
- [x] User notification preferences: allow every user to configure preferred notification channels and notification categories
- [x] Delivery tracking: monitor queued, delivered, failed, read, and pending notifications across every communication channel
- [x] Reports: communication history, delivery statistics, failed notifications, engagement summaries, and notification analytics
- [x] Automated test: create two schools, send announcements through every communication channel, verify scheduled reminders, delivery tracking, user preferences, and complete tenant isolation

**Definition of Done:** Schools can communicate with students, parents, teachers, and staff through a unified notification platform supporting multiple delivery channels, scheduling, delivery tracking, and complete tenant isolation.

---

## Milestone 21: Analytics & Executive Dashboard — [x] COMPLETE

- [x] Analytics schema: dashboard widgets, KPI snapshots, trend history, cached reports, predictive indicators, executive summaries, and `school_id`
- [x] Executive dashboard: display institution-wide KPIs covering enrolment, attendance, academics, finance, staffing, hostel occupancy, transport operations, and library utilisation
- [x] Academic analytics: analyse examination performance, subject performance, teacher effectiveness, class rankings, student progress, and historical academic trends
- [x] Attendance analytics: identify absenteeism trends, punctuality statistics, attendance percentages, and department-level attendance performance
- [x] Financial analytics: display revenue trends, expenditure trends, outstanding school fees, budget performance, and financial growth indicators
- [x] Operational analytics: analyse hostel occupancy, transport utilisation, library borrowing activity, CBT participation, LMS engagement, and overall ERP usage
- [x] Predictive analytics: identify students at academic risk, attendance risk, fee default risk, and examination risk using configurable scoring rules
- [x] Interactive dashboards: allow filtering by session, term, class, department, teacher, student, and date range
- [x] Export capabilities: export dashboards, reports, charts, and analytics to PDF, Excel, and CSV formats
- [x] Performance optimisation: cache dashboard queries and generate large analytical reports in the background without affecting system responsiveness
- [x] Audit analytics: display system activity logs, user actions, security events, and operational metrics for administrators
- [x] Automated test: create two schools with representative academic, financial, and operational data, verify KPI accuracy, report exports, dashboard performance, caching behaviour, and complete tenant isolation

**Definition of Done:** School administrators can monitor every operational, academic, and financial aspect of their institution through real-time executive dashboards, predictive analytics, and exportable reports with complete tenant isolation verified through automated tests.

---

## Milestone 22: School Onboarding, Setup Wizard & ERP Activation — [x] COMPLETE

- [x] Schema wiring: complete existing schema for schools, users, roles, permissions, sessions, terms, classes, departments, and settings with `school_id`
- [x] Setup service (`services/setup.ts`): implement school creation, tenant provisioning, first administrator creation, profile completion, academic session, term, class setup, default roles & permissions, and dashboard activation
- [x] Onboarding Wizard: complete multi-step wizard UI covering Welcome, School Information, Academic Session, Terms, Classes, Departments, Review, and Finish
- [x] ERP Module Activation: automatically unlock Admissions, Students, Teachers, Finance, Hostel, Library, Transport, HR, CBT, LMS, Communication, and Analytics upon wizard completion
- [x] Demo Mode Improvements: enable fully usable ERP functionality for demo login (creating schools, students, teachers, admissions, fees, hostel, transport, HR, library)
- [x] Automated test: create a new school, complete setup wizard, create first administrator, add classes & students, verify module activation, and complete tenant isolation

**Definition of Done:** A newly registered school can complete onboarding and immediately begin operating the ERP without developer intervention.

---

## Milestone 23: Security, Authentication & Permission Hardening — [x] COMPLETE

- [x] Security schema & RBAC audit: permission inheritance, login history, active device tracking, security audit logs, IP logging, and failed login throttling
- [x] Session & Auth hardening: refresh token rotation, password reset workflows, email verification, optional MFA, and session expiration enforcement
- [x] Threat prevention: account lockout, CSRF hardening, security headers, API rate limiting, authorization audit, and RLS verification
- [x] Automated test: execute permission tests, API authorization checks, multi-tenant security verification, password reset flows, and cross-tenant penetration tests

**Definition of Done:** Every endpoint is permission-protected and tenant-safe.

---

## Milestone 24: Production UX, Workflow Completion & Module Integration — [x] COMPLETE

- [x] Complete missing CRUD & workflows: finish end-to-end workflows across Admissions, Students, Teachers, Parents, Finance, Library, Hostel, Transport, HR, Communication, Analytics, CBT, and LMS
- [x] UX & Navigation polish: unified breadcrumbs, global search, multi-column filters, bulk actions, import/export dialogs, toast notifications, dashboard widgets, empty states, skeleton loading states, error boundaries, and responsive mobile layouts
- [x] Automated test: verify that every core ERP workflow can be completed entirely through the UI without missing steps or placeholder pages

**Definition of Done:** No module contains placeholder pages or incomplete workflows.

---

## Milestone 25: Integrations & Automation Platform — [x] COMPLETE

- [x] Payment & Communication gateways: integrate Paystack, email provider (SMTP/Resend), SMS gateway, push notifications, WhatsApp integration, and cloud storage
- [x] Automation engine: calendar exports, webhooks dispatch, background BullMQ worker jobs, scheduled cron tasks, automated payment & assignment reminders, and scheduled analytical report generation
- [x] Automated test: end-to-end integration tests verifying payment webhooks, background jobs, external notifications, and scheduled triggers

**Definition of Done:** External communication and payment workflows are fully automated.

---

## Milestone 26: Performance, Scalability & Reliability — [x] COMPLETE

- [x] Database & Query optimization: composite indexing, query plan tuning, dynamic caching, cursor pagination, and lazy loading
- [x] Asset & Worker optimization: BullMQ queue concurrency tuning, image compression, Next.js bundle optimization, SSR streaming, and memory leak profiling
- [x] Benchmarks & Stress testing: run concurrent load tests and stress testing up to 10,000 active users with monitored latency, throughput, and zero crashes
- [x] Automated test: automated performance benchmarks verifying sub-200ms API responses, 99.9% uptime under load, and zero memory leaks

**Definition of Done:** The platform performs reliably under production workloads.

---

## Milestone 27: Deployment, Monitoring & Operations — [x] COMPLETE

- [x] Production pipeline & tooling: CI/CD deployment pipeline, environment variable validation, automated database migrations, automated backup schedules, and restore testing scripts
- [x] Health & Incident management: uptime monitoring, Sentry error monitoring, administrative audit dashboards, incident logging, maintenance mode toggles, disaster recovery runbooks, and production diagnostics
- [x] Automated test: simulated production deployment, migration rollback test, backup-restore verification, and operational recovery simulation

**Definition of Done:** Apexium can be deployed, monitored, maintained, and recovered safely in production.

---

## Milestone 28: Multi-Tenant SaaS Platform, School Onboarding & Termly Subscription Management — [x] COMPLETE

- [x] SaaS schema: `saasSchools`, `saasSchoolDomains`, `saasSchoolSubscriptions`, `saasSubscriptionPlans`, `saasSubscriptionPayments`, `saasSchoolMemberships`, `saasOnboardingSessions`, `saasAuditLogs` — all with `school_id` where applicable, unique constraints on slug/domain/reference
- [x] Tenant resolution service (`services/tenant.ts`): `resolveTenantFromHostname`, `resolveTenantFromSchoolSlug`, `getAuthenticatedTenant`, `assertTenantMembership`, `assertTenantAccess`, `getTenantContext`, `getTenantStatus`, `isTenantActive` — server-side only, never client-supplied school_id
- [x] School onboarding service (`services/school-onboarding.ts`): `registerSchool`, `createSchoolAdministrator`, `createSchoolMembership`, `generateSchoolSlug`, `initializeSchoolTenant`, `getOnboardingStatus`, `completeOnboardingStep`, `resumeOnboarding`, `completeSchoolOnboarding` — real tenant creation, no fake seeded data
- [x] Subscriptions service (`services/subscriptions.ts`): `getSubscriptionPlans`, `createSubscription`, `getSchoolSubscription`, `getSubscriptionStatus`, `isSubscriptionActive`, `startSubscriptionPayment`, `confirmSubscriptionPayment`, `renewSubscription`, `expireSubscription`, `cancelSubscription`, `getSubscriptionHistory` — termly billing period
- [x] Payments service (`services/payments.ts`): `initializeSubscriptionPayment`, `verifySubscriptionPayment`, `processSubscriptionWebhook`, `recordSuccessfulPayment`, `recordFailedPayment` — Paystack integration, idempotent webhook processing
- [x] Public SaaS routes: `/register` (school registration), `/pricing` (plans from DB, not hardcoded), `/subscribe` (plan selection + payment), `/onboarding` (resumeable), `/onboarding/payment` (retry-safe payment)
- [x] API routes: `/api/saas/register`, `/api/saas/plans`, `/api/saas/subscription` (GET/POST), `/api/saas/subscription/payment`, `/api/saas/subscription/verify`, `/api/saas/subscription/renew`, `/api/saas/onboarding` (GET/POST), `/api/saas/domain`, `/api/webhooks/paystack/subscription`
- [x] Tenant-aware middleware: resolve school from hostname (`{slug}.APEXIUM_BASE_DOMAIN`), block cross-tenant access, enforce membership, enforce subscription status
- [x] School subdomain routing: `schoola.apexium.example` → school_id = School A; configurable `APEXIUM_BASE_DOMAIN` env var; reserved slug blocklist (www, admin, api, app, login, register, pricing, dashboard)
- [x] Role-based tenant routes: `{slug}/admin`, `{slug}/teacher`, `{slug}/parent`, `{slug}/student`, `{slug}/staff` — reusing existing portal implementations
- [x] Existing Setup Wizard integration: registration → tenant → admin → plan → payment → subdomain → login → Setup Wizard → ERP dashboard
- [x] Platform admin area (`/platform`): registered schools, subscription status, onboarding progress, domains, active users, platform-level audit events — isolated from school ERP data
- [x] Subscription enforcement middleware: active → full ERP access; payment pending → resume payment; expired → `/subscription/renew` with data preserved; suspended → blocked
- [x] Existing licensing centre audit: remove or migrate license keys, license expiry, license-specific routes/tables into subscription architecture without breaking unrelated ERP functionality
- [x] School branding: tenant-specific logo, name, contact info, portal identity — School A never sees School B's branding
- [x] Communication integration: subscription payment success/failure/expiring/expired notifications via Milestone 20 Communication Centre — tenant-scoped
- [x] Demo accounts: demo users belong to a real demo school tenant using the same auth, tenant resolution, subscription checks, and routing — no special bypass
- [x] DDL migration (`m28-saas-migrate.ts`): idempotent script for all SaaS tables, unique constraints, and composite tenant indexes
- [x] Automated tests: `tenant.test.ts` (hostname resolution, cross-tenant rejection, membership enforcement, suspended school blocking), `school-onboarding.test.ts` (School A + School B end-to-end registration), `subscriptions.test.ts` (active/pending/expired/renewal/cancellation/idempotent webhook), `saas.integration.test.ts` (multi-school full journey with deliberate cross-tenant attack tests)

**Definition of Done:** Multiple independent schools can register on Apexium, receive a unique tenant and subdomain, complete termly Paystack payment, pass through the Setup Wizard, and operate the full ERP — with School A and School B completely isolated in every module, proven by automated integration tests. No school can access another school's data through any mechanism including URL manipulation, client-supplied IDs, or API parameter injection.

---

## Milestone 29: SaaS Subscription & Billing Platform — [x] COMPLETE

- [x] Subscription & Tiering schema: subscription plans, school subscriptions, term-based billing, invoices, payment history, feature entitlements, and coupon support
- [x] Paystack Billing Automation: automated recurring subscription charges, Paystack webhooks processing, invoice generation, renewal workflows, and grace period handling
- [x] Entitlements & Enforcement: feature access enforcement based on active subscription, usage tracking, automatic suspension after grace period expiry, and upgrade/downgrade workflows
- [x] Subscription Analytics: SaaS metrics dashboard covering Monthly/Term Recurring Revenue (MRR/TRR), churn rate, active school subscriptions, and billing reports
- [x] Automated test: subscribe school, renew subscription, verify invoice generation, test Paystack webhooks, test grace period & suspension, and confirm multi-tenant isolation

**Definition of Done:** Schools subscribe to Apexium on a recurring term basis, payments are automated through Paystack, feature access is governed by active subscriptions, and billing is fully integrated into the platform.


---

## Milestone 30: Inventory Management — [x] COMPLETE

- [x] Inventory schema: `inventory_items`, `inventory_transactions` (in/out), `suppliers`, `purchase_orders`, `asset_register` (with depreciation fields), all `school_id`-scoped
- [x] Stock & Alert workflows: stock in/out logging, configurable low-stock alerts wired into the Communication module (Milestone 20)
- [x] Financial integration: purchase orders linked to Finance (Milestone 19) as expenses, depreciation tracking feeding the balance sheet in Finance
- [x] Fixed Asset Tracking: Barcode/QR tagging for fixed assets, quick scan-to-lookup for audits
- [x] Automated test: verify low-stock alerts fire at the right threshold and depreciation math matches a hand-verified example, across two schools

**Definition of Done:** Stock and fixed assets are tracked and correctly valued over time, integrated with Finance, and completely tenant-isolated.


---

## Milestone 31: Data Portability & Self-Service Export — [x] COMPLETE

- [x] Data Portability Engine: school admin can request a full export of their own data (students, scores, attendance, finance, staff) as CSV/Excel
- [x] Asynchronous Execution: runs as a background BullMQ worker job, not inline, to handle real production data volume without timing out
- [x] Automated test: verify an export for School A contains only School A's data, and completes even for a large school without timing out

**Definition of Done:** A school can independently pull a complete copy of its own data anytime — proven correctly scoped and reliable at real volume.


---

## Milestone 32: Multi-Branch / School Group Support — [x] COMPLETE

- [x] Multi-Branch Architecture: `school_groups` owning multiple branch schools, each branch keeping full data isolation from every other branch
- [x] Subscription Extension: Milestone 28 subscription architecture extended so one subscription covers a whole group
- [x] Group RBAC Roles: a group-admin role sees aggregated data across branches; branch staff never see outside their own branch
- [x] Automated test: verify a branch admin is confined to their branch and a group admin sees aggregate data, with no ordinary role ever crossing branch lines

**Definition of Done:** A school group can run several campuses from one account with tested, correct visibility boundaries.


---

## Milestone 33: Data Privacy & NDPR Compliance — [x] COMPLETE

- [x] Privacy & Retention schema: consent/legal-basis tracking per data category, configurable retention periods, scheduled flagging of records past retention
- [x] Data Subject Rights Workflow: a right-to-access / right-to-deletion request workflow, routed to the school admin for review — not auto-executed
- [x] Sensitive Field Protection: verify sensitive fields (medical, allergies, financial/payroll) are role-restricted, not visible to every staff member by default
- [x] Automated test: access requests, retention enforcement, and sensitive-field restriction all provably work across multi-tenant tests

**Definition of Done:** Access requests, retention, and sensitive-field restriction all provably work, ensuring regulatory compliance and competitive trust signals.

---

## Milestone 34: Public Admissions & Enrollment Intake — [x] COMPLETE

- [x] Public Application Portal: a no-login, school-branded public application form for prospective parents
- [x] Admissions Intake Review Workflow: admin review workflow (accept / reject / waitlist)
- [x] Automated Conversion to SIS: accepted applications convert directly into a real SIS student + guardian record with zero duplicate data entry
- [x] Payment Gateway Integration: optional application fee collection via Paystack, reusing the Milestone 12 pattern
- [x] Automated test: prospective parent applies online, payment processes, admin accepts, and student record is created and populated without manual re-entry

**Definition of Done:** A parent can apply entirely online, and acceptance produces a correctly populated student record with zero manual re-entry.

---

## Milestone 35: Public Marketing Landing Page — [x] COMPLETE

- [x] Value proposition content: a clear headline stating what Apexium is and who it's for, plus a subheadline naming concrete differentiators — offline-first (works without reliable internet/power), WAEC/NECO-aligned grading, transparent published pricing in Naira, and free data export with no lock-in
- [x] Role-based entry points: the page must branch clearly by who's visiting — a school owner/admin registering their school, a teacher/parent/student signing into a school that already uses Apexium — as distinct, clearly labeled paths, not one generic "Sign In" button that leaves the visitor guessing
- [x] Product proof section: real screenshots of the actual built product (Core ERP dashboard, Parent Portal, a report card) — not stock photography or decorative icons standing in for the product
- [x] Feature highlights: a concrete section naming the actual differentiators from Apexium's research and build — not generic SaaS marketing copy that could describe any product
- [x] Visible pricing: pricing tiers shown directly on or one click from the landing page (linking to the existing `/pricing` route), never hidden behind "contact us"
- [x] Single dominant primary call-to-action: one visually dominant action for a first-time visitor (e.g. "Register Your School"), with every other action (pricing, sign-in) styled as clearly secondary — not three equal-weight buttons competing for attention
- [x] Testimonial/social-proof section: a structural placeholder for school testimonials and logos, safe to leave empty or generic until real pilot schools exist, without needing a redesign later
- [x] **Security fix: remove the "SaaS Platform Operator Dashboard" link entirely from the public landing page.** Move superadmin access to a separate, unlisted URL (e.g. its own subdomain) that is never linked from any public marketing page and is not discoverable by browsing the site
- [x] Mobile-first responsive review: most real visitors will land on this page from a phone on mobile data — verify layout, load time, and readability on a small screen and slower connection specifically, not just desktop
- [x] Automated test: verify the superadmin route returns no link/reference anywhere in the public-facing marketing pages' rendered HTML, and verify each role-based call-to-action routes to the correct signup or login flow

**Definition of Done:** A first-time visitor immediately understands what Apexium is, who it's for, and can find the correct entry point for their role without confusion — and no internal or superadmin routes are discoverable from the public site, verified by test.