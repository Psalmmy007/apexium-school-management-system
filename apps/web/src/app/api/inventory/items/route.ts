/**
 * GET & POST /api/inventory/items
 *
 * GET: Fetch inventory items for authenticated school.
 * POST: Create a new inventory item.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createInventoryItem,
  getInventoryItems,
  assertTenantAccess,
} from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);

    const category = req.nextUrl.searchParams.get("category") || undefined;
    const lowStockOnly = req.nextUrl.searchParams.get("lowStock") === "true";

    const items = await getInventoryItems(tenant.schoolId, { category, lowStockOnly });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch inventory items";
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
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const item = await createInventoryItem({
      schoolId: tenant.schoolId,
      name: body.name,
      description: body.description,
      category: body.category,
      unit: body.unit,
      sku: body.sku,
      initialQuantity: body.initialQuantity,
      minimumQuantity: body.minimumQuantity,
      unitCost: body.unitCost,
    });

    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create inventory item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
