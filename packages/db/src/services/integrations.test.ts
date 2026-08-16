import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  students,
  terms,
  feeStructures,
  feeInvoices,
  integrationGateways,
  integrationWebhooks,
  integrationWebhookLogs,
  automationCronSchedules,
} from "../index";
import {
  configureSchoolGateway,
  getSchoolGatewayConfig,
  registerWebhookEndpoint,
  dispatchWebhookEvent,
  verifyAndProcessPaystackWebhook,
  scheduleAutomationTask,
  executeScheduledAutomations,
} from "./integrations";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let studentAId: string;
let termAId: string;
let feeStructureAId: string;
let invoiceAId: string;

beforeAll(async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integration_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      config JSONB DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_gateway_school_provider ON integration_gateways(school_id, provider);

    CREATE TABLE IF NOT EXISTS integration_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      event VARCHAR(100) NOT NULL,
      target_url TEXT NOT NULL,
      secret_key VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS integration_webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      webhook_id UUID REFERENCES integration_webhooks(id) ON DELETE CASCADE,
      event VARCHAR(100) NOT NULL,
      payload JSONB DEFAULT '{}',
      response_code INTEGER,
      status VARCHAR(50) NOT NULL DEFAULT 'success',
      attempt_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS automation_cron_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      task_type VARCHAR(100) NOT NULL,
      cron_expression VARCHAR(50) NOT NULL,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const [sA] = await db
    .insert(schools)
    .values({ name: "Integration Test School A", slug: `int-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "Integration Test School B", slug: `int-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  studentAId = crypto.randomUUID();
  await db.insert(students).values({
    id: studentAId,
    schoolId: schoolAId,
    firstName: "Integration",
    lastName: "Student",
    admissionNumber: `ADM-INT-${Date.now()}`,
    status: "active",
  });

  termAId = crypto.randomUUID();
  await db.insert(terms).values({
    id: termAId,
    schoolId: schoolAId,
    name: "First Term",
    session: "2025/2026",
  });

  feeStructureAId = crypto.randomUUID();
  await db.insert(feeStructures).values({
    id: feeStructureAId,
    schoolId: schoolAId,
    termId: termAId,
    name: "Tuition Fee",
    totalAmount: 45000,
  });

  invoiceAId = crypto.randomUUID();

  // Create mock invoice
  await db.insert(feeInvoices).values({
    id: invoiceAId,
    schoolId: schoolAId,
    studentId: studentAId,
    feeStructureId: feeStructureAId,
    totalAmount: 45000,
    amountPaid: 0,
    outstandingBalance: 45000,
    status: "pending",
  });
});

describe("Milestone 25 Integrations & Automation Platform Tests", () => {
  // 1. Gateway Configuration
  it("provisions and retrieves tenant-scoped gateway credentials for Paystack & SMTP", async () => {
    const gw = await configureSchoolGateway(schoolAId, "paystack", {
      publicKey: "pk_test_12345",
      secretKey: "sk_test_67890",
    });

    expect(gw).toBeDefined();
    expect(gw.schoolId).toBe(schoolAId);

    const config = await getSchoolGatewayConfig(schoolAId, "paystack");
    expect((config as any)?.publicKey).toBe("pk_test_12345");
  });

  // 2. Paystack HMAC Signature Verification & Invoice Settlement
  it("verifies HMAC SHA512 Paystack webhook signature and settles fee invoice", async () => {
    const secret = "sk_test_67890";
    const payloadObj = {
      event: "charge.success",
      data: {
        reference: "ref_100200300",
        metadata: { invoiceId: invoiceAId },
      },
    };
    const rawBody = JSON.stringify(payloadObj);

    const validSignature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

    const result = await verifyAndProcessPaystackWebhook(schoolAId, rawBody, validSignature, secret);
    expect(result.verified).toBe(true);
    expect(result.actionTaken).toContain("Invoice");

    const [inv] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceAId));
    expect(inv.status).toBe("paid");
  });

  // 3. Outbound Webhook Subscriptions & Event Dispatcher
  it("registers outbound webhook endpoint and dispatches HMAC-signed payload", async () => {
    const webhook = await registerWebhookEndpoint(
      schoolAId,
      "student.enrolled",
      "https://example-webhook-receiver.com/intake"
    );

    expect(webhook).toBeDefined();

    const dispatch = await dispatchWebhookEvent(schoolAId, "student.enrolled", {
      studentId: "std_1001",
      name: "John Doe",
    });

    expect(dispatch.dispatchedCount).toBeGreaterThan(0);
    expect(dispatch.logs[0].status).toBe("success");
  });

  // 4. Background Scheduled Automation Triggers
  it("schedules background automation task and executes triggers", async () => {
    const sched = await scheduleAutomationTask(schoolAId, "fee_reminder", "0 8 * * *");
    expect(sched).toBeDefined();

    const exec = await executeScheduledAutomations(schoolAId);
    expect(exec.executedCount).toBeGreaterThan(0);
    expect(exec.tasks[0].taskType).toBe("fee_reminder");
  });

  // 5. Multi-Tenant Gateway Isolation
  it("enforces complete multi-tenant isolation on gateway configurations", async () => {
    const configB = await getSchoolGatewayConfig(schoolBId, "paystack");
    expect(configB).toBeNull(); // Isolated from School A
  });
});
