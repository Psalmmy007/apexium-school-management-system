import { NextRequest, NextResponse } from "next/server";
import { createLightweightSchoolListing } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, address, state, city, schoolType, logoUrl } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "School name and school email are required." },
        { status: 400 }
      );
    }

    const result = await createLightweightSchoolListing({
      name,
      email,
      phone,
      address,
      state,
      city,
      schoolType,
      logoUrl,
    });

    return NextResponse.json({
      success: true,
      school: {
        id: result.school.id,
        name: result.school.name,
        slug: result.school.slug,
        email: result.school.email,
        state: result.school.state,
        city: result.school.city,
        schoolType: result.school.schoolType,
        listingStatus: result.school.listingStatus,
        listingVerified: result.school.listingVerified,
      },
      flaggedDomainMismatch: result.flaggedDomainMismatch,
      flagReason: result.flagReason,
      verificationToken: result.verificationToken, // Exposed in test mode / response for automated verification
      message: "School listing created. Please check your email to verify and publish your directory listing.",
    });
  } catch (error: any) {
    console.error("Error creating lightweight listing:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create school listing." },
      { status: 400 }
    );
  }
}
