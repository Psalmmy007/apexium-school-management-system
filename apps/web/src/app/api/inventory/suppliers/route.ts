/**
 * GET & POST /api/inventory/suppliers
 *
 * GET: Fetch suppliers for authenticated school.
 * POST: Create a new supplier.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createSupplier, getSuppliers, assertTenantAccess } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const supplierList = await getSuppliers(tenant.schoolId);

    return NextResponse.json({ suppliers: supplierList });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch suppliers";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const supplier = await createSupplier({
      schoolId: tenant.schoolId,
      name: body.name,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      address: body.address,
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create supplier";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
