import {
  db,
  financeFiscalYears,
  financeAccountingPeriods,
  financeAccounts,
  financeJournalEntries,
  financeJournalLines,
  financeLedger,
  financeExpenses,
  financeRecurringExpenses,
  financeBudgets,
  financeBankAccounts,
  financeBankReconciliations,
  financeAuditLogs,
} from "../index";
import { eq, and, sql, gte, lte, inArray, desc, sum } from "drizzle-orm";

// ── Audit Logger Helper ──────────────────────────────────────
export async function logFinanceAuditTrail(data: {
  schoolId: string;
  performedById?: string;
  action: string;
  details: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
}) {
  const [log] = await db
    .insert(financeAuditLogs)
    .values({
      schoolId: data.schoolId,
      performedById: data.performedById,
      action: data.action,
      details: data.details,
      beforeState: data.beforeState || {},
      afterState: data.afterState || {},
      ipAddress: data.ipAddress,
    })
    .returning();
  return log;
}

// ── 1. Chart of Accounts & Derived Balances ──────────────────
export async function setupDefaultChartOfAccounts(schoolId: string) {
  const existing = await db
    .select()
    .from(financeAccounts)
    .where(eq(financeAccounts.schoolId, schoolId));

  if (existing.length > 0) return existing;

  // Root Parents
  const [assetRoot] = await db.insert(financeAccounts).values({ schoolId, accountCode: "1000", accountName: "Assets", accountType: "Asset", category: "Asset" }).returning();
  const [liabRoot] = await db.insert(financeAccounts).values({ schoolId, accountCode: "2000", accountName: "Liabilities", accountType: "Liability", category: "Liability" }).returning();
  const [eqRoot] = await db.insert(financeAccounts).values({ schoolId, accountCode: "3000", accountName: "Equity", accountType: "Equity", category: "Equity" }).returning();
  const [revRoot] = await db.insert(financeAccounts).values({ schoolId, accountCode: "4000", accountName: "Revenue", accountType: "Revenue", category: "Revenue" }).returning();
  const [expRoot] = await db.insert(financeAccounts).values({ schoolId, accountCode: "5000", accountName: "Expenses", accountType: "Expense", category: "Expense" }).returning();

  // Child Accounts
  await db.insert(financeAccounts).values([
    { schoolId, accountCode: "1110", accountName: "Main Cash Account", accountType: "Asset", category: "Cash", parentAccountId: assetRoot.id },
    { schoolId, accountCode: "1120", accountName: "Operating Bank Account", accountType: "Asset", category: "Bank", parentAccountId: assetRoot.id },
    { schoolId, accountCode: "1130", accountName: "Student Accounts Receivable", accountType: "Asset", category: "Receivables", parentAccountId: assetRoot.id },
    { schoolId, accountCode: "2110", accountName: "Accounts Payable", accountType: "Liability", category: "Payables", parentAccountId: liabRoot.id },
    { schoolId, accountCode: "3110", accountName: "Retained Earnings", accountType: "Equity", category: "Equity", parentAccountId: eqRoot.id },
    { schoolId, accountCode: "4100", accountName: "Tuition & School Fees Revenue", accountType: "Revenue", category: "Revenue", parentAccountId: revRoot.id },
    { schoolId, accountCode: "4200", accountName: "Hostel Accommodations Revenue", accountType: "Revenue", category: "Revenue", parentAccountId: revRoot.id },
    { schoolId, accountCode: "4300", accountName: "Transport Subscriptions Revenue", accountType: "Revenue", category: "Revenue", parentAccountId: revRoot.id },
    { schoolId, accountCode: "4400", accountName: "Library Fines Revenue", accountType: "Revenue", category: "Revenue", parentAccountId: revRoot.id },
    { schoolId, accountCode: "5100", accountName: "Staff Payroll Expense", accountType: "Expense", category: "Expense", parentAccountId: expRoot.id },
    { schoolId, accountCode: "5200", accountName: "Utilities & Fuel Expense", accountType: "Expense", category: "Expense", parentAccountId: expRoot.id },
  ]);

  return await db.select().from(financeAccounts).where(eq(financeAccounts.schoolId, schoolId));
}

export async function getDerivedAccountBalance(schoolId: string, accountId: string) {
  const result = await db
    .select({
      totalDebit: sum(financeJournalLines.debitAmount),
      totalCredit: sum(financeJournalLines.creditAmount),
    })
    .from(financeJournalLines)
    .where(and(eq(financeJournalLines.schoolId, schoolId), eq(financeJournalLines.accountId, accountId)));

  const debit = Number(result[0]?.totalDebit || 0);
  const credit = Number(result[0]?.totalCredit || 0);

  // Asset/Expense = Debit - Credit, Liability/Equity/Revenue = Credit - Debit
  const [acc] = await db.select().from(financeAccounts).where(eq(financeAccounts.id, accountId));
  if (!acc) return 0;

  if (acc.accountType === "Asset" || acc.accountType === "Expense") {
    return debit - credit;
  }
  return credit - debit;
}

// ── 2. Fiscal Years & Accounting Period Locking ───────────────
export async function createFiscalYear(data: {
  schoolId: string;
  name: string;
  startDate: Date;
  endDate: Date;
}) {
  const [fy] = await db
    .insert(financeFiscalYears)
    .values({
      schoolId: data.schoolId,
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      isClosed: false,
    })
    .returning();

  // Initialize 12 monthly periods
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const year = data.startDate.getFullYear();

  for (let m = 1; m <= 12; m++) {
    await db.insert(financeAccountingPeriods).values({
      schoolId: data.schoolId,
      fiscalYearId: fy.id,
      periodName: `${monthNames[m - 1]} ${year}`,
      periodMonth: m,
      periodYear: year,
      isLocked: false,
    }).onConflictDoNothing();
  }

  return fy;
}

export async function lockAccountingPeriod(schoolId: string, periodId: string, lockedById: string) {
  const [period] = await db
    .update(financeAccountingPeriods)
    .set({
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: lockedById,
    })
    .where(and(eq(financeAccountingPeriods.id, periodId), eq(financeAccountingPeriods.schoolId, schoolId)))
    .returning();

  return period;
}

export async function closeFiscalYear(schoolId: string, fiscalYearId: string, closedById: string) {
  const [fy] = await db
    .update(financeFiscalYears)
    .set({
      isClosed: true,
      closedAt: new Date(),
      closedBy: closedById,
    })
    .where(and(eq(financeFiscalYears.id, fiscalYearId), eq(financeFiscalYears.schoolId, schoolId)))
    .returning();

  // Lock all periods under fiscal year
  await db
    .update(financeAccountingPeriods)
    .set({ isLocked: true, lockedAt: new Date(), lockedBy: closedById })
    .where(eq(financeAccountingPeriods.fiscalYearId, fiscalYearId));

  return fy;
}

// ── 3. Double-Entry Accounting Engine ────────────────────────
export async function postJournalEntry(data: {
  schoolId: string;
  entryNumber?: string;
  entryDate?: Date;
  referenceType: string;
  referenceId?: string;
  description: string;
  postedById?: string;
  lines: Array<{ accountId: string; debitAmount: number; creditAmount: number; memo?: string }>;
}) {
  const { schoolId, referenceType, referenceId, description, postedById, lines } = data;
  const entryDate = data.entryDate || new Date();

  // 1. Enforce Balanced Double-Entry Rule (SUM(Debits) === SUM(Credits))
  const totalDebit = lines.reduce((acc, curr) => acc + (curr.debitAmount || 0), 0);
  const totalCredit = lines.reduce((acc, curr) => acc + (curr.creditAmount || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Unbalanced Journal Entry! Total Debits (₦${totalDebit.toLocaleString()}) must equal Total Credits (₦${totalCredit.toLocaleString()}).`);
  }

  // 2. Validate Period & Fiscal Year Locking
  const periodMonth = entryDate.getMonth() + 1;
  const periodYear = entryDate.getFullYear();

  const periods = await db
    .select()
    .from(financeAccountingPeriods)
    .where(
      and(
        eq(financeAccountingPeriods.schoolId, schoolId),
        eq(financeAccountingPeriods.periodMonth, periodMonth),
        eq(financeAccountingPeriods.periodYear, periodYear)
      )
    );

  if (periods.length > 0 && periods[0].isLocked) {
    throw new Error(`Posting Rejected! Accounting period ${periodMonth}/${periodYear} is locked.`);
  }

  const entryNumber = data.entryNumber || `JE-${Date.now().toString().slice(-6)}`;

  // 3. Create Journal Entry Header
  const [entry] = await db
    .insert(financeJournalEntries)
    .values({
      schoolId,
      entryNumber,
      entryDate,
      periodId: periods[0]?.id,
      referenceType: referenceType || "manual",
      referenceId,
      description: description.trim(),
      postedById,
      postedAt: new Date(),
      status: "Posted",
    })
    .returning();

  // 4. Save Lines & Populate Flat General Ledger
  for (const line of lines) {
    const [savedLine] = await db
      .insert(financeJournalLines)
      .values({
        schoolId,
        journalEntryId: entry.id,
        accountId: line.accountId,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        memo: line.memo,
      })
      .returning();

    // Populate Ledger for Instant Reports
    const currentAccBal = await getDerivedAccountBalance(schoolId, line.accountId);
    await db.insert(financeLedger).values({
      schoolId,
      entryDate,
      journalEntryId: entry.id,
      journalLineId: savedLine.id,
      accountId: line.accountId,
      debitAmount: line.debitAmount || 0,
      creditAmount: line.creditAmount || 0,
      runningBalance: currentAccBal,
    });
  }

  await logFinanceAuditTrail({
    schoolId,
    performedById: postedById,
    action: "journal_entry_posted",
    details: `Posted Journal Entry ${entryNumber} (₦${totalDebit.toLocaleString()}).`,
    afterState: { entry, lines },
  });

  return entry;
}

// ── 4. Reversal Workflow (No Editing Posted Entries) ─────────
export async function reverseJournalEntry(schoolId: string, journalEntryId: string, reversedById: string, reason: string) {
  const [original] = await db
    .select()
    .from(financeJournalEntries)
    .where(and(eq(financeJournalEntries.id, journalEntryId), eq(financeJournalEntries.schoolId, schoolId)));

  if (!original) throw new Error("Original Journal Entry not found.");
  if (original.status !== "Posted") throw new Error(`Only Posted journal entries can be reversed. Current status: ${original.status}`);

  const originalLines = await db
    .select()
    .from(financeJournalLines)
    .where(eq(financeJournalLines.journalEntryId, original.id));

  // Swap Debits and Credits
  const reversingLines = originalLines.map((l) => ({
    accountId: l.accountId,
    debitAmount: l.creditAmount,
    creditAmount: l.debitAmount,
    memo: `Reversal of line ${l.id} — ${reason}`,
  }));

  const reversalEntry = await postJournalEntry({
    schoolId,
    entryNumber: `REV-${original.entryNumber}`,
    referenceType: "reversal",
    referenceId: original.id,
    description: `Reversal Entry for ${original.entryNumber}. Reason: ${reason}`,
    postedById: reversedById,
    lines: reversingLines,
  });

  // Mark original as Reversed
  await db
    .update(financeJournalEntries)
    .set({
      status: "Reversed",
      reversedEntryId: reversalEntry.id,
      updatedAt: new Date(),
    })
    .where(eq(financeJournalEntries.id, original.id));

  await logFinanceAuditTrail({
    schoolId,
    performedById: reversedById,
    action: "journal_entry_reversed",
    details: `Reversed Journal Entry ${original.entryNumber} with Reversal Entry ${reversalEntry.entryNumber}.`,
    beforeState: original,
    afterState: reversalEntry,
  });

  return reversalEntry;
}

// ── 5. Automatic Sub-ledger Revenue Posting ──────────────────
export async function postSubledgerRevenue(data: {
  schoolId: string;
  module: "school_fees" | "hostel" | "transport" | "library";
  referenceId: string;
  amount: number;
  description: string;
  postedById?: string;
}) {
  const { schoolId, module, referenceId, amount, description, postedById } = data;

  const accounts = await setupDefaultChartOfAccounts(schoolId);
  const bankAcc = accounts.find((a) => a.accountCode === "1120") || accounts[0];

  let revenueAccCode = "4100";
  if (module === "hostel") revenueAccCode = "4200";
  if (module === "transport") revenueAccCode = "4300";
  if (module === "library") revenueAccCode = "4400";

  const revenueAcc = accounts.find((a) => a.accountCode === revenueAccCode) || accounts.find((a) => a.accountType === "Revenue") || accounts[0];

  // Debit Operating Bank Account, Credit Subledger Revenue Account
  return await postJournalEntry({
    schoolId,
    referenceType: module,
    referenceId,
    description,
    postedById,
    lines: [
      { accountId: bankAcc.id, debitAmount: amount, creditAmount: 0, memo: `Payment received for ${module}` },
      { accountId: revenueAcc.id, debitAmount: 0, creditAmount: amount, memo: `${module} revenue recognition` },
    ],
  });
}

// ── 6. Expense Vouchers & Budget Utilization ──────────────────
export async function submitExpenseVoucher(data: {
  schoolId: string;
  vendorName: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  paymentAccountId?: string;
  expenseAccountId?: string;
  receiptUrl?: string;
  submittedBy?: string;
  remarks?: string;
}) {
  const expenseNumber = `EXP-${Date.now().toString().slice(-6)}`;

  const [expense] = await db
    .insert(financeExpenses)
    .values({
      schoolId: data.schoolId,
      expenseNumber,
      vendorName: data.vendorName.trim(),
      category: data.category.trim(),
      amount: data.amount,
      paymentMethod: data.paymentMethod || "Bank Transfer",
      paymentAccountId: data.paymentAccountId,
      expenseAccountId: data.expenseAccountId,
      receiptUrl: data.receiptUrl,
      status: "Submitted",
      submittedBy: data.submittedBy,
      remarks: data.remarks,
    })
    .returning();

  return expense;
}

export async function approveAndPostExpense(schoolId: string, expenseId: string, approvedById: string) {
  const [expense] = await db
    .select()
    .from(financeExpenses)
    .where(and(eq(financeExpenses.id, expenseId), eq(financeExpenses.schoolId, schoolId)));

  if (!expense) throw new Error("Expense voucher not found.");
  if (expense.status === "Posted") throw new Error("Expense voucher is already posted.");

  const accounts = await setupDefaultChartOfAccounts(schoolId);
  const paymentAcc = expense.paymentAccountId || accounts.find((a) => a.accountCode === "1120")?.id || accounts[0].id;
  const expenseAcc = expense.expenseAccountId || accounts.find((a) => a.accountCode === "5200")?.id || accounts[0].id;

  // Post Double-Entry Journal (Debit Expense Account, Credit Bank/Payment Account)
  const je = await postJournalEntry({
    schoolId,
    referenceType: "expense",
    referenceId: expense.id,
    description: `Expense Voucher ${expense.expenseNumber} — ${expense.vendorName} (${expense.category})`,
    postedById: approvedById,
    lines: [
      { accountId: expenseAcc, debitAmount: expense.amount, creditAmount: 0, memo: `Expense for ${expense.category}` },
      { accountId: paymentAcc, debitAmount: 0, creditAmount: expense.amount, memo: `Disbursement to ${expense.vendorName}` },
    ],
  });

  // Update Budget Utilization if linked
  const budgets = await db
    .select()
    .from(financeBudgets)
    .where(and(eq(financeBudgets.schoolId, schoolId), eq(financeBudgets.accountId, expenseAcc)));

  if (budgets.length > 0) {
    const b = budgets[0];
    await db
      .update(financeBudgets)
      .set({
        utilizedAmount: b.utilizedAmount + expense.amount,
        updatedAt: new Date(),
      })
      .where(eq(financeBudgets.id, b.id));
  }

  // Update Expense Status
  const [postedExpense] = await db
    .update(financeExpenses)
    .set({
      status: "Posted",
      approvedBy: approvedById,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(financeExpenses.id, expense.id))
    .returning();

  return { expense: postedExpense, journalEntry: je };
}

// ── 7. Financial Statements (Trial Balance, Income, Balance) ─
export async function generateTrialBalance(schoolId: string) {
  const accounts = await db
    .select()
    .from(financeAccounts)
    .where(and(eq(financeAccounts.schoolId, schoolId), eq(financeAccounts.isActive, true)))
    .orderBy(financeAccounts.accountCode);

  const report = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const acc of accounts) {
    const lines = await db
      .select({
        debit: sum(financeJournalLines.debitAmount),
        credit: sum(financeJournalLines.creditAmount),
      })
      .from(financeJournalLines)
      .where(and(eq(financeJournalLines.schoolId, schoolId), eq(financeJournalLines.accountId, acc.id)));

    const d = Number(lines[0]?.debit || 0);
    const c = Number(lines[0]?.credit || 0);

    if (d > 0 || c > 0) {
      report.push({
        code: acc.accountCode,
        name: acc.accountName,
        type: acc.accountType,
        debit: d,
        credit: c,
      });
      totalDebits += d;
      totalCredits += c;
    }
  }

  return {
    accounts: report,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.001,
  };
}

export async function generateIncomeStatement(schoolId: string, startDate?: Date, endDate?: Date) {
  const accounts = await db
    .select()
    .from(financeAccounts)
    .where(eq(financeAccounts.schoolId, schoolId));

  const revenueAccounts = accounts.filter((a) => a.accountType === "Revenue");
  const expenseAccounts = accounts.filter((a) => a.accountType === "Expense");

  let totalRevenues = 0;
  const revenueDetails = [];
  for (const r of revenueAccounts) {
    const bal = await getDerivedAccountBalance(schoolId, r.id);
    totalRevenues += bal;
    revenueDetails.push({ name: r.accountName, code: r.accountCode, amount: bal });
  }

  let totalExpenses = 0;
  const expenseDetails = [];
  for (const e of expenseAccounts) {
    const bal = await getDerivedAccountBalance(schoolId, e.id);
    totalExpenses += bal;
    expenseDetails.push({ name: e.accountName, code: e.accountCode, amount: bal });
  }

  const netIncome = totalRevenues - totalExpenses;

  return {
    revenues: revenueDetails,
    totalRevenues,
    expenses: expenseDetails,
    totalExpenses,
    netIncome,
  };
}

export async function generateBalanceSheet(schoolId: string) {
  const accounts = await db
    .select()
    .from(financeAccounts)
    .where(eq(financeAccounts.schoolId, schoolId));

  const assetAccounts = accounts.filter((a) => a.accountType === "Asset");
  const liabAccounts = accounts.filter((a) => a.accountType === "Liability");
  const eqAccounts = accounts.filter((a) => a.accountType === "Equity");

  let totalAssets = 0;
  const assets = [];
  for (const a of assetAccounts) {
    const bal = await getDerivedAccountBalance(schoolId, a.id);
    totalAssets += bal;
    assets.push({ name: a.accountName, code: a.accountCode, amount: bal });
  }

  let totalLiabilities = 0;
  const liabilities = [];
  for (const l of liabAccounts) {
    const bal = await getDerivedAccountBalance(schoolId, l.id);
    totalLiabilities += bal;
    liabilities.push({ name: l.accountName, code: l.accountCode, amount: bal });
  }

  let totalEquity = 0;
  const equity = [];
  for (const eqItem of eqAccounts) {
    const bal = await getDerivedAccountBalance(schoolId, eqItem.id);
    totalEquity += bal;
    equity.push({ name: eqItem.accountName, code: eqItem.accountCode, amount: bal });
  }

  // Include Income Statement Net Income into Equity
  const incomeStatement = await generateIncomeStatement(schoolId);
  totalEquity += incomeStatement.netIncome;
  equity.push({ name: "Current Period Net Income", code: "3999", amount: incomeStatement.netIncome });

  return {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.001,
  };
}

// ── 8. Bank Reconciliation ────────────────────────────────────
export async function reconcileBankAccount(data: {
  schoolId: string;
  bankAccountId: string;
  statementDate: Date;
  statementEndingBalance: number;
  reconciledById?: string;
}) {
  const { schoolId, bankAccountId, statementDate, statementEndingBalance, reconciledById } = data;

  const [bankAcc] = await db
    .select()
    .from(financeBankAccounts)
    .where(and(eq(financeBankAccounts.id, bankAccountId), eq(financeBankAccounts.schoolId, schoolId)));

  if (!bankAcc) throw new Error("Bank Account not found.");

  const bookBalance = bankAcc.glAccountId
    ? await getDerivedAccountBalance(schoolId, bankAcc.glAccountId)
    : bankAcc.openingBalance;

  const [rec] = await db
    .insert(financeBankReconciliations)
    .values({
      schoolId,
      bankAccountId,
      statementDate,
      statementEndingBalance,
      bookEndingBalance: bookBalance,
      reconciledAmount: statementEndingBalance,
      status: "Reconciled",
      reconciledById,
      reconciledAt: new Date(),
    })
    .returning();

  return rec;
}
