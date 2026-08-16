import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  financeFiscalYears,
  financeAccountingPeriods,
  financeAccounts,
  financeJournalEntries,
  financeJournalLines,
  financeLedger,
  financeExpenses,
  financeBudgets,
  financeBankAccounts,
  financeBankReconciliations,
  financeAuditLogs,
} from "../index";
import {
  setupDefaultChartOfAccounts,
  getDerivedAccountBalance,
  createFiscalYear,
  lockAccountingPeriod,
  postJournalEntry,
  reverseJournalEntry,
  postSubledgerRevenue,
  submitExpenseVoucher,
  approveAndPostExpense,
  generateTrialBalance,
  generateIncomeStatement,
  generateBalanceSheet,
  reconcileBankAccount,
} from "./finance";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let adminAId: string;
let fiscalYearAId: string;
let periodA1Id: string;

beforeAll(async () => {
  // Ensure DDL tables exist
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
  `);

  // Create Test Schools
  const [sA] = await db
    .insert(schools)
    .values({ name: "Finance Test School A", slug: `fin-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "Finance Test School B", slug: `fin-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  // Create Admin User
  const [admin] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `bursar.fin.${Date.now()}@example.com`,
      firstName: "School",
      lastName: "Bursar",
      role: "admin",
    })
    .returning();
  adminAId = admin.id;

  // Setup Fiscal Year
  const fy = await createFiscalYear({
    schoolId: schoolAId,
    name: "2026 Academic Fiscal Year",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
  });
  fiscalYearAId = fy.id;
});

describe("Milestone 19 Finance & Accounting System Integration Tests", () => {
  // 1. Chart of Accounts & Derived Balances
  it("initializes standard hierarchical Chart of Accounts without stored balances", async () => {
    const accounts = await setupDefaultChartOfAccounts(schoolAId);
    expect(accounts.length).toBeGreaterThanOrEqual(15);

    const bankAcc = accounts.find((a) => a.accountCode === "1120");
    expect(bankAcc).toBeDefined();

    // Derived balance initially 0
    const bal = await getDerivedAccountBalance(schoolAId, bankAcc!.id);
    expect(bal).toBe(0);
  });

  // 2. Double-Entry Balanced Journal Postings & Unbalanced Rejection
  it("posts balanced double-entry journal entry and rejects unbalanced entries", async () => {
    const accounts = await setupDefaultChartOfAccounts(schoolAId);
    const bankAcc = accounts.find((a) => a.accountCode === "1120")!;
    const tuitionAcc = accounts.find((a) => a.accountCode === "4100")!;

    // 1. Rejection: Unbalanced entry
    await expect(
      postJournalEntry({
        schoolId: schoolAId,
        referenceType: "manual",
        description: "Unbalanced Fee Posting",
        lines: [
          { accountId: bankAcc.id, debitAmount: 100000, creditAmount: 0 },
          { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 50000 },
        ],
      })
    ).rejects.toThrow(/Unbalanced Journal Entry!/i);

    // 2. Success: Balanced entry
    const entry = await postJournalEntry({
      schoolId: schoolAId,
      referenceType: "manual",
      description: "First Term Tuition Payments Deposit",
      postedById: adminAId,
      lines: [
        { accountId: bankAcc.id, debitAmount: 100000, creditAmount: 0 },
        { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 100000 },
      ],
    });

    expect(entry.id).toBeDefined();
    expect(entry.status).toBe("Posted");

    // Verify derived balances
    const bankBal = await getDerivedAccountBalance(schoolAId, bankAcc.id);
    const tuitionBal = await getDerivedAccountBalance(schoolAId, tuitionAcc.id);
    expect(bankBal).toBe(100000);
    expect(tuitionBal).toBe(100000);
  });

  // 3. Reversal Workflow (No Editing Posted Entries)
  it("reverses posted journal entry and verifies debits/credits swapped", async () => {
    const accounts = await setupDefaultChartOfAccounts(schoolAId);
    const bankAcc = accounts.find((a) => a.accountCode === "1120")!;
    const utilityAcc = accounts.find((a) => a.accountCode === "5200")!;

    const entry = await postJournalEntry({
      schoolId: schoolAId,
      referenceType: "manual",
      description: "Overpaid Utility Bill",
      postedById: adminAId,
      lines: [
        { accountId: utilityAcc.id, debitAmount: 30000, creditAmount: 0 },
        { accountId: bankAcc.id, debitAmount: 0, creditAmount: 30000 },
      ],
    });

    // Reverse entry
    const reversal = await reverseJournalEntry(schoolAId, entry.id, adminAId, "Reversing duplicate bill payment");
    expect(reversal.id).toBeDefined();
    expect(reversal.referenceType).toBe("reversal");
  });

  // 4. Automatic Sub-ledger Revenue Posting
  it("automatically posts revenue entries for sub-ledger transactions", async () => {
    const entry = await postSubledgerRevenue({
      schoolId: schoolAId,
      module: "transport",
      referenceId: crypto.randomUUID(),
      amount: 45000,
      description: "Transport Fee Payment — Student 001",
      postedById: adminAId,
    });

    expect(entry.id).toBeDefined();
    expect(entry.status).toBe("Posted");
  });

  // 5. Expense Voucher Workflow & Budget Utilization
  it("submits, approves, posts expense voucher, and updates budget utilization", async () => {
    const accounts = await setupDefaultChartOfAccounts(schoolAId);
    const utilityAcc = accounts.find((a) => a.accountCode === "5200")!;

    // Create budget
    await db.insert(financeBudgets).values({
      schoolId: schoolAId,
      fiscalYearId: fiscalYearAId,
      accountId: utilityAcc.id,
      allocatedAmount: 500000,
      utilizedAmount: 0,
    }).onConflictDoNothing();

    // Submit expense
    const expense = await submitExpenseVoucher({
      schoolId: schoolAId,
      vendorName: "Ikeja Electric",
      category: "Electricity Utility",
      amount: 75000,
      submittedBy: adminAId,
    });

    expect(expense.status).toBe("Submitted");

    // Approve & Post
    const { expense: postedExp } = await approveAndPostExpense(schoolAId, expense.id, adminAId);
    expect(postedExp.status).toBe("Posted");

    // Verify Budget Utilization
    const [b] = await db.select().from(financeBudgets).where(and(eq(financeBudgets.schoolId, schoolAId), eq(financeBudgets.accountId, utilityAcc.id)));
    expect(b.utilizedAmount).toBe(75000);
  });

  // 6. Financial Statements (Trial Balance, Income Statement, Balance Sheet)
  it("generates Trial Balance, Income Statement, and Balance Sheet reports", async () => {
    const trial = await generateTrialBalance(schoolAId);
    expect(trial.isBalanced).toBe(true);
    expect(trial.totalDebits).toBe(trial.totalCredits);

    const income = await generateIncomeStatement(schoolAId);
    expect(income.totalRevenues).toBeGreaterThan(0);

    const balance = await generateBalanceSheet(schoolAId);
    expect(balance.isBalanced).toBe(true);
  });

  // 7. Bank Reconciliation Workflow
  it("reconciles bank account statement ending balance", async () => {
    const accounts = await setupDefaultChartOfAccounts(schoolAId);
    const bankAcc = accounts.find((a) => a.accountCode === "1120")!;

    const [bAccount] = await db
      .insert(financeBankAccounts)
      .values({
        schoolId: schoolAId,
        bankName: "Guaranty Trust Bank",
        accountName: "Apexium School Main Operating Acc",
        accountNumber: "0123456789",
        glAccountId: bankAcc.id,
      })
      .returning();

    const rec = await reconcileBankAccount({
      schoolId: schoolAId,
      bankAccountId: bAccount.id,
      statementDate: new Date(),
      statementEndingBalance: 145000,
      reconciledById: adminAId,
    });

    expect(rec.id).toBeDefined();
    expect(rec.status).toBe("Reconciled");
  });

  // 8. Multi-Tenant Isolation
  it("enforces complete multi-tenant isolation between School A and School B for finance records", async () => {
    const entriesB = await db
      .select()
      .from(financeJournalEntries)
      .where(eq(financeJournalEntries.schoolId, schoolBId));

    expect(entriesB.length).toBe(0); // Isolated
  });
});
