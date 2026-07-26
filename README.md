# Apexium School ERP

A multi-tenant school management system. Handles students, attendance, timetables, grades, and report cards.

## Project Structure

```
.
├── apps/
│   ├── web/          # Next.js 14 App Router (frontend + API routes)
│   └── worker/       # Node.js background job worker (BullMQ + Redis)
├── packages/
│   ├── db/           # Drizzle ORM schema and database client
│   └── types/        # Shared TypeScript types
├── .github/
│   └── workflows/    # GitHub Actions CI
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

## Prerequisites

- Node.js 18+
- pnpm 9+ (`npm install -g pnpm`)
- Docker Desktop (for local Postgres + Redis)
- A Supabase project (free tier is fine)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd "Apexium School Management System"
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` (public) key
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` (secret) key
- `DATABASE_URL` — the direct Postgres connection string

All of these are on your [Supabase dashboard](https://app.supabase.com) under:
**Project Settings → API** (for URL and keys)
**Project Settings → Database** (for the connection string)

### 3. Start local services

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start the development server

```bash
pnpm dev
```

App is available at http://localhost:3000

## Running Tests

```bash
# Unit tests
pnpm test

# E2E tests (requires the app to be running and Supabase credentials)
pnpm test:e2e
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Auth | Supabase Auth |
| Background jobs | BullMQ + Redis |
| Offline support | RxDB + IndexedDB |
| Testing | Vitest (unit), Playwright (E2E) |
| Monorepo | pnpm workspaces |

## CI/CD

GitHub Actions runs lint, type-check, and tests on every push. Merging to `main` is blocked until all checks pass.
