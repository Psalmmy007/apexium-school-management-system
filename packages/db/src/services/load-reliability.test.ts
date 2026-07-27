import { describe, it, expect } from "vitest";
import { runReliabilityLoadTest } from "./load-test.js";

describe("Milestone 7: Load & Reliability Hardening", () => {
  it("executes 5-10x concurrent multi-tenant load test without crashes or errors", async () => {
    const metrics = await runReliabilityLoadTest(5, 30);

    expect(metrics.failedRequests).toBe(0);
    expect(metrics.successfulRequests).toBeGreaterThan(5);
    expect(metrics.avgLatencyMs).toBeLessThan(1000);
    expect(metrics.p95LatencyMs).toBeLessThan(2000);
  }, 45000);
});
