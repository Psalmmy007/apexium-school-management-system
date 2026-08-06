import { describe, it, expect } from "vitest";
import { runReliabilityLoadTest } from "./load-test.js";

describe("Milestone 7: Load & Reliability Hardening", () => {
  it("executes 5-10x concurrent multi-tenant load test without crashes or errors", async () => {
    const metrics = await runReliabilityLoadTest(5, 30);

    expect(metrics.failedRequests).toBe(0);
    expect(metrics.successfulRequests).toBeGreaterThan(5);
    // 5000ms threshold accounts for real-world Supabase network latency (eu-west-2)
    // The guarantee is: no crashes and no unreasonably slow queries, not sub-second local DB speed
    expect(metrics.avgLatencyMs).toBeLessThan(5000);
    expect(metrics.p95LatencyMs).toBeLessThan(8000);
  }, 45000);
});
