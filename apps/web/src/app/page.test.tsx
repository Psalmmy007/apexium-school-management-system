import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("Milestone 35 — Public Marketing Landing Page Audit", () => {
  it("renders value proposition headline and key differentiators", () => {
    const { container } = render(<HomePage />);

    // Value Proposition Headline
    expect(screen.getByText(/African Excellence/i)).toBeDefined();
    
    // Differentiators
    const pageText = container.textContent || "";
    expect(pageText).toContain("Offline-First");
    expect(pageText).toContain("WAEC");
    expect(pageText).toContain("NECO");
    expect(pageText).toContain("Naira");
    expect(pageText).toContain("Free Data Export");
  });

  it("provides distinct role-based entry points for admins and portal users", () => {
    render(<HomePage />);

    // Role A: School Owner / Admin Registration
    const adminRegisterLink = screen.getByRole("link", { name: /Register Your School →/i });
    expect(adminRegisterLink.getAttribute("href")).toBe("/register");

    // Role B: Portal Login for Teachers/Parents/Students
    const portalLoginLink = screen.getByRole("link", { name: /Sign In to Your School Portal →/i });
    expect(portalLoginLink.getAttribute("href")).toBe("/auth/login");
  });

  it("features a single dominant primary CTA and visible Naira pricing", () => {
    const { container } = render(<HomePage />);

    // Dominant Primary CTA
    const primaryCta = container.querySelector("#hero-primary-cta");
    expect(primaryCta).toBeDefined();
    expect(primaryCta?.getAttribute("href")).toBe("/register");
    expect(primaryCta?.className).toContain("from-indigo-600");

    // Visible Naira Pricing Section
    expect(screen.getAllByText(/₦50,000/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/₦120,000/i)).toBeDefined();
  });

  // ── SECURITY AUDIT TEST ───────────────────────────────────────────────────
  it("SECURITY FIX: ensures superadmin / platform operator links do NOT exist anywhere in rendered HTML", () => {
    const { container } = render(<HomePage />);
    const html = container.innerHTML;

    // Must NOT contain href="/platform"
    expect(html).not.toContain('href="/platform"');

    // Must NOT contain "SaaS Platform Operator Dashboard" text
    expect(html).not.toContain("SaaS Platform Operator Dashboard");
    expect(html).not.toContain("Platform Operator");
  });
});
