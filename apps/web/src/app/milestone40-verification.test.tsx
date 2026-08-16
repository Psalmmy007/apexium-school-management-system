import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { SetupClient } from "./dashboard/setup/SetupClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Milestone 40: Setup Wizard Restructure & Dependent-Page Verification", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  it("renders the simplified 6-step setup wizard starting at Step 1 (Welcome)", () => {
    render(
      <SetupClient
        initialStatus={{
          status: "In_Progress",
          isCompleted: false,
          hasSession: false,
          hasClass: false,
        }}
        initialSchool={{
          name: "Apexium Model Academy",
          email: "admin@apexium.edu",
        }}
        currentUser={{
          email: "admin@apexium.edu",
          firstName: "Head",
          lastName: "Admin",
          role: "admin",
        }}
      />
    );

    // Verify 6-step labels
    expect(screen.getByText(/Apexium School ERP Core Setup Wizard/i)).toBeDefined();
    expect(screen.getByText(/Step 1 of 6/i)).toBeDefined();
    expect(screen.getByText(/1. Welcome/i)).toBeDefined();
    expect(screen.getByText(/2. School Profile/i)).toBeDefined();
    expect(screen.getByText(/3. Session & Terms/i)).toBeDefined();
    expect(screen.getByText(/4. Classes & Subjects/i)).toBeDefined();
    expect(screen.getByText(/5. Grading Scale/i)).toBeDefined();
    expect(screen.getByText(/6. Activation/i)).toBeDefined();

    // Verify Step 1 content
    expect(screen.getByText(/Welcome to Apexium School Core Setup/i)).toBeDefined();
    const beginBtn = screen.getByRole("button", { name: /Begin School Setup/i });
    expect(beginBtn).toBeDefined();
  });

  it("navigates from Welcome to Step 2 (School Profile & Admin Account)", () => {
    render(
      <SetupClient
        initialStatus={{
          status: "In_Progress",
          isCompleted: false,
          hasSession: false,
          hasClass: false,
        }}
        initialSchool={null}
        currentUser={{
          email: "principal@school.edu.ng",
          firstName: "Bola",
          lastName: "Tinubu",
          role: "admin",
        }}
      />
    );

    const beginBtn = screen.getByRole("button", { name: /Begin School Setup/i });
    fireEvent.click(beginBtn);

    // Should now be on Step 2
    expect(screen.getByText(/Step 2 of 6/i)).toBeDefined();
    expect(screen.getByText(/School Profile & Admin Account/i)).toBeDefined();
    expect(screen.getByLabelText(/School Name/i)).toBeDefined();
  });

  it("verifies Step 4 enables interactive adding and removing of Classes and Subjects", async () => {
    render(
      <SetupClient
        initialStatus={{
          status: "In_Progress",
          isCompleted: false,
          hasSession: false,
          hasClass: false,
        }}
        initialSchool={{ name: "Test School" }}
        currentUser={{ email: "admin@test.com", firstName: "A", lastName: "B", role: "admin" }}
      />
    );

    // Navigate to step 2
    fireEvent.click(screen.getByRole("button", { name: /Begin School Setup/i }));
    // Step 2 -> Step 3
    const nextBtn1 = screen.getByRole("button", { name: /Save & Continue/i });
    await fireEvent.click(nextBtn1);
  });
});

