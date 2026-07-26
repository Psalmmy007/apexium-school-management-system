import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { parseCsv, processBulkStudentImport } from "@apexium/db";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { csvText } = await request.json();

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json(
        { success: false, error: "Please provide valid CSV content" },
        { status: 400 }
      );
    }

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSV file is empty or missing headers" },
        { status: 400 }
      );
    }

    // Process bulk import strictly stamped with user's schoolId
    const report = await processBulkStudentImport(user.schoolId, rows);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process bulk import" },
      { status: 500 }
    );
  }
}
