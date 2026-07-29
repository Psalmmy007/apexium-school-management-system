import {
  db,
  feeStructures,
  feeInstallments,
  feeInvoices,
  feePayments,
  announcements,
  studentGuardians,
  studentAttendance,
  studentScores,
  students,
  studentTermReports,
} from "../index";
import { eq, and, or, desc, lt, isNull } from "drizzle-orm";
import crypto from "crypto";

// ── Input interfaces defined locally (no cross-package rootDir violation) ──

export interface CreateFeeStructureInput {
  schoolId: string;
  termId: string;
  classId?: string;
  name: string;
  description?: string;
  totalAmount: number;
  installments: Array<{ label: string; amount: number; dueDate: Date }>;
}

export interface CreateInvoiceInput {
  schoolId: string;
  studentId: string;
  feeStructureId: string;
}

export interface ProcessWebhookInput {
  schoolId: string;
  paystackSecretKey: string;
  rawBody: string;
  signature: string;
  payload: PaystackWebhookPayload;
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number; // kobo
    channel?: string;
    paid_at?: string;
    metadata?: {
      invoice_id?: string;
      installment_id?: string;
    };
  };
}

// ── Fee Management ─────────────────────────────────────────────────────────

/**
 * Creates a fee structure with scheduled installments.
 * Validates that installment amounts sum ≤ totalAmount.
 */
export async function createFeeStructureWithInstallments(input: CreateFeeStructureInput) {
  const installmentTotal = input.installments.reduce((s, i) => s + i.amount, 0);
  if (installmentTotal > input.totalAmount + 0.01) {
    throw new Error("Installment amounts exceed fee total amount.");
  }

  const [structure] = await db
    .insert(feeStructures)
    .values({
      schoolId: input.schoolId,
      termId: input.termId,
      classId: input.classId ?? null,
      name: input.name,
      description: input.description ?? null,
      totalAmount: input.totalAmount,
    })
    .returning();

  const installmentRows = input.installments.map((inst, idx) => ({
    schoolId: input.schoolId,
    feeStructureId: structure.id,
    label: inst.label,
    amount: inst.amount,
    dueDate: inst.dueDate,
    sortOrder: idx + 1,
  }));

  const createdInstallments = await db
    .insert(feeInstallments)
    .values(installmentRows)
    .returning();

  return { structure, installments: createdInstallments };
}

/**
 * Create a fee invoice for a student. Idempotent — returns existing invoice
 * if one already exists for the same student + fee structure within the school.
 */
export async function createOrGetFeeInvoice(input: CreateInvoiceInput) {
  const existing = await db
    .select()
    .from(feeInvoices)
    .where(
      and(
        eq(feeInvoices.schoolId, input.schoolId),
        eq(feeInvoices.studentId, input.studentId),
        eq(feeInvoices.feeStructureId, input.feeStructureId)
      )
    );

  if (existing.length > 0) return existing[0];

  const [structure] = await db
    .select()
    .from(feeStructures)
    .where(
      and(eq(feeStructures.id, input.feeStructureId), eq(feeStructures.schoolId, input.schoolId))
    );

  if (!structure) throw new Error("Fee structure not found.");

  const [invoice] = await db
    .insert(feeInvoices)
    .values({
      schoolId: input.schoolId,
      studentId: input.studentId,
      feeStructureId: input.feeStructureId,
      totalAmount: structure.totalAmount,
      amountPaid: 0,
      outstandingBalance: structure.totalAmount,
      status: "unpaid",
    })
    .returning();

  return invoice;
}

/**
 * Get all invoices for a student within a school.
 */
export async function getStudentInvoices(schoolId: string, studentId: string) {
  return db
    .select()
    .from(feeInvoices)
    .where(and(eq(feeInvoices.schoolId, schoolId), eq(feeInvoices.studentId, studentId)))
    .orderBy(desc(feeInvoices.createdAt));
}

/**
 * Get installment schedule for an invoice.
 */
export async function getInvoiceInstallments(schoolId: string, invoiceId: string) {
  const [invoice] = await db
    .select()
    .from(feeInvoices)
    .where(and(eq(feeInvoices.id, invoiceId), eq(feeInvoices.schoolId, schoolId)));

  if (!invoice) throw new Error("Invoice not found.");

  const installments = await db
    .select()
    .from(feeInstallments)
    .where(
      and(
        eq(feeInstallments.schoolId, schoolId),
        eq(feeInstallments.feeStructureId, invoice.feeStructureId)
      )
    )
    .orderBy(feeInstallments.sortOrder);

  const payments = await db
    .select()
    .from(feePayments)
    .where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.invoiceId, invoiceId)));

  return { invoice, installments, payments };
}

// ── Paystack Webhook Handler ───────────────────────────────────────────────

/**
 * Verifies Paystack HMAC-SHA512 signature and records payment.
 * The webhook — NOT client response — is the only source of truth.
 */
export async function processPaystackWebhook(input: ProcessWebhookInput): Promise<{
  processed: boolean;
  invoiceId?: string;
  nextUnpaidInstallment?: { id: string; label: string; dueDate: Date } | null;
}> {
  // 1. Verify HMAC-SHA512 signature
  const expectedSig = crypto
    .createHmac("sha512", input.paystackSecretKey)
    .update(input.rawBody)
    .digest("hex");

  if (expectedSig !== input.signature) {
    throw new Error("Invalid Paystack webhook signature.");
  }

  // 2. Only process charge.success events
  if (input.payload.event !== "charge.success") {
    return { processed: false };
  }

  const { reference, amount: amountKobo, channel, paid_at, metadata } = input.payload.data;
  const amountNgn = amountKobo / 100;

  // 3. Idempotency check — reject duplicate references
  const existing = await db
    .select()
    .from(feePayments)
    .where(eq(feePayments.paystackReference, reference));

  if (existing.length > 0) {
    return { processed: false }; // Already processed
  }

  const invoiceId = metadata?.invoice_id;
  const installmentId = metadata?.installment_id ?? null;

  if (!invoiceId) {
    return { processed: false }; // Cannot attribute payment without invoice ID
  }

  // 4. Verify invoice belongs to this school
  const [invoice] = await db
    .select()
    .from(feeInvoices)
    .where(and(eq(feeInvoices.id, invoiceId), eq(feeInvoices.schoolId, input.schoolId)));

  if (!invoice) throw new Error("Invoice not found for this school.");

  // 5. Record payment (webhookVerified = true — only path that sets this flag)
  await db.insert(feePayments).values({
    schoolId: input.schoolId,
    invoiceId,
    installmentId: installmentId ?? null,
    paystackReference: reference,
    amount: amountNgn,
    channel: channel ?? null,
    paidAt: paid_at ? new Date(paid_at) : new Date(),
    webhookVerified: true,
    webhookPayload: input.payload as unknown as Record<string, unknown>,
  });

  // 6. Update invoice balance
  const newAmountPaid = (invoice.amountPaid ?? 0) + amountNgn;
  const newBalance = Math.max(0, invoice.totalAmount - newAmountPaid);
  const newStatus =
    newBalance <= 0 ? "paid" : newAmountPaid > 0 ? "partial" : "unpaid";

  await db
    .update(feeInvoices)
    .set({
      amountPaid: newAmountPaid,
      outstandingBalance: newBalance,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(feeInvoices.id, invoiceId));

  // 7. Find next unpaid installment for reminder
  const allInstallments = await db
    .select()
    .from(feeInstallments)
    .where(
      and(
        eq(feeInstallments.schoolId, input.schoolId),
        eq(feeInstallments.feeStructureId, invoice.feeStructureId)
      )
    )
    .orderBy(feeInstallments.sortOrder);

  const allPayments = await db
    .select()
    .from(feePayments)
    .where(and(eq(feePayments.schoolId, input.schoolId), eq(feePayments.invoiceId, invoiceId)));

  const paidInstallmentIds = new Set(
    allPayments.filter((p) => p.installmentId).map((p) => p.installmentId!)
  );

  const nextUnpaid = allInstallments.find((inst) => !paidInstallmentIds.has(inst.id));

  return {
    processed: true,
    invoiceId,
    nextUnpaidInstallment: nextUnpaid
      ? { id: nextUnpaid.id, label: nextUnpaid.label, dueDate: nextUnpaid.dueDate }
      : null,
  };
}

// ── Parent Dashboard Data ──────────────────────────────────────────────────

/**
 * Get all children (students) linked to a parent via studentGuardians.
 * Strictly scoped to schoolId.
 */
export async function getParentChildren(schoolId: string, parentId: string) {
  const links = await db
    .select({ studentId: studentGuardians.studentId })
    .from(studentGuardians)
    .where(
      and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.parentId, parentId))
    );

  if (links.length === 0) return [];

  const studentIds = links.map((l) => l.studentId);

  // Fetch each student — using multiple individual selects to avoid missing inArray export
  const childRecords = await Promise.all(
    studentIds.map((sid) =>
      db
        .select()
        .from(students)
        .where(and(eq(students.id, sid), eq(students.schoolId, schoolId)))
        .then((rows) => rows[0])
    )
  );

  return childRecords.filter(Boolean);
}

/**
 * Get attendance summary for one child.
 * Strictly scoped to schoolId AND studentId.
 */
export async function getChildAttendanceSummary(schoolId: string, studentId: string) {
  const records = await db
    .select()
    .from(studentAttendance)
    .where(
      and(eq(studentAttendance.schoolId, schoolId), eq(studentAttendance.studentId, studentId))
    )
    .orderBy(desc(studentAttendance.date));

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;

  return { total, present, absent, late, records: records.slice(0, 30) };
}

/**
 * Get academic scores for one child.
 * Strictly scoped to schoolId AND studentId.
 */
export async function getChildScores(schoolId: string, studentId: string) {
  return db
    .select()
    .from(studentScores)
    .where(
      and(eq(studentScores.schoolId, schoolId), eq(studentScores.studentId, studentId))
    )
    .orderBy(desc(studentScores.createdAt));
}

// ── Announcements ──────────────────────────────────────────────────────────

/**
 * Create an announcement (school-wide or class-specific).
 */
export async function createAnnouncement(input: {
  schoolId: string;
  classId?: string;
  title: string;
  body: string;
  publishedAt?: Date;
  expiresAt?: Date;
  createdById?: string;
}) {
  const [ann] = await db
    .insert(announcements)
    .values({
      schoolId: input.schoolId,
      classId: input.classId ?? null,
      title: input.title,
      body: input.body,
      publishedAt: input.publishedAt ?? new Date(),
      expiresAt: input.expiresAt ?? null,
      createdById: input.createdById ?? null,
    })
    .returning();
  return ann;
}

/**
 * Get visible announcements for a parent (school-wide + class-specific for their children).
 */
export async function getParentAnnouncements(
  schoolId: string,
  classIds: string[]
) {
  const now = new Date();

  const rows = await db
    .select()
    .from(announcements)
    .where(eq(announcements.schoolId, schoolId))
    .orderBy(desc(announcements.publishedAt));

  return rows.filter((a) => {
    if (a.expiresAt && a.expiresAt < now) return false;
    if (!a.publishedAt || a.publishedAt > now) return false;
    // Show if school-wide (classId null) or matches one of the parent's children's classes
    if (!a.classId) return true;
    return classIds.includes(a.classId);
  });
}
