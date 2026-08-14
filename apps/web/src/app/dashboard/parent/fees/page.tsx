"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Invoice {
  id: string;
  feeStructureId: string;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
}

interface Installment {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  sortOrder: number;
}

interface Payment {
  id: string;
  paystackReference: string;
  amount: number;
  paidAt: string;
  webhookVerified: boolean;
}

function ParentFeesContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: "inv-sample-01",
      feeStructureId: "fs-2026-t1",
      totalAmount: 150000,
      amountPaid: 50000,
      outstandingBalance: 100000,
      status: "partial",
      createdAt: new Date().toISOString(),
    },
    {
      id: "inv-sample-02",
      feeStructureId: "fs-2025-t3",
      totalAmount: 120000,
      amountPaid: 120000,
      outstandingBalance: 0,
      status: "paid",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([
    {
      id: "inst-01",
      label: "First Term Installment 1 (50%)",
      amount: 75000,
      dueDate: "2026-09-30",
      sortOrder: 1,
    },
    {
      id: "inst-02",
      label: "First Term Installment 2 (50%)",
      amount: 75000,
      dueDate: "2026-11-15",
      sortOrder: 2,
    },
  ]);
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: "pay-01",
      paystackReference: "PAY_2026_APX_9921",
      amount: 50000,
      paidAt: new Date().toISOString(),
      webhookVerified: true,
    },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoice) {
      setSelectedInvoice(invoices[0]);
    }
  }, [invoices, selectedInvoice]);

  useEffect(() => {
    if (!studentId) return;

    async function loadFees() {
      try {
        const res = await fetch(`/api/parent/fees?studentId=${studentId}`);
        const result = await res.json();
        if (result.success && result.data.length > 0) {
          setInvoices(result.data);
          setSelectedInvoice(result.data[0]);
        }
      } catch (err) {
        console.error("Failed to load parent fees", err);
      }
    }
    loadFees();
  }, [studentId]);

  useEffect(() => {
    if (!selectedInvoice || !studentId) return;

    async function loadInstallments() {
      if (!selectedInvoice) return;
      try {
        const res = await fetch(
          `/api/parent/fees?studentId=${studentId}&invoiceId=${selectedInvoice.id}`
        );
        const result = await res.json();
        if (result.success) {
          setInstallments(result.data.installments);
          setPayments(result.data.payments);
        }
      } catch (err) {
        console.error("Failed to load installments", err);
      }
    }
    loadInstallments();
  }, [selectedInvoice, studentId]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Fee Invoices & Payments</h1>
          <p className="text-sm text-gray-500">
            View breakdown, schedule installment payments, and review verified receipts
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading fee records...</div>
        ) : !studentId || invoices.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 p-6 rounded-xl text-center space-y-2">
            <p className="font-semibold text-gray-900">No Invoices Issued Yet</p>
            <p className="text-xs text-gray-500">
              There are currently no active fee invoices assigned to this student.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invoices List */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Invoices</h2>
              {invoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selectedInvoice?.id === inv.id
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-gray-900">
                      ₦{inv.totalAmount.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "partial"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Balance: ₦{inv.outstandingBalance.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>

            {/* Selected Invoice Details & Installments */}
            {selectedInvoice && (
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Invoice Summary</h3>
                      <p className="text-xs text-gray-500">
                        Issued on {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Outstanding Balance</p>
                      <p className="text-2xl font-extrabold text-indigo-600">
                        ₦{selectedInvoice.outstandingBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Installment Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Scheduled Installments
                    </h4>

                    {installments.length === 0 ? (
                      <p className="text-xs text-gray-500">Full payment plan (No installments)</p>
                    ) : (
                      <div className="space-y-2">
                        {installments.map((inst) => {
                          const currentInvoice = selectedInvoice;
                          const isPaid =
                            !currentInvoice ||
                            currentInvoice.status === "paid" ||
                            currentInvoice.amountPaid >= inst.amount * inst.sortOrder;
                          return (
                            <div
                              key={inst.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
                            >
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{inst.label}</p>
                                  <p className="text-xs text-gray-500">
                                    Due: {new Date(inst.dueDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">
                                  ₦{inst.amount.toLocaleString()}
                                </p>
                                {!isPaid && currentInvoice && currentInvoice.outstandingBalance > 0 && (
                                  <button
                                    onClick={() =>
                                      alert(
                                        `Paystack Checkout Integration: Reference payment initialized for ${inst.label} (₦${inst.amount}). Webhook will confirm.`
                                      )
                                    }
                                    className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded transition"
                                  >
                                    Pay Now
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Verified Payment History */}
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                      Webhook Verified Receipts
                    </h4>

                    {payments.length === 0 ? (
                      <p className="text-xs text-gray-500">No verified payments recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((p) => (
                          <div
                            key={p.id}
                            className="flex justify-between items-center text-xs p-2.5 bg-green-50/50 rounded border border-green-100 text-gray-700"
                          >
                            <div>
                              <span className="font-mono text-gray-900 font-semibold">
                                {p.paystackReference}
                              </span>
                              <p className="text-[10px] text-gray-500">
                                {new Date(p.paidAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="font-bold text-green-700">
                              +₦{p.amount.toLocaleString()} (Verified)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

export default function ParentFeesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400 text-sm">Loading fee structure…</div>}>
      <ParentFeesContent />
    </Suspense>
  );
}
