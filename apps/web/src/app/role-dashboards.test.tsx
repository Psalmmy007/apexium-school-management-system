/**
 * Role-Based Dashboard View & Action Scoping Tests
 *
 * PROOF CRITERIA:
 * 1. Student Dashboard renders personal student metrics & student launchers, with ZERO admin actions.
 * 2. Parent Dashboard renders ward-scoped metrics & parent launchers, with ZERO admin actions.
 * 3. Teacher Dashboard renders teacher workspace tools (scores, attendance, lesson notes), with ZERO admin-only actions.
 * 4. Admin Dashboard renders the schoolwide operational cards and admin core operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock Next.js Link and Navigation
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement("a", { href, ...props }, children);
  },
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => React.createElement("div", { id: "notification-bell" }, "Bell"),
}));

import StudentDashboardPage from "./dashboard/student/page";
import ParentDashboardPage from "./dashboard/parent/page";
import TeacherHomePage from "./dashboard/teacher/page";
import DashboardPage from "./dashboard/page";
import { getSessionUser } from "@/lib/auth/session";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
  verifyPlatformOperator: vi.fn(),
}));

describe("Role-Appropriate Dashboard Separation & Cleanliness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Student Dashboard (/dashboard for role: 'student')", () => {
    it("renders ONLY student-specific launchers and personal metrics", () => {
      const html = renderToString(React.createElement(StudentDashboardPage));

      // Assert Student Portal header & student identity
      expect(html).toContain("Student Portal");

      // Assert Student Quick Actions ARE present
      expect(html).toContain("Take Available CBT Exam");
      expect(html).toContain("Submit Assignment (LMS)");
      expect(html).toContain("Grades &amp; Report Card");
      expect(html).toContain("Attendance History");

      // Assert Admin Schoolwide Actions ARE NOT present
      expect(html).not.toContain("Register Student");
      expect(html).not.toContain("Fee Collections");
      expect(html).not.toContain("Teaching Staff");
      expect(html).not.toContain("Pending Reports");
      expect(html).not.toContain("Invoices &amp; reconciliation");
      expect(html).not.toContain("Bulk PDF generation");
    });
  });

  describe("2. Parent Dashboard (/dashboard for role: 'parent')", () => {
    it("renders ONLY parent-specific launchers and ward metrics", () => {
      const html = renderToString(React.createElement(ParentDashboardPage));

      // Assert Parent Portal header
      expect(html).toContain("Parent Portal");

      // Assert Parent Quick Actions ARE present
      expect(html).toContain("Pay Fees &amp; Invoices");
      expect(html).toContain("View Report Cards");
      expect(html).toContain("Message Teacher");

      // Assert Admin Schoolwide Actions ARE NOT present
      expect(html).not.toContain("Register Student");
      expect(html).not.toContain("Teaching Staff");
      expect(html).not.toContain("Bulk PDF generation");
    });
  });

  describe("3. Teacher Dashboard (/dashboard for role: 'teacher')", () => {
    it("renders ONLY pedagogical teacher tools and assigned class metrics", () => {
      const html = renderToString(React.createElement(TeacherHomePage));

      // Assert Teacher Portal header
      expect(html).toContain("Teacher Portal");

      // Assert Teacher Tools ARE present
      expect(html).toContain("Class Attendance");
      expect(html).toContain("Enter Fast Scores");
      expect(html).toContain("Lesson Notes");
      expect(html).toContain("Assignments &amp; LMS");

      // Assert Admin-only operations ARE NOT present
      expect(html).not.toContain("Register Student");
      expect(html).not.toContain("Fee Collections");
      expect(html).not.toContain("Teaching Staff");
      expect(html).not.toContain("Bulk PDF generation");
    });
  });

  describe("4. Dashboard Root Delegation (/dashboard)", () => {
    it("renders Student Dashboard when authenticated user role is 'student'", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "stu-1",
        schoolId: "sch-1",
        email: "student@school.ng",
        role: "student",
        firstName: "Emeka",
        lastName: "Okonkwo",
      });

      const element = await DashboardPage();
      const html = renderToString(element);

      expect(html).toContain("Student Portal");
      expect(html).not.toContain("Core Operations");
      expect(html).not.toContain("Register Student");
    });

    it("renders Parent Dashboard when authenticated user role is 'parent'", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "par-1",
        schoolId: "sch-1",
        email: "parent@school.ng",
        role: "parent",
        firstName: "Chukwudi",
        lastName: "Okonkwo",
      });

      const element = await DashboardPage();
      const html = renderToString(element);

      expect(html).toContain("Parent Portal");
      expect(html).not.toContain("Core Operations");
      expect(html).not.toContain("Register Student");
    });

    it("renders Teacher Dashboard when authenticated user role is 'teacher'", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "tea-1",
        schoolId: "sch-1",
        email: "teacher@school.ng",
        role: "teacher",
        firstName: "Alice",
        lastName: "Johnson",
      });

      const element = await DashboardPage();
      const html = renderToString(element);

      expect(html).toContain("Teacher Portal");
      expect(html).not.toContain("Core Operations");
      expect(html).not.toContain("Register Student");
    });

    it("renders Admin Dashboard when authenticated user role is 'admin'", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "adm-1",
        schoolId: "sch-1",
        email: "admin@school.ng",
        role: "admin",
        firstName: "Tunde",
        lastName: "Bakare",
      });

      const element = await DashboardPage();
      const html = renderToString(element);

      expect(html).toContain("operational overview of your school");
      expect(html).toContain("Core Operations");
      expect(html).toContain("Register Student");
      expect(html).toContain("Total Students");
    });
  });
});
