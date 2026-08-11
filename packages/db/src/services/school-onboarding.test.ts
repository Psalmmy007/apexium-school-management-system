import { describe, it, expect } from "vitest";
import { generateSchoolSlug } from "./school-onboarding";

describe("Milestone 28 — School Onboarding Service", () => {
  it("should generate a clean URL-safe slug from school name", async () => {
    const slug = await generateSchoolSlug("Apexium Academy Lagos");
    expect(slug).toContain("apexium-academy-lagos");
  });

  it("should handle reserved school names safely by appending suffix", async () => {
    const slug = await generateSchoolSlug("Admin");
    expect(slug).not.toBe("admin");
    expect(slug).toContain("admin");
  });
});
