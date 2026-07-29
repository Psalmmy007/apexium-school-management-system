import { describe, it, expect } from "vitest";

describe("Milestone 13: Student Portal API Endpoint Contracts", () => {
  it("exports student API route handler functions", async () => {
    const dashboardRoute = await import("./dashboard/route");
    const timetableRoute = await import("./timetable/route");
    const attendanceRoute = await import("./attendance/route");
    const academicsRoute = await import("./academics/route");
    const cbtRoute = await import("./cbt/route");
    const lmsRoute = await import("./lms/route");
    const notificationsRoute = await import("./notifications/route");
    const profileRoute = await import("./profile/route");

    expect(dashboardRoute.GET).toBeDefined();
    expect(timetableRoute.GET).toBeDefined();
    expect(attendanceRoute.GET).toBeDefined();
    expect(academicsRoute.GET).toBeDefined();
    expect(cbtRoute.GET).toBeDefined();
    expect(lmsRoute.GET).toBeDefined();
    expect(notificationsRoute.GET).toBeDefined();
    expect(notificationsRoute.POST).toBeDefined();
    expect(profileRoute.GET).toBeDefined();
    expect(profileRoute.PATCH).toBeDefined();
  });
});
