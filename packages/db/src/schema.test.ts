import { describe, it, expect } from "vitest";
import {
  schools,
  users,
  classes,
  sections,
  students,
  studentGuardians,
  userRoleEnum,
  genderEnum,
  studentStatusEnum,
} from "./schema/index.js";
import { getTableColumns } from "drizzle-orm";

describe("Database Schema — Multi-tenancy Core", () => {
  it("defines schools table with id, name, slug", () => {
    const columns = getTableColumns(schools);
    expect(columns.id).toBeDefined();
    expect(columns.name).toBeDefined();
    expect(columns.slug).toBeDefined();
  });

  it("defines users table with schoolId column for multi-tenant isolation", () => {
    const columns = getTableColumns(users);
    expect(columns.id).toBeDefined();
    expect(columns.schoolId).toBeDefined();
    expect(columns.email).toBeDefined();
    expect(columns.role).toBeDefined();
  });

  it("defines classes table with schoolId column", () => {
    const columns = getTableColumns(classes);
    expect(columns.id).toBeDefined();
    expect(columns.schoolId).toBeDefined();
    expect(columns.name).toBeDefined();
  });

  it("defines sections table with schoolId and classId columns", () => {
    const columns = getTableColumns(sections);
    expect(columns.id).toBeDefined();
    expect(columns.schoolId).toBeDefined();
    expect(columns.classId).toBeDefined();
    expect(columns.name).toBeDefined();
  });

  it("defines students table with schoolId, admissionNumber, and photoUrl", () => {
    const columns = getTableColumns(students);
    expect(columns.id).toBeDefined();
    expect(columns.schoolId).toBeDefined();
    expect(columns.admissionNumber).toBeDefined();
    expect(columns.firstName).toBeDefined();
    expect(columns.lastName).toBeDefined();
    expect(columns.photoUrl).toBeDefined();
    expect(columns.classId).toBeDefined();
    expect(columns.sectionId).toBeDefined();
  });

  it("defines studentGuardians table with schoolId, studentId, and parentId", () => {
    const columns = getTableColumns(studentGuardians);
    expect(columns.id).toBeDefined();
    expect(columns.schoolId).toBeDefined();
    expect(columns.studentId).toBeDefined();
    expect(columns.parentId).toBeDefined();
    expect(columns.relationship).toBeDefined();
  });

  it("defines enums correctly", () => {
    expect(userRoleEnum.enumValues).toEqual([
      "admin",
      "teacher",
      "parent",
      "student",
    ]);
    expect(genderEnum.enumValues).toEqual(["male", "female", "other"]);
    expect(studentStatusEnum.enumValues).toEqual([
      "active",
      "inactive",
      "graduated",
      "transferred",
      "suspended",
      "withdrawn",
      "expelled",
      "alumni",
    ]);
  });
});
