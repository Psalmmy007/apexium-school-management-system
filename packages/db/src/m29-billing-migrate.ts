/**
 * Milestone 29 — SaaS Billing Automation & Entitlements Migration
 *
 * Creates tables for:
 *   - saas_coupons (promotional discount codes)
 *   - saas_invoices (tax invoice records)
 *   - saas_subscription_usages (entitlements, student counts, grace period)
 *
 * IDEMPOTENT: Uses IF NOT EXISTS throughout. Safe to run multiple times.
 */
import { db } from "./client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("🚀 Running Milestone 29 Billing Migration...");

  // ── saas_coupons ────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
      discount_value DOUBLE PRECISION NOT NULL,
      max_redemptions INTEGER,
      redemptions_count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_coupon_code ON saas_coupons(code);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_coupon_active ON saas_coupons(is_active);
  `);

  // ── saas_invoices ───────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(100) NOT NULL UNIQUE,
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      subscription_id UUID NOT NULL REFERENCES saas_school_subscriptions(id),
      payment_id UUID REFERENCES saas_subscription_payments(id),
      subtotal DOUBLE PRECISION NOT NULL,
      discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_amount DOUBLE PRECISION NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      status VARCHAR(30) NOT NULL DEFAULT 'paid',
      billing_period VARCHAR(20) NOT NULL DEFAULT 'TERM',
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      due_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_invoice_number ON saas_invoices(invoice_number);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_invoice_school ON saas_invoices(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_saas_invoice_subscription ON saas_invoices(subscription_id);
  `);

  // ── saas_subscription_usages ───────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_subscription_usages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      active_students_count INTEGER NOT NULL DEFAULT 0,
      max_students_limit INTEGER NOT NULL DEFAULT 200,
      grace_period_ends_at TIMESTAMPTZ,
      is_grace_period_active BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_usage_school ON saas_subscription_usages(school_id);
  `);

  console.log("✅ Milestone 29 Billing Migration complete.");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
