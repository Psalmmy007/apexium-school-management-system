import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const studentId = searchParams.get("studentId"); // admissionNumber

  if (!jobId || !studentId) {
    return NextResponse.json({ success: false, error: "Missing jobId or studentId" }, { status: 400 });
  }

  // Resolve the PDF path inside apps/worker/public/reports/[schoolId]/[jobId]/report-[studentId].pdf
  const filePath = path.join(
    process.cwd(),
    "..",
    "worker",
    "public",
    "reports",
    user.schoolId,
    jobId,
    `report-${studentId}.pdf`
  );

  try {
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${studentId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Error reading report PDF:", err.message);
    return NextResponse.json({ success: false, error: "Report PDF file not found" }, { status: 404 });
  }
}
