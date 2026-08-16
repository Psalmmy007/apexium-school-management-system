import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardShell } from "./DashboardShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe("DashboardShell Sign Out functionality", () => {
  it("renders topbar and sidebar sign out buttons", () => {
    render(
      <DashboardShell user={{ firstName: "John", lastName: "Doe", role: "admin" }}>
        <div>Test Content</div>
      </DashboardShell>
    );

    const signOutButtons = screen.getAllByRole("button", { name: /sign out/i });
    expect(signOutButtons.length).toBeGreaterThanOrEqual(2);

    const topbarSignOut = document.getElementById("topbar-signout-btn");
    const sidebarSignOut = document.getElementById("sidebar-signout-btn");
    expect(topbarSignOut).not.toBeNull();
    expect(sidebarSignOut).not.toBeNull();
  });
});

describe("DashboardShell Sidebar Section Labels & Multi-Branch Visibility", () => {
  it("renders accurate school-scoped section labels and hides SaaS governance label", () => {
    render(
      <DashboardShell user={{ firstName: "Admin", lastName: "User", role: "admin" }}>
        <div>Test Content</div>
      </DashboardShell>
    );

    // Assert accurate section headers exist
    expect(screen.getByText("School Operations")).not.toBeNull();
    expect(screen.getByText("Administration & Settings")).not.toBeNull();

    // Assert old misleading section label is gone
    expect(screen.queryByText("SaaS & Group Governance")).toBeNull();
    expect(screen.queryByText("Enterprise Operations")).toBeNull();
  });

  it("hides Multi-Branch School Group for standalone schools by default", () => {
    render(
      <DashboardShell user={{ firstName: "Admin", lastName: "User", role: "admin" }} isMultiBranch={false}>
        <div>Test Content</div>
      </DashboardShell>
    );

    expect(screen.queryByText("Multi-Branch School Group")).toBeNull();
    expect(screen.queryByText("Multi-Branch Network")).toBeNull();
    expect(document.getElementById("nav-group")).toBeNull();
  });

  it("renders Multi-Branch School Group when school is part of a group", () => {
    render(
      <DashboardShell user={{ firstName: "Admin", lastName: "User", role: "admin" }} isMultiBranch={true}>
        <div>Test Content</div>
      </DashboardShell>
    );

    expect(screen.getByText("Multi-Branch School Group")).not.toBeNull();
    expect(screen.getByText("Multi-Branch Network")).not.toBeNull();
    expect(document.getElementById("nav-group")).not.toBeNull();
  });
});
