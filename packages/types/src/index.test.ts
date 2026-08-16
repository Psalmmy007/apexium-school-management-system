import { describe, it, expect } from "vitest";
import { USER_ROLES, SCHOOL_USER_ROLES, PLATFORM_USER_ROLES } from "./index.js";

describe("Shared Types", () => {
  it("defines all expected user roles", () => {
    expect(SCHOOL_USER_ROLES).toEqual(["admin", "teacher", "parent", "student"]);
    expect(PLATFORM_USER_ROLES).toEqual(["platform_operator"]);
    expect(USER_ROLES).toEqual(["admin", "teacher", "parent", "student", "platform_operator"]);
  });
});
