import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { submitLeaveRequest, reviewLeaveRequest, approveLeaveRequest, db, hrLeaveRequests, hrEmployees } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: hrLeaveRequests.id,
        leaveType: hrLeaveRequests.leaveType,
        startDate: hrLeaveRequests.startDate,
        endDate: hrLeaveRequests.endDate,
        totalDays: hrLeaveRequests.totalDays,
        reason: hrLeaveRequests.reason,
        status: hrLeaveRequests.status,
        remarks: hrLeaveRequests.remarks,
        employeeName: hrEmployees.firstName,
        employeeLastName: hrEmployees.lastName,
        employeeNumber: hrEmployees.employeeNumber,
      })
      .from(hrLeaveRequests)
      .leftJoin(hrEmployees, eq(hrLeaveRequests.employeeId, hrEmployees.id))
      .where(eq(hrLeaveRequests.schoolId, user.schoolId))
      .orderBy(desc(hrLeaveRequests.createdAt));

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action || "submit";

    if (action === "submit") {
      const leave = await submitLeaveRequest({
        schoolId: user.schoolId,
        employeeId: body.employeeId,
        leaveType: body.leaveType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        totalDays: parseInt(body.totalDays, 10),
        reason: body.reason,
      });
      return NextResponse.json({ success: true, data: leave });
    }

    if (action === "review") {
      const leave = await reviewLeaveRequest(user.schoolId, body.leaveRequestId, user.id, body.remarks);
      return NextResponse.json({ success: true, data: leave });
    }

    if (action === "approve") {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden. Admin access required for leave approval." }, { status: 403 });
      }
      const leave = await approveLeaveRequest(user.schoolId, body.leaveRequestId, user.id, body.remarks);
      return NextResponse.json({ success: true, data: leave });
    }

    return NextResponse.json({ success: false, error: "Invalid leave action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
