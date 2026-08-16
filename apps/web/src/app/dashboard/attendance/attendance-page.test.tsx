import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import MarkAttendancePage from "./page";

// Mock RxDB
vi.mock("@/lib/rxdb/database", () => ({
  getRxDB: vi.fn().mockResolvedValue({
    attendance: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe("Mark Attendance Page (/dashboard/attendance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-selects class with enrolled students and renders roster", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/classes") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                classes: [
                  { id: "class-jss1", name: "JSS 1", studentCount: 0 },
                  { id: "class-sss1", name: "SSS 1", studentCount: 2 },
                ],
                sections: [],
                totalSchoolStudents: 2,
              },
            }),
        });
      }
      if (url.includes("/api/students?classId=class-sss1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                items: [
                  { id: "st-1", firstName: "Emeka", lastName: "Okonkwo", admissionNumber: "ADM-001" },
                  { id: "st-2", firstName: "Amina", lastName: "Bello", admissionNumber: "ADM-002" },
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

    render(<MarkAttendancePage />);

    // Wait for classes and students to load
    await waitFor(() => {
      expect(screen.getByText(/Class Roster: SSS 1 \(2 Students\)/i)).toBeDefined();
      expect(screen.getByText(/Okonkwo, Emeka/i)).toBeDefined();
      expect(screen.getByText(/Bello, Amina/i)).toBeDefined();
    });

    // Check dropdown options show student count
    expect(screen.getByText("JSS 1 (0 students)")).toBeDefined();
    expect(screen.getByText("SSS 1 (2 students)")).toBeDefined();
  });

  it("displays specific class empty state when selecting an empty class (without register prompt)", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/classes") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                classes: [
                  { id: "class-jss1", name: "JSS 1", studentCount: 0 },
                  { id: "class-sss1", name: "SSS 1", studentCount: 2 },
                ],
                sections: [],
                totalSchoolStudents: 2,
              },
            }),
        });
      }
      if (url.includes("/api/students?classId=class-jss1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { items: [] },
            }),
        });
      }
      if (url.includes("/api/students?classId=class-sss1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                items: [
                  { id: "st-1", firstName: "Emeka", lastName: "Okonkwo", admissionNumber: "ADM-001" },
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

    render(<MarkAttendancePage />);

    // Initially loads SSS 1
    await waitFor(() => {
      expect(screen.getByText(/Class Roster: SSS 1/i)).toBeDefined();
    });

    // User switches dropdown to JSS 1 (which has 0 students)
    const select = screen.getByLabelText(/Select Class \*/i);
    fireEvent.change(select, { target: { value: "class-jss1" } });

    await waitFor(() => {
      expect(screen.getByText(/No students currently enrolled in JSS 1/i)).toBeDefined();
      expect(
        screen.getByText(
          /This specific class currently has 0 active students assigned to it\. Please select a different class/i
        )
      ).toBeDefined();
      // Confirm NO register student button is standing in
      expect(screen.queryByRole("link", { name: /\+ Register Student/i })).toBeNull();
    });
  });

  it("displays whole-school empty state when school has 0 students total", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/classes") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                classes: [{ id: "class-jss1", name: "JSS 1", studentCount: 0 }],
                sections: [],
                totalSchoolStudents: 0,
              },
            }),
        });
      }
      if (url.includes("/api/students")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { items: [] },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });

    render(<MarkAttendancePage />);

    await waitFor(() => {
      expect(screen.getByText(/No Students Registered in School Yet/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /Register Student/i })).toBeDefined();
    });
  });
});
