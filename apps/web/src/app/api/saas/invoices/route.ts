/**
 * GET /api/saas/invoices
 *
 * Returns tax invoices for the authenticated school tenant.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSchoolInvoices, getInvoiceDetail, assertTenantAccess } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);

    const invoiceId = req.nextUrl.searchParams.get("id");

    if (invoiceId) {
      const detail = await getInvoiceDetail(invoiceId, tenant.schoolId);
      if (!detail) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json({ invoice: detail });
    }

    const invoices = await getSchoolInvoices(tenant.schoolId);
    return NextResponse.json({ invoices });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch invoices";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
