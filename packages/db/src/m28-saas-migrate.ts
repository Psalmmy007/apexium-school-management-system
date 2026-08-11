/**
 * Milestone 28 — SaaS Multi-Tenant Schema Migration
 *
 * Creates all SaaS tables required for multi-school onboarding,
 * subscriptions, and tenant isolation.
 *
 * IDEMPOTENT: Safe to run multiple times. Uses IF NOT EXISTS throughout.
 */
import { db } from "./client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("🚀 Running Milestone 28 SaaS Migration...");

  // ── Enums ──────────────────────────────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE saas_school_status AS ENUM ('active', 'suspended', 'cancelled', 'pending');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE saas_onboarding_status AS ENUM (
        'STARTED', 'SCHOOL_CREATED', 'ADMIN_CREATED', 'SUBSCRIPTION_PENDING',
        'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'SETUP_IN_PROGRESS', 'COMPLETED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE saas_subscription_status AS ENUM (
        'active', 'pending_payment', 'expired', 'cancelled', 'payment_failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE saas_membership_status AS ENUM ('active', 'inactive', 'suspended');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE saas_membership_role AS ENUM (
        'admin', 'teacher', 'parent', 'student', 'staff', 'platform_admin'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  // ── saas_subscription_plans ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_subscription_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      termly_price DOUBLE PRECISION NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      features JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_plans_active ON saas_subscription_plans(is_active);
  `);

  // ── saas_school_memberships ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_school_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      role saas_membership_role NOT NULL,
      status saas_membership_status NOT NULL DEFAULT 'active',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_membership_user_school
      ON saas_school_memberships(user_id, school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_membership_school ON saas_school_memberships(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_membership_user ON saas_school_memberships(user_id);
  `);

  // ── saas_school_domains ────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_school_domains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      domain VARCHAR(255) NOT NULL UNIQUE,
      domain_type VARCHAR(30) NOT NULL DEFAULT 'subdomain',
      is_primary BOOLEAN NOT NULL DEFAULT TRUE,
      is_verified BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_domain_lookup ON saas_school_domains(domain);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_domain_school ON saas_school_domains(school_id);
  `);

  // ── saas_school_subscriptions ──────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_school_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES saas_subscription_plans(id),
      status saas_subscription_status NOT NULL DEFAULT 'pending_payment',
      billing_period VARCHAR(20) NOT NULL DEFAULT 'TERM',
      amount DOUBLE PRECISION NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      payment_reference VARCHAR(255) UNIQUE,
      paystack_reference VARCHAR(255) UNIQUE,
      last_payment_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_subscription_school ON saas_school_subscriptions(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_subscription_status ON saas_school_subscriptions(status);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_subscription_expiry ON saas_school_subscriptions(ends_at);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_subscription_paystack_ref
      ON saas_school_subscriptions(paystack_reference);
  `);

  // ── saas_subscription_payments ─────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_subscription_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      subscription_id UUID NOT NULL REFERENCES saas_school_subscriptions(id),
      provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
      reference VARCHAR(255) NOT NULL UNIQUE,
      paystack_reference VARCHAR(255),
      amount DOUBLE PRECISION NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      channel VARCHAR(50),
      paid_at TIMESTAMPTZ,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_payment_ref ON saas_subscription_payments(reference);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_payment_school ON saas_subscription_payments(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_payment_subscription
      ON saas_subscription_payments(subscription_id);
  `);

  // ── saas_onboarding_sessions ───────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_onboarding_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
      status saas_onboarding_status NOT NULL DEFAULT 'STARTED',
      current_step VARCHAR(50) NOT NULL DEFAULT 'SCHOOL_CREATED',
      completed_steps JSONB NOT NULL DEFAULT '[]',
      admin_user_id UUID,
      metadata JSONB,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_onboarding_school ON saas_onboarding_sessions(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_onboarding_status ON saas_onboarding_sessions(status);
  `);

  // ── saas_audit_logs ────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
      actor_id UUID,
      event_type VARCHAR(100) NOT NULL,
      details JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_audit_school ON saas_audit_logs(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_audit_event ON saas_audit_logs(event_type);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_audit_created ON saas_audit_logs(created_at);
  `);

  console.log("✅ Milestone 28 SaaS Migration complete.");

  // Seed default subscription plans
  const { seedDefaultSubscriptionPlans } = await import("./services/subscriptions");
  await seedDefaultSubscriptionPlans();
  console.log("✅ Default subscription plans seeded.");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
