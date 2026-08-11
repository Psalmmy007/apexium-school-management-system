import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM19Migration() {
  console.log("🚀 Running Milestone 19 Finance & Accounting Database Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS finance_fiscal_years (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE,
      closed_at TIMESTAMPTZ,
      closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_fiscal_school ON finance_fiscal_years(school_id, is_closed);

    CREATE TABLE IF NOT EXISTS finance_accounting_periods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      fiscal_year_id UUID NOT NULL REFERENCES finance_fiscal_years(id) ON DELETE CASCADE,
      period_name TEXT NOT NULL,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      locked_at TIMESTAMPTZ,
      locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_period_unique ON finance_accounting_periods(school_id, period_month, period_year);

    CREATE TABLE IF NOT EXISTS finance_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      account_code VARCHAR(50) NOT NULL,
      account_name TEXT NOT NULL,
      account_type VARCHAR(30) NOT NULL,
      category VARCHAR(50) NOT NULL,
      parent_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_acc_school_code ON finance_accounts(school_id, account_code);
    CREATE INDEX IF NOT EXISTS idx_fin_acc_type ON finance_accounts(school_id, account_type);

    CREATE TABLE IF NOT EXISTS finance_journal_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      entry_number VARCHAR(50) NOT NULL,
      entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      period_id UUID REFERENCES finance_accounting_periods(id) ON DELETE SET NULL,
      reference_type VARCHAR(50) NOT NULL,
      reference_id UUID,
      description TEXT NOT NULL,
      posted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      posted_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft',
      reversed_entry_id UUID REFERENCES finance_journal_entries(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_je_school_num ON finance_journal_entries(school_id, entry_number);
    CREATE INDEX IF NOT EXISTS idx_fin_je_status_date ON finance_journal_entries(school_id, status, entry_date);

    CREATE TABLE IF NOT EXISTS finance_journal_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      journal_entry_id UUID NOT NULL REFERENCES finance_journal_entries(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
      debit_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      credit_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      memo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_jl_entry_account ON finance_journal_lines(journal_entry_id, account_id);

    CREATE TABLE IF NOT EXISTS finance_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      entry_date TIMESTAMPTZ NOT NULL,
      journal_entry_id UUID NOT NULL REFERENCES finance_journal_entries(id) ON DELETE CASCADE,
      journal_line_id UUID NOT NULL REFERENCES finance_journal_lines(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
      debit_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      credit_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      running_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_ledger_account_date ON finance_ledger(school_id, account_id, entry_date);

    CREATE TABLE IF NOT EXISTS finance_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      expense_number VARCHAR(50) NOT NULL,
      vendor_name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      payment_method VARCHAR(30) NOT NULL DEFAULT 'Bank Transfer',
      payment_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
      expense_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
      receipt_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft',
      submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_exp_school_status ON finance_expenses(school_id, status);

    CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
      vendor_name TEXT NOT NULL,
      payment_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
      expense_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
      next_due_date TIMESTAMPTZ NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_recur_school_active ON finance_recurring_expenses(school_id, active);

    CREATE TABLE IF NOT EXISTS finance_budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      fiscal_year_id UUID NOT NULL REFERENCES finance_fiscal_years(id) ON DELETE CASCADE,
      department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
      account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
      allocated_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      utilized_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_budget_unique ON finance_budgets(school_id, fiscal_year_id, account_id);

    CREATE TABLE IF NOT EXISTS finance_bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      gl_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
      opening_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_bank_school_num ON finance_bank_accounts(school_id, account_number);

    CREATE TABLE IF NOT EXISTS finance_bank_reconciliations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      bank_account_id UUID NOT NULL REFERENCES finance_bank_accounts(id) ON DELETE CASCADE,
      statement_date TIMESTAMPTZ NOT NULL,
      statement_ending_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      book_ending_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      reconciled_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'In_Progress',
      reconciled_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reconciled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_bank_rec_school ON finance_bank_reconciliations(school_id, bank_account_id);

    CREATE TABLE IF NOT EXISTS finance_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      before_state JSONB DEFAULT '{}',
      after_state JSONB DEFAULT '{}',
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_fin_audit_school_date ON finance_audit_logs(school_id, created_at);
  `);

  console.log("✅ Milestone 19 Finance & Accounting Database Migration Completed Successfully!");
}

runM19Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
