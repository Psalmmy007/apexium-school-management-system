import { describe, it, expect } from "vitest";
import { schools, users, userRoleEnum } from "./index.js";

describe("Database Schema Definitions", () => {
  it("defines school and user tables with school_id tenant references", () => {
    expect(schools).toBeDefined();
    expect(users).toBeDefined();
    expect(userRoleEnum.enumValues).toEqual(["admin", "teacher", "parent", "student"]);
    expect(users.schoolId).toBeDefined();
  });
});
