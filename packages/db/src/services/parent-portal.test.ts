import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  students,
  studentGuardians,
  terms,
  createFeeStructureWithInstallments,
  createOrGetFeeInvoice,
  processPaystackWebhook,
  getStudentInvoices,
  getInvoiceInstallments,
  getParentChildren,
  createAnnouncement,
  getParentAnnouncements,
} from "../index";

// A deterministic fake secret key for test HMAC verification
const TEST_PAYSTACK_SECRET = "sk_test_verysecretkeyfortesting123456789";

function buildPaystackSignature(secret: string, rawBody: string): string {
  const crypto = require("crypto");
  return crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
}

describe("Milestone 12: Parent Portal — Fee, Webhook & Multi-Child Isolation Tests", () => {
  let schoolId: string;
  let parentId: string;
  let student1Id: string;
  let student2Id: string;
  let termId: string;
  let unrelatedParentId: string;

  beforeAll(async () => {
    // 1. Create test school
    const [sch] = await db
      .insert(schools)
      .values({ name: "Parent Portal Academy", slug: `pp-sch-${Date.now()}` })
      .returning();
    schoolId = sch.id;

    // 2. Create academic term
    const [term] = await db
      .insert(terms)
      .values({
        schoolId,
        name: "First Term",
        session: "2026/2027",
        isCurrent: true,
      })
      .returning();
    termId = term.id;

    // 3. Create parent user
    const [parent] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `parent-pp-${Date.now()}@test.edu`,
        role: "parent",
        firstName: "Mary",
        lastName: "Doe",
      })
      .returning();
    parentId = parent.id;

    // 4. Create 2 students linked to the parent
    const [s1] = await db
      .insert(students)
      .values({
        schoolId,
        admissionNumber: `PP-001-${Date.now()}`,
        firstName: "John",
        lastName: "Doe",
      })
      .returning();
    student1Id = s1.id;

    const [s2] = await db
      .insert(students)
      .values({
        schoolId,
        admissionNumber: `PP-002-${Date.now()}`,
        firstName: "Jane",
        lastName: "Doe",
      })
      .returning();
    student2Id = s2.id;

    await db.insert(studentGuardians).values([
      { schoolId, studentId: student1Id, parentId, relationship: "Mother" },
      { schoolId, studentId: student2Id, parentId, relationship: "Mother" },
    ]);

    // 5. Create an UNRELATED parent (should see zero children)
    const [unrel] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `unrel-pp-${Date.now()}@test.edu`,
        role: "parent",
        firstName: "Stranger",
        lastName: "Danger",
      })
      .returning();
    unrelatedParentId = unrel.id;
  }, 30000);

  it("creates a fee structure with 3 installments and generates correct invoices", async () => {
    const { structure, installments } = await createFeeStructureWithInstallments({
      schoolId,
      termId,
      name: "First Term School Fees 2026/2027",
      totalAmount: 75000,
      installments: [
        { label: "Installment 1", amount: 25000, dueDate: new Date("2026-09-01") },
        { label: "Installment 2", amount: 25000, dueDate: new Date("2026-10-01") },
        { label: "Installment 3", amount: 25000, dueDate: new Date("2026-11-01") },
      ],
    });

    expect(structure.id).toBeDefined();
    expect(installments).toHaveLength(3);
    expect(installments[0].label).toBe("Installment 1");
    expect(installments[0].amount).toBe(25000);
    expect(installments[1].sortOrder).toBe(2);
    expect(installments[2].sortOrder).toBe(3);

    // Create invoice for student1
    const invoice = await createOrGetFeeInvoice({
      schoolId,
      studentId: student1Id,
      feeStructureId: structure.id,
    });

    expect(invoice.totalAmount).toBe(75000);
    expect(invoice.amountPaid).toBe(0);
    expect(invoice.outstandingBalance).toBe(75000);
    expect(invoice.status).toBe("unpaid");

    // Idempotency check — calling again returns the SAME invoice
    const sameInvoice = await createOrGetFeeInvoice({
      schoolId,
      studentId: student1Id,
      feeStructureId: structure.id,
    });
    expect(sameInvoice.id).toBe(invoice.id);

    // Now simulate Paystack webhook for Installment 1
    const webhookPayload = {
      event: "charge.success",
      data: {
        reference: `pay_inst1_${Date.now()}`,
        amount: 2500000, // 25000 NGN in kobo
        channel: "card",
        paid_at: new Date().toISOString(),
        metadata: {
          invoice_id: invoice.id,
          installment_id: installments[0].id,
        },
      },
    };
    const rawBody = JSON.stringify(webhookPayload);
    const signature = buildPaystackSignature(TEST_PAYSTACK_SECRET, rawBody);

    const result = await processPaystackWebhook({
      schoolId,
      paystackSecretKey: TEST_PAYSTACK_SECRET,
      rawBody,
      signature,
      payload: webhookPayload,
    });

    expect(result.processed).toBe(true);
    expect(result.invoiceId).toBe(invoice.id);

    // Verify balance updated correctly
    const invoices = await getStudentInvoices(schoolId, student1Id);
    const updated = invoices[0];
    expect(updated.amountPaid).toBe(25000);
    expect(updated.outstandingBalance).toBe(50000);
    expect(updated.status).toBe("partial");

    // Verify next unpaid installment is Installment 2
    expect(result.nextUnpaidInstallment).not.toBeNull();
    expect(result.nextUnpaidInstallment?.label).toBe("Installment 2");

    // Verify duplicate webhook reference is rejected (idempotency)
    const duplicateResult = await processPaystackWebhook({
      schoolId,
      paystackSecretKey: TEST_PAYSTACK_SECRET,
      rawBody,
      signature,
      payload: webhookPayload,
    });
    expect(duplicateResult.processed).toBe(false);

    // Verify invalid signature is rejected
    await expect(
      processPaystackWebhook({
        schoolId,
        paystackSecretKey: TEST_PAYSTACK_SECRET,
        rawBody,
        signature: "bad_signature_that_wont_match",
        payload: webhookPayload,
      })
    ).rejects.toThrow("Invalid Paystack webhook signature.");
  });

  it("verifies parent with 2 children sees both correctly and only their own data", async () => {
    // Parent should see both children
    const children = await getParentChildren(schoolId, parentId);
    expect(children).toHaveLength(2);
    const ids = children.map((c) => c!.id);
    expect(ids).toContain(student1Id);
    expect(ids).toContain(student2Id);

    // Unrelated parent should see zero children
    const unrelatedChildren = await getParentChildren(schoolId, unrelatedParentId);
    expect(unrelatedChildren).toHaveLength(0);
  });

  it("creates and retrieves announcements scoped to school and class", async () => {
    // School-wide announcement
    const schoolWide = await createAnnouncement({
      schoolId,
      title: "End of Term Examination Notice",
      body: "Examinations begin on 15th November 2026.",
      publishedAt: new Date(Date.now() - 1000), // in the past so it shows immediately
    });
    expect(schoolWide.id).toBeDefined();

    // Get announcements for parent (classIds empty = school-wide only)
    const visible = await getParentAnnouncements(schoolId, []);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some((a) => a.id === schoolWide.id)).toBe(true);
  });
});
