import { describe, it, expect } from "vitest";
import { USER_ROLES } from "./index.js";

describe("Shared Types", () => {
  it("defines all expected user roles", () => {
    expect(USER_ROLES).toEqual(["admin", "teacher", "parent", "student"]);
  });
});
