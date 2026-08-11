import { describe, it, expect, beforeAll } from "vitest";
import {
  resolveTenantFromSchoolSlug,
  isReservedSlug,
} from "./tenant";
import { seedDefaultSubscriptionPlans } from "./subscriptions";

describe("Milestone 28 — Tenant Service", () => {
  beforeAll(async () => {
    await seedDefaultSubscriptionPlans();
  });

  it("should reject reserved slugs", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("register")).toBe(true);
    expect(isReservedSlug("pricing")).toBe(true);
    expect(isReservedSlug("my-school")).toBe(false);
  });

  it("should return null when resolving non-existent slug", async () => {
    const tenant = await resolveTenantFromSchoolSlug("non-existent-school-xyz-999");
    expect(tenant).toBeNull();
  });
});
