/**
 * Platform Operator Role Model Separation & Server-Side Route Security Tests
 *
 * PROOF CRITERIA:
 * 1. A regular school administrator (role: "admin") is REJECTED with HTTP 403 Forbidden
 *    from /api/platform/schools, /api/saas/analytics, and platform diagnostics.
 * 2. An unauthenticated request is REJECTED with HTTP 401 Unauthorized.
 * 3. A genuine platform operator (role: "platform_operator") is ALLOWED access (HTTP 200 OK).
 * 4. The school admin sidebar (DashboardShell) contains ZERO links or references to
 *    /platform or "SaaS Platform Operator".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Import Route Handlers
import { GET as getPlatformSchools } from "./api/platform/schools/route";
import { GET as getSaasAnalytics } from "./api/saas/analytics/route";
import { GET as getDiagnostics, POST as postDiagnostics } from "./api/operations/diagnostics/route";
import { GET as getBenchmark, POST as postBenchmark } from "./api/performance/benchmark/route";
import { GET as getAdminLicenses } from "./api/admin/licenses/route";
import { DashboardShell } from "@/components/DashboardShell";
import type { SessionUser } from "@apexium/types";

// Mock Supabase Server Client & Auth
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock Database Calls
vi.mock("@apexium/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@apexium/db")>();
  const mockRows = [
    {
      id: "sch-1",
      name: "Apexium School",
      slug: "apexium-school",
      isActive: true,
      createdAt: new Date(),
    },
  ];
  return {
    ...actual,
    db: {
      select: vi.fn().mockImplementation(() => {
        const queryResult: any = Promise.resolve(mockRows);
        queryResult.from = vi.fn().mockImplementation(() => {
          const fromResult: any = Promise.resolve(mockRows);
          fromResult.where = vi.fn().mockImplementation(() => {
            const whereResult: any = Promise.resolve(mockRows);
            whereResult.limit = vi.fn().mockResolvedValue(mockRows);
            return whereResult;
          });
          return fromResult;
        });
        return queryResult;
      }),
    },
    isPlatformOperator: vi.fn().mockImplementation(async (userId: string) => {
      return userId === "verified-platform-operator-uuid";
    }),
    getSaasPlatformMetrics: vi.fn().mockResolvedValue({
      totalSchools: 12,
      activeSchools: 10,
      suspendedSchools: 2,
      activeSubscriptions: 10,
      expiredSubscriptions: 2,
      termlyRecurringRevenue: 15000000,
      monthlyRecurringRevenue: 5000000,
      churnRatePercent: 2.5,
      totalCollectedRevenue: 45000000,
    }),
    getPlatformHealthReport: vi.fn().mockResolvedValue({
      uptime: { platform: "healthy", seconds: 12345 },
    }),
  };
});

// Mock Session Resolution
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    getSessionUser: vi.fn(),
    verifyPlatformOperator: vi.fn().mockImplementation(async (user: SessionUser | null) => {
      if (!user) return false;
      return user.role === "platform_operator";
    }),
  };
});

import { getSessionUser } from "@/lib/auth/session";

describe("Platform Role Separation & Server-Side Security Lockdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Rejection of Regular School Admin (role: 'admin')", () => {
    const schoolAdminUser: SessionUser = {
      id: "school-admin-uuid-1234",
      schoolId: "apexium-international-school-uuid",
      email: "principal@apexiumschool.ng",
      role: "admin", // Regular School Administrator
      firstName: "School",
      lastName: "Principal",
    };

    it("REJECTS regular school admin from GET /api/platform/schools with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new NextRequest("http://localhost:3000/api/platform/schools");
      const res = await getPlatformSchools(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });

    it("REJECTS regular school admin from GET /api/saas/analytics with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new NextRequest("http://localhost:3000/api/saas/analytics");
      const res = await getSaasAnalytics(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });

    it("REJECTS regular school admin from GET /api/operations/diagnostics with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new Request("http://localhost:3000/api/operations/diagnostics");
      const res = await getDiagnostics(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });

    it("REJECTS regular school admin from POST /api/operations/diagnostics with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new Request("http://localhost:3000/api/operations/diagnostics", {
        method: "POST",
        body: JSON.stringify({ action: "simulate_deployment" }),
      });
      const res = await postDiagnostics(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });

    it("REJECTS regular school admin from GET /api/performance/benchmark with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new Request("http://localhost:3000/api/performance/benchmark");
      const res = await getBenchmark(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });

    it("REJECTS regular school admin from POST /api/performance/benchmark with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new Request("http://localhost:3000/api/performance/benchmark", {
        method: "POST",
        body: JSON.stringify({ schoolCount: 5 }),
      });
      const res = await postBenchmark(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });

    it("REJECTS regular school admin from GET /api/admin/licenses with HTTP 403 Forbidden", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(schoolAdminUser);

      const req = new NextRequest("http://localhost:3000/api/admin/licenses");
      const res = await getAdminLicenses(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Platform Operator");
    });
  });

  describe("2. Rejection of Unauthenticated Requests", () => {
    it("REJECTS unauthenticated requests with HTTP 401 Unauthorized", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/platform/schools");
      const res = await getPlatformSchools(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("3. Acceptance of Verified Platform Operator (role: 'platform_operator')", () => {
    const platformOperatorUser: SessionUser = {
      id: "verified-platform-operator-uuid",
      schoolId: null, // Platform Operator is not bound to any individual school
      email: "founder@apexium.io",
      role: "platform_operator",
      firstName: "Founder",
      lastName: "Operator",
    };

    it("ALLOWS verified platform operator access to GET /api/platform/schools with HTTP 200 OK", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(platformOperatorUser);

      const req = new NextRequest("http://localhost:3000/api/platform/schools");
      const res = await getPlatformSchools(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.schools).toBeDefined();
    });

    it("ALLOWS verified platform operator access to GET /api/saas/analytics with HTTP 200 OK", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(platformOperatorUser);

      const req = new NextRequest("http://localhost:3000/api/saas/analytics");
      const res = await getSaasAnalytics(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.metrics).toBeDefined();
      expect(json.metrics.totalSchools).toBe(12);
    });

    it("ALLOWS verified platform operator access to GET /api/admin/licenses with HTTP 200 OK", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(platformOperatorUser);

      const req = new NextRequest("http://localhost:3000/api/admin/licenses");
      const res = await getAdminLicenses(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });
  });

  describe("4. School Admin Navigation Cleanliness", () => {
    it("ENSURES DashboardShell for role 'admin' does NOT render any link to /platform or 'SaaS Platform Operator'", () => {
      const adminUser = {
        firstName: "Tunde",
        lastName: "Bakare",
        role: "admin",
      };

      const html = renderToString(
        React.createElement(
          DashboardShell,
          { user: adminUser },
          React.createElement("div", { id: "test-content" }, "Admin Page Content")
        )
      );

      // Verify complete absence of platform operator navigation
      expect(html).not.toContain('href="/platform"');
      expect(html).not.toContain('id="nav-platform"');
      expect(html).not.toContain("SaaS Platform Operator");
      expect(html).not.toContain("Platform Admin");
    });
  });
});
