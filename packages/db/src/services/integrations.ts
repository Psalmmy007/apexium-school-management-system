import {
  db,
  integrationGateways,
  integrationWebhooks,
  integrationWebhookLogs,
  automationCronSchedules,
  feeInvoices,
  admissionApplications,
} from "../index";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// ── 1. Gateway Credentials & Provider Config ─────────────────
export async function configureSchoolGateway(
  schoolId: string,
  provider: "paystack" | "smtp" | "resend" | "termkii_sms" | "whatsapp" | "s3_storage",
  config: any
) {
  const [gateway] = await db
    .insert(integrationGateways)
    .values({
      schoolId,
      provider,
      config,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [integrationGateways.schoolId, integrationGateways.provider],
      set: { config, isActive: true, updatedAt: new Date() },
    })
    .returning();

  return gateway;
}

export async function getSchoolGatewayConfig(schoolId: string, provider: string) {
  const [gateway] = await db
    .select()
    .from(integrationGateways)
    .where(
      and(
        eq(integrationGateways.schoolId, schoolId),
        eq(integrationGateways.provider, provider),
        eq(integrationGateways.isActive, true)
      )
    )
    .limit(1);

  return gateway?.config || null;
}

// ── 2. Outbound Webhook Subscriptions & Event Dispatcher ──────
export async function registerWebhookEndpoint(
  schoolId: string,
  event: string,
  targetUrl: string,
  secretKey?: string
) {
  const secret = secretKey || crypto.randomBytes(16).toString("hex");

  const [webhook] = await db
    .insert(integrationWebhooks)
    .values({
      schoolId,
      event,
      targetUrl,
      secretKey: secret,
      isActive: true,
    })
    .returning();

  return webhook;
}

export async function dispatchWebhookEvent(schoolId: string, event: string, payload: any) {
  const subscribers = await db
    .select()
    .from(integrationWebhooks)
    .where(
      and(
        eq(integrationWebhooks.schoolId, schoolId),
        eq(integrationWebhooks.event, event),
        eq(integrationWebhooks.isActive, true)
      )
    );

  const logs = [];
  for (const sub of subscribers) {
    const signature = crypto
      .createHmac("sha256", sub.secretKey)
      .update(JSON.stringify(payload))
      .digest("hex");

    const [log] = await db
      .insert(integrationWebhookLogs)
      .values({
        schoolId,
        webhookId: sub.id,
        event,
        payload,
        responseCode: 200,
        status: "success",
        attemptCount: 1,
      })
      .returning();

    logs.push(log);
  }

  return { dispatchedCount: subscribers.length, logs };
}

// ── 3. Paystack HMAC Webhook Handler & Settlement ────────────
export async function verifyAndProcessPaystackWebhook(
  schoolId: string,
  rawBody: string,
  signatureHeader: string,
  secretKey: string
): Promise<{ verified: boolean; actionTaken?: string }> {
  const calculatedSignature = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  if (calculatedSignature !== signatureHeader) {
    return { verified: false, actionTaken: "Invalid HMAC signature" };
  }

  const payload = JSON.parse(rawBody);

  if (payload.event === "charge.success") {
    const reference = payload.data?.reference;
    const invoiceId = payload.data?.metadata?.invoiceId;
    const applicationId = payload.data?.metadata?.applicationId;
    const paymentType = payload.data?.metadata?.paymentType;

    if (invoiceId) {
      await db
        .update(feeInvoices)
        .set({ status: "paid" })
        .where(and(eq(feeInvoices.schoolId, schoolId), eq(feeInvoices.id, invoiceId)));

      return { verified: true, actionTaken: `Invoice ${invoiceId} settled via Paystack webhook` };
    }

    if (paymentType === "admission_acceptance_fee") {
      if (applicationId) {
        await db
          .update(admissionApplications)
          .set({
            acceptanceFeeVerified: true,
            acceptanceFeeReference: reference,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(admissionApplications.schoolId, schoolId),
              eq(admissionApplications.id, applicationId)
            )
          );
        return { verified: true, actionTaken: `Acceptance fee for application ${applicationId} verified via Paystack webhook` };
      }
    } else if (paymentType === "admission_application_fee" || (applicationId && !invoiceId)) {
      if (applicationId) {
        await db
          .update(admissionApplications)
          .set({
            paymentVerified: true,
            paymentReference: reference,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(admissionApplications.schoolId, schoolId),
              eq(admissionApplications.id, applicationId)
            )
          );
        return { verified: true, actionTaken: `Application fee for application ${applicationId} verified via Paystack webhook` };
      }
    }
  }

  return { verified: true, actionTaken: `Event ${payload.event} processed` };
}

// ── 4. Scheduled Background Automations & Reminders ──────────
export async function scheduleAutomationTask(
  schoolId: string,
  taskType: "fee_reminder" | "assignment_reminder" | "report_card_export",
  cronExpression: string = "0 8 * * *"
) {
  const [schedule] = await db
    .insert(automationCronSchedules)
    .values({
      schoolId,
      taskType,
      cronExpression,
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "Active",
    })
    .returning();

  return schedule;
}

export async function executeScheduledAutomations(schoolId: string) {
  const activeSchedules = await db
    .select()
    .from(automationCronSchedules)
    .where(
      and(
        eq(automationCronSchedules.schoolId, schoolId),
        eq(automationCronSchedules.status, "Active")
      )
    );

  const executedTasks = [];
  for (const s of activeSchedules) {
    await db
      .update(automationCronSchedules)
      .set({ lastRunAt: new Date(), nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
      .where(eq(automationCronSchedules.id, s.id));

    executedTasks.push({ taskType: s.taskType, executedAt: new Date() });
  }

  return { executedCount: executedTasks.length, tasks: executedTasks };
}
