import { NextResponse } from "next/server";
import {
  createIncident,
  getIncidents,
  updateIncident,
  getIncidentById,
  type IncidentSeverity,
  type IncidentStatus,
} from "@apexium/db";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";

/**
 * GET /api/operations/incidents
 * List all incidents, optionally filtered by status or severity.
 * Strictly restricted to verified platform_operator role.
 */
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as IncidentStatus | null;
    const severity = searchParams.get("severity") as IncidentSeverity | null;

    const incidents = getIncidents({
      status: status ?? undefined,
      severity: severity ?? undefined,
    });

    return NextResponse.json({ incidents, total: incidents.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to retrieve incidents", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/operations/incidents
 * Create a new incident. Strictly restricted to verified platform_operator role.
 */
export async function POST(req: Request) {
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
    const { title, description, severity, affectedSchoolIds } = body as {
      title: string;
      description: string;
      severity: IncidentSeverity;
      affectedSchoolIds?: string[];
    };

    if (!title || !description || !severity) {
      return NextResponse.json(
        { error: "title, description, and severity are required" },
        { status: 400 }
      );
    }

    const incident = createIncident({
      title,
      description,
      severity,
      affectedSchoolIds,
      createdBy: user.email,
    });

    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create incident", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/operations/incidents
 * Update an existing incident with a status change and message.
 * Strictly restricted to verified platform_operator role.
 */
export async function PATCH(req: Request) {
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
    const { incidentId, message, status } = body as {
      incidentId: string;
      message: string;
      status: IncidentStatus;
    };

    if (!incidentId || !message || !status) {
      return NextResponse.json(
        { error: "incidentId, message, and status are required" },
        { status: 400 }
      );
    }

    const updated = updateIncident({
      incidentId,
      message,
      status,
      updatedBy: user.email,
    });

    if (!updated) {
      return NextResponse.json(
        { error: `Incident ${incidentId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, incident: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update incident", details: String(err) },
      { status: 500 }
    );
  }
}
