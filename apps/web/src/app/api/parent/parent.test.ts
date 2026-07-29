import { describe, it, expect } from "vitest";

describe("Milestone 12: Parent Portal API Endpoint Contracts", () => {
  it("exports parent API handler functions", async () => {
    const childrenRoute = await import("./children/route");
    const feesRoute = await import("./fees/route");
    const announcementsRoute = await import("./announcements/route");
    const webhookRoute = await import("../paystack/webhook/route");

    expect(childrenRoute.GET).toBeDefined();
    expect(feesRoute.GET).toBeDefined();
    expect(announcementsRoute.GET).toBeDefined();
    expect(webhookRoute.POST).toBeDefined();
  });
});
