/**
 * GET, POST, PATCH /api/inventory/purchase-orders
 *
 * GET: List purchase orders.
 * POST: Create a purchase order.
 * PATCH: Receive purchase order (triggers stock-in + Finance expense integration).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createPurchaseOrder,
  receivePurchaseOrder,
  assertTenantAccess,
  db,
  purchaseOrders,
} from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);

    const orders = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.schoolId, tenant.schoolId))
      .orderBy(desc(purchaseOrders.createdAt));

    return NextResponse.json({ purchaseOrders: orders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch purchase orders";
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

    const { supplierId, items, notes } = body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Supplier ID and at least one item are required" }, { status: 400 });
    }

    const po = await createPurchaseOrder({
      schoolId: tenant.schoolId,
      supplierId,
      items,
      notes,
      createdBy: user.id,
    });

    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create purchase order";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const body = await req.json();
    const { purchaseOrderId, action } = body;

    if (!purchaseOrderId || action !== "receive") {
      return NextResponse.json({ error: "Purchase Order ID and action 'receive' are required" }, { status: 400 });
    }

    const po = await receivePurchaseOrder({
      schoolId: tenant.schoolId,
      purchaseOrderId,
      performedBy: user.id,
    });

    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to receive purchase order";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
