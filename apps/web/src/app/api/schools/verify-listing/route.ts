import { NextRequest, NextResponse } from "next/server";
import { verifySchoolListingToken } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || "";

    if (!token) {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const school = await verifySchoolListingToken(token);

    // If request accepts JSON or explicitly requests json
    const acceptsJson = req.headers.get("accept")?.includes("application/json") || searchParams.get("format") === "json";
    if (acceptsJson) {
      return NextResponse.json({
        success: true,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          listingStatus: school.listingStatus,
          listingVerified: school.listingVerified,
        },
        message: "School listing verified successfully and is now active in the directory.",
      });
    }

    // Otherwise redirect to the verified school's directory gateway
    const baseUrl = req.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/s/${school.slug}?verified=true`);
  } catch (error: any) {
    console.error("Error verifying school listing:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify school listing." },
      { status: 400 }
    );
  }
}
