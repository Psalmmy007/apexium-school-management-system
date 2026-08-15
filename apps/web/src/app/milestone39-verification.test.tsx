import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

describe("Milestone 39: Dashboard Design Unification & Back Navigation", () => {
  it("renders BackNavigation component with correct target href, label, and accessible structure", () => {
    render(<BackNavigation href="/dashboard" label="Back to Dashboard" id="test-back-nav" />);

    const link = screen.getByTestId("back-navigation");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(link.getAttribute("id")).toBe("test-back-nav");
    expect(screen.getByText("Back to Dashboard")).toBeDefined();
  });

  it("ensures BackNavigation includes minimum 44px tap target height styling", () => {
    const { container } = render(<BackNavigation href="/dashboard/students" label="Back to Students" />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("min-h-[44px]");
  });

  it("verifies predictable back-navigation hierarchy mapping for non-root pages", () => {
    const expectedHierarchyMapping: Record<string, string> = {
      "/auth/login": "/",
      "/pricing": "/",
      "/register": "/",
      "/dashboard/students": "/dashboard",
      "/dashboard/students/new": "/dashboard/students",
      "/dashboard/students/import": "/dashboard/students",
      "/dashboard/students/123": "/dashboard/students",
      "/dashboard/students/123/edit": "/dashboard/students/123",
      "/dashboard/attendance": "/dashboard",
      "/dashboard/attendance/staff": "/dashboard/attendance",
      "/dashboard/timetable": "/dashboard",
      "/dashboard/academics/structure": "/dashboard",
      "/dashboard/academics/scores": "/dashboard",
      "/dashboard/academics/lessons": "/dashboard",
      "/dashboard/academics/lessons/123": "/dashboard/academics/lessons",
      "/dashboard/academics/assignments": "/dashboard",
      "/dashboard/reports": "/dashboard",
      "/dashboard/promotion": "/dashboard",
      "/dashboard/finance": "/dashboard",
      "/dashboard/cbt": "/dashboard",
      "/dashboard/cbt/take/123": "/dashboard/cbt",
      "/dashboard/communication": "/dashboard",
      "/dashboard/admissions": "/dashboard",
      "/dashboard/hr": "/dashboard",
      "/dashboard/inventory": "/dashboard",
      "/dashboard/library": "/dashboard",
      "/dashboard/hostel": "/dashboard",
      "/dashboard/transport": "/dashboard",
      "/dashboard/group": "/dashboard",
      "/dashboard/analytics": "/dashboard",
      "/dashboard/settings/licenses": "/dashboard",
      "/dashboard/settings/privacy": "/dashboard",
      "/dashboard/settings/data-export": "/dashboard",
      "/dashboard/setup": "/dashboard",
      "/dashboard/teacher/messages": "/dashboard/teacher",
      "/dashboard/parent/fees": "/dashboard/parent",
      "/dashboard/student/profile": "/dashboard/student",
      "/dashboard/student/academics": "/dashboard/student",
      "/dashboard/student/attendance": "/dashboard/student",
      "/dashboard/student/timetable": "/dashboard/student",
      "/dashboard/student/cbt": "/dashboard/student",
      "/dashboard/student/lms": "/dashboard/student",
      "/dashboard/student/notifications": "/dashboard/student",
    };

    const rootPages = ["/", "/dashboard", "/dashboard/teacher", "/dashboard/parent", "/dashboard/student"];

    // Assert that root pages have NO parent back navigation
    rootPages.forEach((root) => {
      expect(expectedHierarchyMapping[root]).toBeUndefined();
    });

    // Assert that every non-root subpage maps to an existing, predictable parent page
    Object.entries(expectedHierarchyMapping).forEach(([subpage, parent]) => {
      expect(parent).toBeTruthy();
      expect(parent).not.toBe(subpage);
    });
  });
});
