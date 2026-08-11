/**
 * POST /api/inventory/transactions
 *
 * Records stock movements: stock_in or stock_out.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  recordStockIn,
  recordStockOut,
  assertTenantAccess,
} from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const body = await req.json();

    const { inventoryItemId, type, quantity, unitCost, reference, reason } = body;

    if (!inventoryItemId || !type || !quantity) {
      return NextResponse.json({ error: "Item ID, type, and quantity are required" }, { status: 400 });
    }

    let updatedItem;

    if (type === "stock_in") {
      updatedItem = await recordStockIn({
        schoolId: tenant.schoolId,
        inventoryItemId,
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : undefined,
        reference,
        reason,
        performedBy: user.id,
      });
    } else if (type === "stock_out") {
      updatedItem = await recordStockOut({
        schoolId: tenant.schoolId,
        inventoryItemId,
        quantity: Number(quantity),
        reference,
        reason,
        performedBy: user.id,
      });
    } else {
      return NextResponse.json({ error: "Invalid movement type. Must be stock_in or stock_out" }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record stock transaction";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
