"use client";

import { useState } from "react";

interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  category: string;
  parentAccountId?: string;
  isActive: boolean;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  referenceType: string;
  description: string;
  status: string;
  lines?: Array<{ id: string; accountId: string; debitAmount: number; creditAmount: number; memo?: string }>;
}

interface Expense {
  id: string;
  expenseNumber: string;
  vendorName: string;
  category: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface Budget {
  id: string;
  allocatedAmount: number;
  utilizedAmount: number;
  accountName?: string;
  accountCode?: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
}

interface Props {
  initialAccounts: Account[];
  initialJournalEntries: JournalEntry[];
  initialExpenses: Expense[];
  initialBudgets: Budget[];
  initialTrialBalance: any;
  initialIncomeStatement: any;
  initialBalanceSheet: any;
  initialAuditLogs: AuditLog[];
  userRole: string;
}

export function FinanceClient({
  initialAccounts,
  initialJournalEntries,
  initialExpenses,
  initialBudgets,
  initialTrialBalance,
  initialIncomeStatement,
  initialBalanceSheet,
  initialAuditLogs,
  userRole,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "journals" | "accounts" | "expenses" | "budgets" | "statements" | "reconciliation" | "audit"
  >("journals");

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialJournalEntries);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [trialBalance] = useState(initialTrialBalance);
  const [incomeStatement] = useState(initialIncomeStatement);
  const [balanceSheet] = useState(initialBalanceSheet);
  const [auditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accCode, setAccCode] = useState("");
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("Expense");

  const [showJournalModal, setShowJournalModal] = useState(false);
  const [jeDesc, setJeDesc] = useState("");
  const [debitAcc, setDebitAcc] = useState(accounts[0]?.id || "");
  const [creditAcc, setCreditAcc] = useState(accounts[1]?.id || "");
  const [jeAmount, setJeAmount] = useState("50000");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [vendor, setVendor] = useState("");
  const [expCat, setExpCat] = useState("Utilities & Fuel");
  const [expAmt, setExpAmt] = useState("25000");

  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    if (!accCode.trim() || !accName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountCode: accCode,
          accountName: accName,
          accountType: accType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAccounts((prev) => [...prev, json.data]);
        setShowAccountModal(false);
        setAccCode("");
        setAccName("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostJournal = async () => {
    if (!jeDesc.trim() || !debitAcc || !creditAcc || !jeAmount) return;
    const amt = parseFloat(jeAmount);
    setLoading(true);
    try {
      const res = await fetch("/api/finance/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: jeDesc,
          lines: [
            { accountId: debitAcc, debitAmount: amt, creditAmount: 0 },
            { accountId: creditAcc, debitAmount: 0, creditAmount: amt },
          ],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setJournalEntries((prev) => [json.data, ...prev]);
        setShowJournalModal(false);
        setJeDesc("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExpense = async () => {
    if (!vendor.trim() || !expAmt) return;
    setLoading(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: vendor,
          category: expCat,
          amount: parseFloat(expAmt),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setExpenses((prev) => [json.data, ...prev]);
        setShowExpenseModal(false);
        setVendor("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExpense = async (expId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/expenses/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId: expId }),
      });
      const json = await res.json();
      if (json.success) {
        setExpenses((prev) => prev.map((e) => (e.id === expId ? { ...e, status: "Posted" } : e)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReverseJournal = async (jeId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/journal-entries/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalEntryId: jeId, reason: "Manual Reversal Request" }),
      });
      const json = await res.json();
      if (json.success) {
        setJournalEntries((prev) =>
          prev.map((j) => (j.id === jeId ? { ...j, status: "Reversed" } : j)).concat(json.data)
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">💰</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Revenue</p>
            <h3 className="text-xl font-bold text-slate-900">₦{(incomeStatement?.totalRevenues || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-lg">💸</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Expenses</p>
            <h3 className="text-xl font-bold text-slate-900">₦{(incomeStatement?.totalExpenses || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">⚖️</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Net Period Income</p>
            <h3 className="text-xl font-bold text-indigo-700">₦{(incomeStatement?.netIncome || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">📜</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Journal Entries</p>
            <h3 className="text-xl font-bold text-slate-900">{journalEntries.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "journals", label: "Journal Entries & Ledger", icon: "📜" },
          { id: "accounts", label: "Chart of Accounts", icon: "📊" },
          { id: "expenses", label: "Expense Vouchers", icon: "💸" },
          { id: "budgets", label: "Budgets & Variance", icon: "🎯" },
          { id: "statements", label: "Financial Statements", icon: "⚖️" },
          { id: "audit", label: "Accounting Audit Trail", icon: "🔍" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. JOURNAL ENTRIES TAB */}
      {activeTab === "journals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">General Ledger Journal Entries</h3>
              <p className="text-xs text-slate-500">Double-entry transaction postings with balanced line enforcement.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowJournalModal(true)} className="btn-primary btn-sm text-xs">
                + New Journal Entry
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Entry No</th>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No journal entries posted yet.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map((j) => (
                    <tr key={j.id}>
                      <td className="font-mono text-xs font-bold text-slate-900">{j.entryNumber}</td>
                      <td className="font-mono text-xs text-slate-500">{new Date(j.entryDate).toLocaleDateString("en-NG")}</td>
                      <td className="text-xs font-semibold text-indigo-700 capitalize">{j.referenceType.replace(/_/g, " ")}</td>
                      <td className="text-xs text-slate-800">{j.description}</td>
                      <td>
                        <span className={`badge ${j.status === "Posted" ? "badge-success" : j.status === "Reversed" ? "badge-danger" : "badge-neutral"}`}>
                          {j.status}
                        </span>
                      </td>
                      <td>
                        {j.status === "Posted" && userRole === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleReverseJournal(j.id)}
                            disabled={loading}
                            className="btn-ghost btn-xs text-rose-600 text-[10px]"
                          >
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CHART OF ACCOUNTS TAB */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chart of Accounts</h3>
              <p className="text-xs text-slate-500">Hierarchical General Ledger account structure (Assets, Liabilities, Equity, Revenue, Expenses).</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowAccountModal(true)} className="btn-primary btn-sm text-xs">
                + Add GL Account
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs font-bold text-indigo-800">{a.accountCode}</td>
                    <td className="font-semibold text-xs text-slate-900">{a.accountName}</td>
                    <td className="text-xs font-semibold text-slate-700">{a.accountType}</td>
                    <td className="text-xs text-slate-500">{a.category}</td>
                    <td>
                      <span className="badge-success">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. EXPENSE VOUCHERS TAB */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expense Vouchers</h3>
              <p className="text-xs text-slate-500">Operational expense submissions, approval workflow, and automated journal postings.</p>
            </div>
            <button type="button" onClick={() => setShowExpenseModal(true)} className="btn-primary btn-sm text-xs">
              + Submit Expense Voucher
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Voucher No</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      No expense vouchers recorded.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono text-xs font-bold text-slate-900">{e.expenseNumber}</td>
                      <td className="text-xs font-semibold text-slate-800">{e.vendorName}</td>
                      <td className="text-xs text-slate-600">{e.category}</td>
                      <td className="font-bold text-xs text-rose-700">₦{e.amount.toLocaleString()}</td>
                      <td className="text-xs text-slate-500">{e.paymentMethod}</td>
                      <td>
                        <span className={`badge ${e.status === "Posted" ? "badge-success" : "badge-warning"}`}>
                          {e.status}
                        </span>
                      </td>
                      <td>
                        {e.status !== "Posted" && userRole === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleApproveExpense(e.id)}
                            disabled={loading}
                            className="btn-success btn-xs text-[10px]"
                          >
                            Approve & Post
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BUDGETS & VARIANCE TAB */}
      {activeTab === "budgets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Annual Budget Allocations</h3>
              <p className="text-xs text-slate-500">Departmental expenditure budget tracking and utilization variance.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                No budget allocations defined yet.
              </div>
            ) : (
              budgets.map((b) => {
                const pct = b.allocatedAmount > 0 ? Math.round((b.utilizedAmount / b.allocatedAmount) * 100) : 0;
                return (
                  <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm text-slate-900">{b.accountName || "Expense Budget"}</strong>
                      <span className="font-mono text-xs font-bold text-slate-700">₦{b.allocatedAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Utilized: ₦{b.utilizedAmount.toLocaleString()}</span>
                      <span className={pct > 90 ? "text-rose-600 font-bold" : "text-slate-600"}>{pct}% Used</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${pct > 90 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. FINANCIAL STATEMENTS TAB */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Financial Reports & Statements</h3>
              <p className="text-xs text-slate-500">Trial Balance, Income Statement, and Balance Sheet.</p>
            </div>
          </div>

          {/* Trial Balance */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Trial Balance Summary</h4>
              <span className={`badge ${trialBalance?.isBalanced ? "badge-success" : "badge-danger"}`}>
                {trialBalance?.isBalanced ? "✓ Balanced" : "Unbalanced"}
              </span>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Account Name</th>
                    <th>Debit (₦)</th>
                    <th>Credit (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {(trialBalance?.accounts || []).map((a: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs font-bold">{a.code}</td>
                      <td className="text-xs font-semibold text-slate-800">{a.name}</td>
                      <td className="text-xs text-slate-900 font-mono">{a.debit > 0 ? `₦${a.debit.toLocaleString()}` : "-"}</td>
                      <td className="text-xs text-slate-900 font-mono">{a.credit > 0 ? `₦${a.credit.toLocaleString()}` : "-"}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold text-xs">
                    <td colSpan={2}>TOTALS</td>
                    <td className="text-indigo-800 font-mono">₦{(trialBalance?.totalDebits || 0).toLocaleString()}</td>
                    <td className="text-indigo-800 font-mono">₦{(trialBalance?.totalCredits || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT TRAIL TAB */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Immutable Accounting Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable log of posted journal entries, reversals, and financial adjustments.</p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-400 text-xs">
                      No accounting audit logs recorded.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((a) => (
                    <tr key={a.id}>
                      <td className="font-mono text-xs text-slate-500">{new Date(a.createdAt).toLocaleString("en-NG")}</td>
                      <td className="font-bold text-xs uppercase text-indigo-700">{a.action.replace(/_/g, " ")}</td>
                      <td className="text-xs text-slate-700">{a.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: New Journal Entry */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Post Double-Entry Journal</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Description / Purpose *</label>
                <input
                  type="text"
                  placeholder="e.g. Purchase of lab supplies"
                  value={jeDesc}
                  onChange={(e) => setJeDesc(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Debit Account *</label>
                <select value={debitAcc} onChange={(e) => setDebitAcc(e.target.value)} className="input">
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountCode} — {a.accountName} ({a.accountType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Credit Account *</label>
                <select value={creditAcc} onChange={(e) => setCreditAcc(e.target.value)} className="input">
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountCode} — {a.accountName} ({a.accountType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount (₦) *</label>
                <input type="number" value={jeAmount} onChange={(e) => setJeAmount(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowJournalModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handlePostJournal} disabled={loading || !jeDesc.trim()} className="btn-primary btn-sm">
                {loading ? "Posting..." : "Post Journal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add GL Account */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Add Chart of Account</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Account Code *</label>
                <input type="text" placeholder="e.g. 5300" value={accCode} onChange={(e) => setAccCode(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Account Name *</label>
                <input type="text" placeholder="e.g. Maintenance Expense" value={accName} onChange={(e) => setAccName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Account Type *</label>
                <select value={accType} onChange={(e) => setAccType(e.target.value)} className="input">
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAccountModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleCreateAccount} disabled={loading || !accCode.trim()} className="btn-primary btn-sm">
                {loading ? "Saving..." : "Save Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Submit Expense Voucher */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Submit Expense Voucher</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Vendor Name *</label>
                <input type="text" placeholder="e.g. Ikeja Electric" value={vendor} onChange={(e) => setVendor(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Category *</label>
                <input type="text" value={expCat} onChange={(e) => setExpCat(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Amount (₦) *</label>
                <input type="number" value={expAmt} onChange={(e) => setExpAmt(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleSubmitExpense} disabled={loading || !vendor.trim()} className="btn-primary btn-sm">
                {loading ? "Submitting..." : "Submit Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
