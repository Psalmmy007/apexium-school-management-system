/**
 * POST /api/saas/register
 *
 * Creates a new school tenant, administrator user, SaaS membership,
 * subdomain, and onboarding session.
 *
 * Flow:
 *   1. Validate input
 *   2. Check for duplicate email/school
 *   3. Create Supabase Auth user
 *   4. Execute full school registration
 *   5. Return school slug, domain, and onboarding session ID
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  executeFullSchoolRegistration,
} from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolName,
      adminFirstName,
      adminLastName,
      adminEmail,
      password,
      phone,
      address,
    } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!schoolName?.trim()) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }
    if (!adminFirstName?.trim() || !adminLastName?.trim()) {
      return NextResponse.json({ error: "Administrator name is required" }, { status: 400 });
    }
    if (!adminEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json({ error: "Valid administrator email is required" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (schoolName.trim().length < 3) {
      return NextResponse.json({ error: "School name must be at least 3 characters" }, { status: 400 });
    }

    // ── Create Supabase Auth user ────────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail.toLowerCase().trim(),
      password,
      user_metadata: {
        first_name: adminFirstName.trim(),
        last_name: adminLastName.trim(),
        role: "admin",
      },
      email_confirm: true, // Auto-confirm for now; can add email verification later
    });

    if (authError || !authData?.user) {
      const message = authError?.message || "Failed to create user account";
      if (message.includes("already registered") || message.includes("already exists")) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userId = authData.user.id;

    // ── Execute full registration ─────────────────────────────────────────────
    const result = await executeFullSchoolRegistration(
      {
        schoolName: schoolName.trim(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        adminEmail: adminEmail.toLowerCase().trim(),
        phone: phone?.trim(),
        address: address?.trim(),
      },
      userId
    );

    return NextResponse.json({
      success: true,
      schoolId: result.schoolId,
      schoolSlug: result.schoolSlug,
      domain: result.domain,
      onboardingSessionId: result.onboardingSessionId,
      adminUserId: result.adminUserId,
      message: `School "${schoolName}" registered successfully. Subdomain: ${result.domain}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Registration failed";
    console.error("[saas/register] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
