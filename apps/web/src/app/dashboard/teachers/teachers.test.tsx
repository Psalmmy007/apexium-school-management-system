import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { TeachersClient } from "./TeachersClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Teaching Staff & Class Assignments Page (/dashboard/teachers)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders teacher roster with form class and timetable workloads", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/teachers") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                teachers: [
                  {
                    id: "t-1",
                    firstName: "Olawale",
                    lastName: "Adeleke",
                    email: "olawale.adeleke@apexium.edu.ng",
                    phone: "+2348012345678",
                    employeeNumber: "EMP-T-1001",
                    employmentStatus: "Active",
                    formClasses: [{ id: "c-sss3", name: "SSS 3", type: "class" }],
                    taughtSubjects: ["Mathematics", "Further Mathematics"],
                    periodsCount: 8,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                  },
                ],
                classes: [
                  { id: "c-jss1", name: "JSS 1" },
                  { id: "c-sss3", name: "SSS 3" },
                ],
                subjects: [
                  { id: "s-math", name: "Mathematics" },
                ],
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });

    render(<TeachersClient />);

    await waitFor(() => {
      expect(screen.getByText(/Teaching Staff & Class Assignments/i)).toBeDefined();
      expect(screen.getByText("Olawale Adeleke")).toBeDefined();
      expect(screen.getByText("olawale.adeleke@apexium.edu.ng")).toBeDefined();
      expect(screen.getByText("SSS 3")).toBeDefined();
      expect(screen.getByText("8 Periods / week")).toBeDefined();
      expect(screen.getByText("Mathematics, Further Mathematics")).toBeDefined();
    });

    // Check connected system links
    expect(screen.getByText("Academic Structure")).toBeDefined();
    expect(screen.getByText("Timetable Matrix")).toBeDefined();
    expect(screen.getByText("HR & Payroll")).toBeDefined();
  });

  it("submits new teacher creation form via modal", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/teachers" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Teacher added successfully",
              data: { id: "t-new" },
            }),
        });
      }
      if (url === "/api/teachers") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                teachers: [],
                classes: [{ id: "c-jss1", name: "JSS 1" }],
                subjects: [],
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });

    render(<TeachersClient />);

    await waitFor(() => {
      expect(screen.getByText(/No Teaching Staff Registered Yet/i)).toBeDefined();
    });

    // Click Add First Teacher
    const addBtn = screen.getByRole("button", { name: /Add First Teacher/i });
    fireEvent.click(addBtn);

    // Fill form
    const firstNameInput = screen.getByLabelText(/First Name \*/i);
    const lastNameInput = screen.getByLabelText(/Last Name \*/i);
    const emailInput = screen.getByLabelText(/Email Address \*/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);

    fireEvent.change(firstNameInput, { target: { value: "Chidi" } });
    fireEvent.change(lastNameInput, { target: { value: "Eze" } });
    fireEvent.change(emailInput, { target: { value: "chidi.eze@school.edu.ng" } });
    fireEvent.change(phoneInput, { target: { value: "+2348099887766" } });

    const saveBtn = screen.getByRole("button", { name: /Save & Provision Account/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/teachers",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Chidi",
            lastName: "Eze",
            email: "chidi.eze@school.edu.ng",
            phone: "+2348099887766",
            formClassId: null,
          }),
        })
      );
    });
  });
});
