import { NextResponse } from "next/server";
import { verifyAndProcessPaystackWebhook, getSchoolGatewayConfig } from "@apexium/db";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";
    const schoolId = req.headers.get("x-school-id") || "";

    const paystackConfig: any = schoolId ? await getSchoolGatewayConfig(schoolId, "paystack") : null;
    const secretKey = paystackConfig?.secretKey || process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_secret_key";

    const result = await verifyAndProcessPaystackWebhook(schoolId, rawBody, signature, secretKey);

    return NextResponse.json({ success: result.verified, message: result.actionTaken });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
