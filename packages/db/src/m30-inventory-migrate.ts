/**
 * Milestone 30 — Inventory Management & Fixed Assets Migration
 *
 * Creates tables for:
 *   - inventory_items
 *   - inventory_transactions
 *   - suppliers
 *   - purchase_orders
 *   - purchase_order_items
 *   - asset_register
 *
 * IDEMPOTENT: Uses IF NOT EXISTS throughout. Safe to run multiple times.
 */
import { db } from "./client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("🚀 Running Milestone 30 Inventory Migration...");

  // ── inventory_items ─────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
      sku VARCHAR(100),
      current_quantity INTEGER NOT NULL DEFAULT 0,
      minimum_quantity INTEGER NOT NULL DEFAULT 10,
      unit_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_stock_value DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_school ON inventory_items(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(school_id, category);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(school_id, sku);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items(school_id, current_quantity, minimum_quantity);
  `);

  // ── inventory_transactions ──────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      transaction_type VARCHAR(30) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      resulting_balance INTEGER NOT NULL,
      reference VARCHAR(255),
      reason TEXT,
      performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_tx_school ON inventory_transactions(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_tx_item ON inventory_transactions(school_id, inventory_item_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_inventory_tx_date ON inventory_transactions(school_id, created_at);
  `);

  // ── suppliers ───────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      tax_number VARCHAR(100),
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_supplier_school ON suppliers(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(school_id, name);
  `);

  // ── purchase_orders ─────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      order_number VARCHAR(100) NOT NULL,
      order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expected_delivery_date TIMESTAMPTZ,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      notes TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_po_school ON purchase_orders(school_id);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(school_id, order_number);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(school_id, status);
  `);

  // ── purchase_order_items ────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity_ordered INTEGER NOT NULL,
      quantity_received INTEGER NOT NULL DEFAULT 0,
      unit_price DOUBLE PRECISION NOT NULL,
      total_price DOUBLE PRECISION NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_po_item_order ON purchase_order_items(purchase_order_id);
  `);

  // ── asset_register ──────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS asset_register (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      asset_name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Furniture',
      description TEXT,
      purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      purchase_cost DOUBLE PRECISION NOT NULL,
      useful_life_years INTEGER NOT NULL DEFAULT 5,
      depreciation_method VARCHAR(50) NOT NULL DEFAULT 'straight_line',
      accumulated_depreciation DOUBLE PRECISION NOT NULL DEFAULT 0,
      current_book_value DOUBLE PRECISION NOT NULL,
      residual_value DOUBLE PRECISION NOT NULL DEFAULT 0,
      location VARCHAR(255),
      assigned_department VARCHAR(255),
      assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
      barcode VARCHAR(100),
      qr_code VARCHAR(100),
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      disposal_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_asset_school ON asset_register(school_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_asset_barcode ON asset_register(school_id, barcode);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_asset_qr ON asset_register(school_id, qr_code);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_asset_category ON asset_register(school_id, category);
  `);

  console.log("✅ Milestone 30 Inventory Migration complete.");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
