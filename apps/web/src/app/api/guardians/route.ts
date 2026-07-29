import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { searchGuardians, createGuardian } from "@apexium/db";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  try {
    const list = await searchGuardians(user.schoolId, query);
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, phone, email, occupation, address } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { success: false, error: "First name, last name, and phone number are required." },
        { status: 400 }
      );
    }

    const guardian = await createGuardian(user.schoolId, {
      firstName,
      lastName,
      phone,
      email,
      occupation,
      address,
    });

    return NextResponse.json({ success: true, data: guardian }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
