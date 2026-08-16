import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";
import { listAllSchoolLicenses } from "@apexium/db";

// ── GET /api/admin/licenses — Superadmin multi-tenant license audit ─
// Strictly restricted to verified platform_operator role.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Verify platform_operator role (School admins MUST be rejected with 403)
  const isOperator = await verifyPlatformOperator(user);
  if (!isOperator || user.role !== "platform_operator") {
    return NextResponse.json(
      { success: false, error: "Forbidden: Platform Operator authorization required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const tier = searchParams.get("tier") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  try {
    const data = await listAllSchoolLicenses({ search, tier, status, page, pageSize });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch superadmin license directory" },
      { status: 500 }
    );
  }
}

