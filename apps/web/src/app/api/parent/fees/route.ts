import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getParentChildren,
  getStudentInvoices,
  getInvoiceInstallments,
  createOrGetFeeInvoice,
} from "@apexium/db";

// GET /api/parent/fees?studentId=<id>
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "parent") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const invoiceId = searchParams.get("invoiceId");

  if (!studentId) {
    return NextResponse.json({ success: false, error: "studentId is required" }, { status: 400 });
  }

  // Validate parent owns this student
  const children = await getParentChildren(user.schoolId, user.id);
  const owns = children.some((c) => c && c.id === studentId);
  if (!owns) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    if (invoiceId) {
      const detail = await getInvoiceInstallments(user.schoolId, invoiceId);
      return NextResponse.json({ success: true, data: detail });
    }
    const invoices = await getStudentInvoices(user.schoolId, studentId);
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch fees";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
