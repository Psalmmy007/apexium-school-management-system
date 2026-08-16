import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { SettingsClient } from "./SettingsClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("General School Settings Page (/dashboard/settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: "School settings updated successfully.",
            data: {},
          }),
      });
    });
  });

  it("renders school settings form with pre-populated values", () => {
    render(
      <SettingsClient
        initialSettings={{
          id: "school-123",
          name: "Apexium Model International School",
          slug: "apexium-model",
          address: "Plot 10 Victoria Island, Lagos",
          phone: "+2348012345678",
          email: "admin@apexium.edu.ng",
          logoUrl: "https://example.com/logo.png",
          motto: "Knowledge, Discipline, Excellence",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
      />
    );

    expect(screen.getByText(/General School Settings/i)).toBeDefined();
    expect(screen.getByDisplayValue("Apexium Model International School")).toBeDefined();
    expect(screen.getByDisplayValue("Knowledge, Discipline, Excellence")).toBeDefined();
    expect(screen.getByDisplayValue("+2348012345678")).toBeDefined();
    expect(screen.getByDisplayValue("admin@apexium.edu.ng")).toBeDefined();
    expect(screen.getByDisplayValue("Plot 10 Victoria Island, Lagos")).toBeDefined();
    expect(screen.getByText(/Tenant Slug:/i)).toBeDefined();
    expect(screen.getByText("apexium-model")).toBeDefined();
    expect(screen.getByText(/Replace Logo/i)).toBeDefined();
  });

  it("submits updated school settings to /api/settings/school and shows success banner", async () => {
    render(
      <SettingsClient
        initialSettings={{
          id: "school-123",
          name: "Original Name",
          slug: "orig-slug",
          address: "Old Address",
          phone: "+2348000000000",
          email: "old@school.edu",
          logoUrl: null,
          motto: "Old Motto",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
      />
    );

    const nameInput = screen.getByLabelText(/School Name/i);
    const mottoInput = screen.getByLabelText(/School Motto/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const addressInput = screen.getByLabelText(/Campus Physical Address/i);

    fireEvent.change(nameInput, { target: { value: "New Updated Academy" } });
    fireEvent.change(mottoInput, { target: { value: "New Inspiring Motto" } });
    fireEvent.change(phoneInput, { target: { value: "+2348123456789" } });
    fireEvent.change(addressInput, { target: { value: "New Campus Location" } });

    const saveBtn = screen.getByRole("button", { name: /Save School Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/settings/school",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Updated Academy",
            motto: "New Inspiring Motto",
            phone: "+2348123456789",
            email: "old@school.edu",
            address: "New Campus Location",
            logoUrl: null,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/School profile and settings updated successfully!/i)).toBeDefined();
    });
  });
});
