import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { processPaystackWebhook, type PaystackWebhookPayload } from "@apexium/db";
import { db, schools } from "@apexium/db";
import { eq } from "drizzle-orm";

// Paystack sends schoolId in webhook metadata.school_id OR we derive it from invoice.
// We resolve schoolId from the invoice record inside processPaystackWebhook.
// Here we validate the signature first.
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

// POST /api/paystack/webhook
// The webhook — NOT the client-side response — is the sole source of payment truth.
export async function POST(request: NextRequest) {
  const headersList = await headers();
  const signature = headersList.get("x-paystack-signature") ?? "";

  const rawBody = await request.text();

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  // The schoolId must be embedded in webhook metadata for multi-tenant routing
  const schoolIdFromMeta = (payload.data?.metadata as Record<string, string> | undefined)
    ?.school_id;

  if (!schoolIdFromMeta) {
    return NextResponse.json({ success: false, error: "Missing school_id in metadata" }, { status: 400 });
  }

  // Verify school exists
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, schoolIdFromMeta));

  if (!school) {
    return NextResponse.json({ success: false, error: "School not found" }, { status: 400 });
  }

  try {
    const result = await processPaystackWebhook({
      schoolId: school.id,
      paystackSecretKey: PAYSTACK_SECRET,
      rawBody,
      signature,
      payload,
    });

    if (!result.processed) {
      // Return 200 to Paystack even for skipped events (Paystack expects 200 for all webhooks)
      return NextResponse.json({ success: true, message: "Webhook acknowledged, not processed" });
    }

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      nextUnpaidInstallment: result.nextUnpaidInstallment,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Webhook processing failed";
    // Return 400 for invalid signature so Paystack knows to retry
    if (msg.includes("Invalid Paystack webhook signature")) {
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
