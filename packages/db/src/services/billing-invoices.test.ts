import { describe, it, expect } from "vitest";
import { generateInvoiceNumber, createInvoiceForPayment } from "./billing-invoices";
import { randomUUID } from "crypto";

describe("Milestone 29 — Billing Invoices Service", () => {
  it("should generate valid unique invoice numbers with format INV-YYYY-XXXXX", () => {
    const inv1 = generateInvoiceNumber();
    const inv2 = generateInvoiceNumber();
    const year = new Date().getFullYear();

    expect(inv1).toMatch(new RegExp(`^INV-${year}-\\d{5}$`));
    expect(inv2).toMatch(new RegExp(`^INV-${year}-\\d{5}$`));
  });

  it("should calculate correct tax, discount, and total amounts", async () => {
    const schoolId = randomUUID();
    const subscriptionId = randomUUID();

    const invoice = await createInvoiceForPayment({
      schoolId,
      subscriptionId,
      subtotal: 35000,
      discountAmount: 5000,
      taxAmount: 0,
    });

    expect(invoice.subtotal).toBe(35000);
    expect(invoice.discountAmount).toBe(5000);
    expect(invoice.totalAmount).toBe(30000);
    expect(invoice.status).toBe("paid");
  });
});
