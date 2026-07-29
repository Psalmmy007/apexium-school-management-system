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
