/**
 * GET & POST /api/inventory/assets
 *
 * GET: Fetch fixed assets for authenticated school or perform barcode/QR code lookup.
 * POST: Register a new fixed asset.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  registerAsset,
  getSchoolAssets,
  lookupAssetByCode,
  calculateDepreciation,
  assertTenantAccess,
} from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);

    const code = req.nextUrl.searchParams.get("code") || req.nextUrl.searchParams.get("scan");

    if (code) {
      const asset = await lookupAssetByCode(tenant.schoolId, code);
      if (!asset) {
        return NextResponse.json({ error: `Asset with barcode/QR '${code}' not found` }, { status: 404 });
      }

      const dep = calculateDepreciation({
        purchaseCost: asset.purchaseCost,
        residualValue: asset.residualValue,
        usefulLifeYears: asset.usefulLifeYears,
      });

      return NextResponse.json({ asset: { ...asset, depreciationInfo: dep } });
    }

    const assets = await getSchoolAssets(tenant.schoolId);
    return NextResponse.json({ assets });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch assets";
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

    if (!body.assetName?.trim() || !body.purchaseCost) {
      return NextResponse.json({ error: "Asset name and purchase cost are required" }, { status: 400 });
    }

    const asset = await registerAsset({
      schoolId: tenant.schoolId,
      assetName: body.assetName,
      category: body.category,
      description: body.description,
      purchaseCost: Number(body.purchaseCost),
      usefulLifeYears: body.usefulLifeYears ? Number(body.usefulLifeYears) : undefined,
      residualValue: body.residualValue ? Number(body.residualValue) : undefined,
      location: body.location,
      assignedDepartment: body.assignedDepartment,
      barcode: body.barcode,
      qrCode: body.qrCode,
    });

    return NextResponse.json({ success: true, asset });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to register asset";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
