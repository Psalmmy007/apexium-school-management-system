import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getLocalJob } from "@/lib/reports/report-card-service";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ success: false, error: "Missing jobId" }, { status: 400 });
  }

  const job = getLocalJob(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found or expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      totalStudents: job.totalStudents,
      completedCount: job.files.length,
      files: job.files,
      error: job.error,
    },
  });
}
