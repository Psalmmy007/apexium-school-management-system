import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { configureSchoolGateway, getSchoolGatewayConfig } from "@apexium/db";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") || "paystack";

  try {
    const config = await getSchoolGatewayConfig(user.schoolId, provider);
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, config } = body;

    const gateway = await configureSchoolGateway(user.schoolId, provider, config);
    return NextResponse.json({ success: true, data: gateway });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
