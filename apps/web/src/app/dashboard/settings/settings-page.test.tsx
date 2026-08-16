import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
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
    cleanup();
    vi.clearAllMocks();
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

  it("proves full reload cycle: saving updates, re-rendering page fresh, and confirming updated name and logo are rendered", async () => {
    // 1. Initial page state with old values
    const initialSettingsData = {
      id: "school-456",
      name: "Old Academy Name",
      slug: "old-academy",
      address: "10 Old Street",
      phone: "+2348011111111",
      email: "old@academy.edu",
      logoUrl: null,
      motto: "Old Slogan",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let simulatedDatabaseRecord = { ...initialSettingsData };

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/settings/school" && init?.method === "PUT") {
        const body = JSON.parse(init.body as string);
        simulatedDatabaseRecord = {
          ...simulatedDatabaseRecord,
          ...body,
          updatedAt: new Date().toISOString(),
        };
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "School settings updated successfully.",
              data: simulatedDatabaseRecord,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: simulatedDatabaseRecord }),
      });
    });

    const { unmount } = render(<SettingsClient initialSettings={initialSettingsData} />);

    // Confirm initial render displays old name and no logo
    expect(screen.getByDisplayValue("Old Academy Name")).toBeDefined();
    expect(screen.getByText("No Logo")).toBeDefined();

    // 2. User edits the school name and uploads/sets a new logo
    const newLogoDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const nameInput = screen.getByLabelText(/School Name/i);
    fireEvent.change(nameInput, { target: { value: "Apexium Global International College" } });

    // Mock upload response for logo
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/upload/logo") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, url: newLogoDataUrl }),
        });
      }
      if (url === "/api/settings/school" && init?.method === "PUT") {
        const body = JSON.parse(init.body as string);
        simulatedDatabaseRecord = {
          ...simulatedDatabaseRecord,
          ...body,
          updatedAt: new Date().toISOString(),
        };
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "School settings updated successfully.",
              data: simulatedDatabaseRecord,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: simulatedDatabaseRecord }),
      });
    });

    const logoInput = document.getElementById("settings-logo-input") as HTMLInputElement;
    const fakeFile = new File(["dummy image"], "school-logo.png", { type: "image/png" });
    fireEvent.change(logoInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/School logo uploaded/i)).toBeDefined();
    });

    // 3. Click save
    const saveBtn = screen.getByRole("button", { name: /Save School Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/School profile and settings updated successfully!/i)).toBeDefined();
    });

    // 4. Simulate a fresh page reload: unmount previous component and re-render with the freshly fetched data from the database
    unmount();
    cleanup();

    render(<SettingsClient initialSettings={simulatedDatabaseRecord} />);

    // 5. Verify the fresh render displays the updated school name and updated logo
    expect(screen.getByDisplayValue("Apexium Global International College")).toBeDefined();
    expect(screen.queryByDisplayValue("Old Academy Name")).toBeNull();

    const logoImg = document.getElementById("settings-logo-preview") as HTMLImageElement;
    expect(logoImg).not.toBeNull();
    expect(logoImg.src).toBe(newLogoDataUrl);
    expect(screen.queryByText("No Logo")).toBeNull();
  });
});
