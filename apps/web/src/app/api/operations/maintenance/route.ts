import { NextResponse } from "next/server";
import {
  getMaintenanceState,
  enableMaintenanceMode,
  disableMaintenanceMode,
} from "@apexium/db";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";

/**
 * GET /api/operations/maintenance
 * Returns current maintenance mode state.
 * Publicly readable so the frontend can display a maintenance banner.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(getMaintenanceState());
}

/**
 * POST /api/operations/maintenance
 * Enable or disable maintenance mode. Strictly restricted to verified platform_operator role.
 * Body: { action: "enable" | "disable", message?: string, estimatedRestoreAt?: string }
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOperator = await verifyPlatformOperator(user);
    if (!isOperator || user.role !== "platform_operator") {
      return NextResponse.json(
        { error: "Forbidden: Platform Operator authorization required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, message, estimatedRestoreAt } = body as {
      action: "enable" | "disable";
      message?: string;
      estimatedRestoreAt?: string;
    };

    if (action === "enable") {
      const state = enableMaintenanceMode(
        user.email,
        message,
        estimatedRestoreAt
      );
      return NextResponse.json({ success: true, maintenance: state });
    } else if (action === "disable") {
      const state = disableMaintenanceMode();
      return NextResponse.json({ success: true, maintenance: state });
    } else {
      return NextResponse.json(
        { error: 'action must be "enable" or "disable"' },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Maintenance mode update failed", details: String(err) },
      { status: 500 }
    );
  }
}
