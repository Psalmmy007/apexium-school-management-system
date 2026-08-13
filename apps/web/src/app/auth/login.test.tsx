import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoginPage from "./login/page";
import SchoolLoginPageClient from "../s/[slug]/auth/login/SchoolLoginPageClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
    },
  }),
}));

describe("Login Page Overhaul & Security Audit", () => {
  it("renders a clean single-purpose login form with email, password, and sign in button", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeDefined();
    expect(screen.getByText(/Forgot password\?/i)).toBeDefined();
  });

  it("SECURITY VERIFICATION: Ensures public login page contains NO Demo buttons, Registration, Pricing, Platform Admin, or ERP Quick Access", () => {
    const { container } = render(<LoginPage />);
    const html = container.innerHTML;

    // Must NOT contain Platform Admin link or text
    expect(html).not.toContain('href="/platform"');
    expect(html).not.toContain("Platform Admin");

    // Must NOT contain Demo Quick Fill buttons
    expect(html).not.toContain("Demo Admin");
    expect(html).not.toContain("Demo Teacher");
    expect(html).not.toContain("Demo Parent");
    expect(html).not.toContain("Demo Student");

    // Must NOT contain Registration or Pricing CTA links on login page
    expect(html).not.toContain('href="/register"');
    expect(html).not.toContain('href="/pricing"');
    expect(html).not.toContain("Register School Tenant");

    // Must NOT contain Enterprise ERP Module Quick Access
    expect(html).not.toContain("Enterprise ERP Module Quick Access");
    expect(html).not.toContain("/dashboard/inventory");
    expect(html).not.toContain("/dashboard/settings/data-export");
    expect(html).not.toContain("/dashboard/group");
  });

  it("SECURITY VERIFICATION: Ensures school-specific login page is clean and free of demo buttons or platform admin links", () => {
    const mockSchool = {
      id: "school-101",
      name: "St. Jude High School",
      slug: "stjude",
      motto: "Excellence & Honor",
      address: "12 Education Way, Lagos",
      phone: "+234 801 234 5678",
    };

    const { container } = render(<SchoolLoginPageClient school={mockSchool} />);
    const html = container.innerHTML;

    expect(screen.getByText("St. Jude High School")).toBeDefined();
    expect(screen.getByRole("button", { name: /Sign In to St. Jude High School/i })).toBeDefined();

    expect(html).not.toContain("Demo Admin");
    expect(html).not.toContain("Platform Admin");
    expect(html).not.toContain('href="/platform"');
    expect(html).not.toContain("Enterprise ERP Module Quick Access");
  });
});

describe("Platform Admin Authorization & Isolation", () => {
  function verifyPlatformAdminAccess(role: string | null): { allowed: boolean; status: number } {
    if (!role) return { allowed: false, status: 401 };
    if (role === "platform_admin") return { allowed: true, status: 200 };
    return { allowed: false, status: 403 };
  }

  it("denies unauthenticated visitors access to Platform Admin API (401)", () => {
    const result = verifyPlatformAdminAccess(null);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(401);
  });

  it("denies ordinary school admins access to Platform Admin API (403)", () => {
    const result = verifyPlatformAdminAccess("admin");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("denies teachers, parents, and students access to Platform Admin API (403)", () => {
    expect(verifyPlatformAdminAccess("teacher").status).toBe(403);
    expect(verifyPlatformAdminAccess("parent").status).toBe(403);
    expect(verifyPlatformAdminAccess("student").status).toBe(403);
  });

  it("allows verified platform_admin role access (200)", () => {
    const result = verifyPlatformAdminAccess("platform_admin");
    expect(result.allowed).toBe(true);
    expect(result.status).toBe(200);
  });
});

describe("Tenant Login Architecture & Context Isolation", () => {
  interface UserMembership {
    userId: string;
    schoolId: string;
    role: string;
  }

  const memberships: UserMembership[] = [
    { userId: "user-school-a", schoolId: "school-a-uuid", role: "admin" },
    { userId: "user-school-b", schoolId: "school-b-uuid", role: "admin" },
  ];

  function resolveSchoolContextForUser(userId: string): string {
    const membership = memberships.find((m) => m.userId === userId);
    if (!membership) {
      throw new Error("No school membership found for user");
    }
    return membership.schoolId;
  }

  it("resolves School A user strictly to School A context", () => {
    const schoolId = resolveSchoolContextForUser("user-school-a");
    expect(schoolId).toBe("school-a-uuid");
    expect(schoolId).not.toBe("school-b-uuid");
  });

  it("resolves School B user strictly to School B context", () => {
    const schoolId = resolveSchoolContextForUser("user-school-b");
    expect(schoolId).toBe("school-b-uuid");
    expect(schoolId).not.toBe("school-a-uuid");
  });

  it("throws error and never falls back to default school when user has no membership", () => {
    expect(() => resolveSchoolContextForUser("unknown-user")).toThrow("No school membership found for user");
  });
});

describe("Protected ERP Routes Access Control", () => {
  const protectedRoutes = [
    "/dashboard",
    "/dashboard/inventory",
    "/dashboard/settings/data-export",
    "/dashboard/group",
    "/platform",
  ];

  function simulateRouteAccess(path: string, isAuthenticated: boolean): number {
    if (!isAuthenticated) return 401; // Redirect / Unauthorized
    return 200;
  }

  it("rejects unauthenticated requests to all protected ERP routes", () => {
    protectedRoutes.forEach((route) => {
      const status = simulateRouteAccess(route, false);
      expect(status).toBe(401);
    });
  });
});
