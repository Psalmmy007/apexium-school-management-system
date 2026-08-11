import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  db,
  setupDefaultChartOfAccounts,
  generateTrialBalance,
  generateIncomeStatement,
  generateBalanceSheet,
  financeJournalEntries,
  financeJournalLines,
  financeExpenses,
  financeBudgets,
  financeAuditLogs,
  financeAccounts,
} from "@apexium/db";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { FinanceClient } from "./FinanceClient";

export const metadata: Metadata = {
  title: "Finance & Accounting — ERP",
};

export default async function FinanceDashboardPage() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    redirect("/auth/login");
  }

  let accounts: any[] = [];
  let journalEntries: any[] = [];
  let expenses: any[] = [];
  let budgets: any[] = [];
  let trialBalance: any = null;
  let incomeStatement: any = null;
  let balanceSheet: any = null;
  let auditLogs: any[] = [];

  try {
    accounts = await setupDefaultChartOfAccounts(user.schoolId);

    const [jList, eList, bList, aList] = await Promise.all([
      db
        .select()
        .from(financeJournalEntries)
        .where(eq(financeJournalEntries.schoolId, user.schoolId))
        .orderBy(desc(financeJournalEntries.createdAt)),
      db
        .select()
        .from(financeExpenses)
        .where(eq(financeExpenses.schoolId, user.schoolId))
        .orderBy(desc(financeExpenses.createdAt)),
      db
        .select({
          id: financeBudgets.id,
          allocatedAmount: financeBudgets.allocatedAmount,
          utilizedAmount: financeBudgets.utilizedAmount,
          accountName: financeAccounts.accountName,
          accountCode: financeAccounts.accountCode,
        })
        .from(financeBudgets)
        .leftJoin(financeAccounts, eq(financeBudgets.accountId, financeAccounts.id))
        .where(eq(financeBudgets.schoolId, user.schoolId))
        .orderBy(desc(financeBudgets.createdAt)),
      db
        .select()
        .from(financeAuditLogs)
        .where(eq(financeAuditLogs.schoolId, user.schoolId))
        .orderBy(desc(financeAuditLogs.createdAt))
        .limit(50),
    ]);

    journalEntries = jList.map((j) => ({
      ...j,
      entryDate: j.entryDate ? j.entryDate.toISOString() : "",
      createdAt: j.createdAt ? j.createdAt.toISOString() : "",
    }));
    expenses = eList.map((e) => ({
      ...e,
      createdAt: e.createdAt ? e.createdAt.toISOString() : "",
    }));
    budgets = bList;
    auditLogs = aList.map((a) => ({
      ...a,
      createdAt: a.createdAt ? a.createdAt.toISOString() : "",
    }));

    [trialBalance, incomeStatement, balanceSheet] = await Promise.all([
      generateTrialBalance(user.schoolId),
      generateIncomeStatement(user.schoolId),
      generateBalanceSheet(user.schoolId),
    ]);
  } catch (error) {
    console.error("Failed loading finance dashboard data:", error);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Finance & Accounting System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Double-entry General Ledger, Chart of Accounts, revenue consolidation, expense vouchers, budgets, and financial statements.
          </p>
        </div>
      </div>

      <FinanceClient
        initialAccounts={accounts}
        initialJournalEntries={journalEntries}
        initialExpenses={expenses}
        initialBudgets={budgets}
        initialTrialBalance={trialBalance}
        initialIncomeStatement={incomeStatement}
        initialBalanceSheet={balanceSheet}
        initialAuditLogs={auditLogs}
        userRole={user.role}
      />
    </div>
  );
}
