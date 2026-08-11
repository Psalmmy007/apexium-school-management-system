# RUNBOOK.md — Apexium ERP Production Disaster Recovery Runbook

This runbook describes how to respond to production incidents, perform database restores, roll back deployments, and recover the system from failure states. It is written in plain English so that any team member can execute it.

---

## 1. System Overview

| Component | Technology | Hosting |
|---|---|---|
| Web Application | Next.js (App Router) | Vercel |
| Background Worker | Node.js + BullMQ | Configurable (Railway / Render / Fly.io) |
| Database | PostgreSQL | Supabase |
| Cache / Job Queue | Redis | Supabase / Upstash |
| File Storage | Cloudflare R2 | Cloudflare |
| Auth | Supabase Auth | Supabase |

---

## 2. How to Tell if Something is Wrong

**Step 1** — Check the health endpoint:

```
GET https://your-app.vercel.app/api/health
```

- HTTP `200` = healthy or degraded (check `status` field)
- HTTP `503` = system is down

**Step 2** — Check the Vercel dashboard at https://vercel.com/dashboard

**Step 3** — Check Supabase dashboard at https://supabase.com/dashboard

**Step 4** — Check the background worker logs in your worker hosting provider

---

## 3. Incident Response Procedure

### When an incident is detected:

1. **Create an incident** via the Apexium admin dashboard at `/dashboard/settings/operations` or directly via:
   ```
   POST /api/operations/incidents
   {
     "title": "Short description",
     "description": "What is failing and when it started",
     "severity": "critical | high | medium | low",
     "affectedSchoolIds": ["school-id-1"]
   }
   ```

2. **Enable maintenance mode** if the incident affects all users:
   ```
   POST /api/operations/maintenance
   {
     "action": "enable",
     "message": "We are aware of an issue and are working to resolve it. Expected resolution: 30 minutes.",
     "estimatedRestoreAt": "2026-08-10T21:00:00Z"
   }
   ```

3. **Investigate** using the full diagnostics endpoint:
   ```
   GET /api/operations/diagnostics
   ```

4. **Fix** the underlying problem (see sections below).

5. **Update the incident** with findings:
   ```
   PATCH /api/operations/incidents
   {
     "incidentId": "inc_...",
     "message": "Root cause identified. Fix deployed.",
     "status": "resolved"
   }
   ```

6. **Disable maintenance mode**:
   ```
   POST /api/operations/maintenance
   { "action": "disable" }
   ```

---

## 4. Database Restore Procedure

> **When to use this**: Database corruption, accidental bulk delete, data inconsistency.

### 4A. Point-in-Time Recovery (Supabase)

1. Go to **Supabase Dashboard → Your Project → Database → Backups**
2. Select the backup timestamp you want to restore to
3. Click **"Restore to this point"**
4. Supabase will create a new database instance — **do not use this as your main DB yet**
5. Connect the restored DB to a test app instance and verify data looks correct
6. If verified: update `DATABASE_URL` in Vercel environment and redeploy

**Note**: Pro plan includes 7-day PITR. Team/Enterprise includes 30-day PITR.

### 4B. Manual Schema-Only Restore

If only the schema (tables/indexes) is corrupted but data is intact:

```bash
# Re-run all Drizzle migrations
pnpm db:migrate
```

This is idempotent — it is safe to run on a database that already has the migrations applied.

---

## 5. Deployment Rollback Procedure

### Step 1 — Find the last good deployment

1. Go to **Vercel Dashboard → Your Project → Deployments**
2. Find the last deployment that was marked ✅ Ready before the issue started

### Step 2 — Instant rollback via Vercel UI

1. Click the last good deployment
2. Click **"Promote to Production"** (or **"Redeploy"**)
3. Vercel switches traffic instantly — no rebuild needed

### Step 3 — Rollback via Vercel CLI (if UI is unavailable)

```bash
vercel rollback [deployment-url] --token=$VERCEL_TOKEN
```

### Step 4 — Database consideration

If the new deployment introduced a migration that needs to be reversed:

1. Create an incident
2. Enable maintenance mode
3. Connect to Supabase SQL editor
4. Run the reverse SQL (check `DECISIONS.md` for migration intent)
5. Re-run `pnpm db:migrate` on the rolled-back code
6. Disable maintenance mode

> **Important**: Never drop or truncate a table. Always use additive migrations. If a column must be removed, add a migration that sets it as nullable and stops writing to it — remove it in a future cleanup migration.

---

## 6. Background Worker Recovery

> **When to use this**: BullMQ jobs are not processing, report cards are stuck, notifications not sending.

### Step 1 — Check worker status

Check your worker hosting provider (Railway / Render / Fly.io) dashboard. Look for:
- OOM killed (Out Of Memory)
- Crash loop (repeated restarts)
- Stalled jobs in queue

### Step 2 — Restart the worker

In your hosting provider dashboard, trigger a restart of the worker service.

Or if deploying manually:

```bash
cd apps/worker
pnpm build
node dist/index.js
```

### Step 3 — Clear stalled BullMQ jobs (if worker is stuck)

Connect to Redis and run:

```bash
redis-cli
> KEYS bull:*
> DEL bull:report-cards:stalled
```

> Do this carefully — only delete `stalled` keys, not active or waiting queues.

### Step 4 — Verify recovery

After restart, trigger a test report card generation for a single student and verify the job completes within 60 seconds.

---

## 7. Automated Backup Verification

The GitHub Actions workflow `.github/workflows/backup-verify.yml` runs every day at **02:00 UTC** and:

1. Connects to the live database
2. Verifies all critical tables exist (migration integrity check)
3. Counts schools and students records for a sanity baseline
4. Outputs a verification report in the workflow logs

To run it manually:
- Go to **GitHub → Actions → Backup & Restore Verification → Run workflow**

---

## 8. Maintenance Mode

Maintenance mode displays a system-wide banner and blocks new operations.

**Enable** (via admin dashboard at `/dashboard/settings/operations`):
```
POST /api/operations/maintenance
{ "action": "enable", "message": "Scheduled maintenance 02:00–03:00 UTC", "estimatedRestoreAt": "2026-08-10T03:00:00Z" }
```

**Check status** (publicly readable):
```
GET /api/operations/maintenance
```

**Disable**:
```
POST /api/operations/maintenance
{ "action": "disable" }
```

> Maintenance mode automatically resets on the next application deploy (intentional — prevents it being left on accidentally).

---

## 9. Key Environment Variables Reference

| Variable | Purpose | Where to find it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard → Settings → Database |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API |
| `REDIS_URL` | Redis connection URL | Upstash / your Redis provider |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Paystack Dashboard → Settings → API |
| `SENTRY_DSN` | Error monitoring DSN | Sentry Dashboard → Project → Settings |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Your Vercel domain |

---

## 10. Contacts & Escalation

> Fill in this section with your actual team contact information.

| Role | Contact | When to call |
|---|---|---|
| Platform Engineer | engineer@apexium.io | Database, infrastructure, deployments |
| Support Lead | support@apexium.io | School-reported data issues |
| Payments Owner | payments@apexium.io | Paystack webhook failures, billing issues |

---

## 11. Post-Incident Report Template

After resolving any High or Critical incident, write a brief post-incident report and add it to `INCIDENTS.md`:

```markdown
## Incident [DATE]: [TITLE]

- Severity: [Critical / High / Medium / Low]
- Duration: [how long it lasted]
- Schools affected: [list or "none"]

### What happened
[1-2 sentences]

### Root cause
[1 sentence]

### How it was fixed
[steps taken]

### What we changed to prevent recurrence
[preventive measures]
```

---

*Last updated: August 2026 — Milestone 27: Deployment, Monitoring & Operations*
