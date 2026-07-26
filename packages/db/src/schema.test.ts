import { describe, it, expect } from "vitest";
import { schools, users, userRoleEnum } from "./schema/index.js";
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

  it("defines user role enum with all 4 roles", () => {
    expect(userRoleEnum.enumValues).toEqual([
      "admin",
      "teacher",
      "parent",
      "student",
    ]);
  });
});
