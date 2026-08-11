import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createDriver, detectExpiringLicences, db, transportDrivers } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const expiring = searchParams.get("expiring") === "true";

  try {
    if (expiring) {
      const expiringDrivers = await detectExpiringLicences(user.schoolId);
      return NextResponse.json({ success: true, data: expiringDrivers });
    }

    const list = await db
      .select()
      .from(transportDrivers)
      .where(eq(transportDrivers.schoolId, user.schoolId))
      .orderBy(desc(transportDrivers.createdAt));

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const driver = await createDriver({
      schoolId: user.schoolId,
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      licenceNumber: body.licenceNumber,
      licenceExpiry: new Date(body.licenceExpiry),
      emergencyContact: body.emergencyContact,
      medicalFitnessExpiry: body.medicalFitnessExpiry ? new Date(body.medicalFitnessExpiry) : undefined,
    });

    return NextResponse.json({ success: true, data: driver });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
