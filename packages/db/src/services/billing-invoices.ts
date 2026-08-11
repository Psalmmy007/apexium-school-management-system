/**
 * Milestone 29 — Billing & Invoice Service
 *
 * Automatically generates tax invoices for termly subscription payments,
 * tracks invoice payment status, and structures data for PDF export.
 */
import { db } from "../client";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  saasInvoices,
  saasSchoolSubscriptions,
  schools,
  users,
} from "../schema/index";

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  schoolId: string;
  subscriptionId: string;
  paymentId: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  issuedAt: Date;
  paidAt: Date | null;
}

// ── 1. Generate Invoice Number ────────────────────────────────────────────────
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomStr = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${randomStr}`;
}

// ── 2. Create Invoice for Payment ─────────────────────────────────────────────
export async function createInvoiceForPayment(params: {
  schoolId: string;
  subscriptionId: string;
  paymentId?: string;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  paidAt?: Date;
}): Promise<InvoiceData> {
  const invoiceNumber = generateInvoiceNumber();
  const subtotal = params.subtotal;
  const discountAmount = params.discountAmount ?? 0;
  const taxAmount = params.taxAmount ?? 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
  const paidAt = params.paidAt ?? new Date();

  const id = randomUUID();

  await db.insert(saasInvoices).values({
    id,
    invoiceNumber,
    schoolId: params.schoolId,
    subscriptionId: params.subscriptionId,
    paymentId: params.paymentId ?? null,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    currency: "NGN",
    status: "paid",
    billingPeriod: "TERM",
    issuedAt: paidAt,
    paidAt,
  });

  const [invoice] = await db
    .select()
    .from(saasInvoices)
    .where(eq(saasInvoices.id, id))
    .limit(1);

  return invoice as InvoiceData;
}

// ── 3. Get Invoices for School ────────────────────────────────────────────────
export async function getSchoolInvoices(schoolId: string): Promise<InvoiceData[]> {
  const invoices = await db
    .select()
    .from(saasInvoices)
    .where(eq(saasInvoices.schoolId, schoolId))
    .orderBy(desc(saasInvoices.issuedAt));

  return invoices as InvoiceData[];
}

// ── 4. Get Single Invoice Detail ──────────────────────────────────────────────
export async function getInvoiceDetail(invoiceId: string, schoolId: string) {
  const [invoice] = await db
    .select()
    .from(saasInvoices)
    .where(and(eq(saasInvoices.id, invoiceId), eq(saasInvoices.schoolId, schoolId)))
    .limit(1);

  if (!invoice) return null;

  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  return {
    ...invoice,
    schoolName: school?.name ?? "School",
    schoolAddress: school?.address ?? "N/A",
  };
}
