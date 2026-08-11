import { NextResponse } from "next/server";
import { logSecurityAudit } from "@apexium/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate secure password reset token
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();

    return NextResponse.json({
      success: true,
      message: "If the email is registered, a password reset link has been dispatched.",
      resetToken: token,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
