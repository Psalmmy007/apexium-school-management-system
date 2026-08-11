import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { exportAnalyticsDataset } from "@apexium/db";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get("type") || "executive";
  const format = (searchParams.get("format") || "csv") as "pdf" | "excel" | "csv";

  try {
    const content = await exportAnalyticsDataset(user.schoolId, reportType, format);

    if (format === "pdf") {
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${reportType}_analytics_report.html"`,
        },
      });
    }

    if (format === "excel") {
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="${reportType}_analytics_report.xls"`,
        },
      });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${reportType}_analytics_report.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
