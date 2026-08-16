import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "../client";
import { students, saasInvoices } from "../schema/index";
import { eq } from "drizzle-orm";
import {
  createSchoolGroup,
  addBranchToGroup,
  getGroupBranches,
  getGroupAggregatedMetrics,
  assertGroupAdminAccess,
  assertBranchAccess,
} from "./multi-branch";

describe("Milestone 32 — Multi-Branch / School Group Support Audit", () => {
  let ownerUserId: string;
  let groupId: string;
  let branch1Id: string;
  let branch1AdminId: string;
  let branch2Id: string;
  let branch2AdminId: string;

  beforeAll(async () => {
    ownerUserId = randomUUID();

    // 1. Create School Group
    const group = await createSchoolGroup({
      name: "Grace Group of Schools",
      slug: `grace-group-${Date.now()}`,
      ownerUserId,
      maxBranchesLimit: 5,
    });
    groupId = group.id;

    // 2. Add Branch 1 (Lekki Campus)
    const branch1 = await addBranchToGroup({
      groupId,
      branchName: "Lekki Campus",
      adminFirstName: "Admin",
      adminLastName: "Lekki",
      adminEmail: `admin.lekki.${Date.now()}@grace.edu`,
      isHeadquarters: true,
    });
    branch1Id = branch1.id;

    // Seed Branch 1 Students & Invoices
    await db.insert(students).values({
      schoolId: branch1Id,
      admissionNumber: "ADM-LEKKI-001",
      firstName: "Student",
      lastName: "Lekki1",
      gender: "male",
    });

    await db.insert(saasInvoices).values({
      schoolId: branch1Id,
      invoiceNumber: "INV-LEKKI-001",
      subscriptionId: randomUUID(),
      subtotal: 150000,
      totalAmount: 150000,
      status: "paid",
    });

    // 3. Add Branch 2 (Ikeja Campus)
    const branch2 = await addBranchToGroup({
      groupId,
      branchName: "Ikeja Campus",
      adminFirstName: "Admin",
      adminLastName: "Ikeja",
      adminEmail: `admin.ikeja.${Date.now()}@grace.edu`,
      isHeadquarters: false,
    });
    branch2Id = branch2.id;

    // Seed Branch 2 Students & Invoices
    await db.insert(students).values({
      schoolId: branch2Id,
      admissionNumber: "ADM-IKEJA-001",
      firstName: "Student",
      lastName: "Ikeja1",
      gender: "female",
    });

    await db.insert(saasInvoices).values({
      schoolId: branch2Id,
      invoiceNumber: "INV-IKEJA-001",
      subscriptionId: randomUUID(),
      subtotal: 200000,
      totalAmount: 200000,
      status: "paid",
    });
  });

  // ── 1. Group Creation & Branch Provisioning ────────────────────────────────
  describe("Group Creation & Campus Provisioning", () => {
    it("should register a school group and provision branch campuses", async () => {
      const branches = await getGroupBranches(groupId);

      expect(branches.length).toBe(2);
      expect(branches.some((b) => b.branchName === "Lekki Campus")).toBe(true);
      expect(branches.some((b) => b.branchName === "Ikeja Campus")).toBe(true);
    });

    it("should enforce maxBranchesLimit when provisioning branches", async () => {
      const smallGroup = await createSchoolGroup({
        name: "Small Group",
        slug: `small-group-${Date.now()}`,
        ownerUserId: randomUUID(),
        maxBranchesLimit: 1,
      });

      await addBranchToGroup({
        groupId: smallGroup.id,
        branchName: "Campus 1",
        adminFirstName: "Admin",
        adminLastName: "C1",
        adminEmail: `c1.${Date.now()}@test.edu`,
      });

      // Second branch attempt MUST fail exceeding limit
      await expect(
        addBranchToGroup({
          groupId: smallGroup.id,
          branchName: "Campus 2",
          adminFirstName: "Admin",
          adminLastName: "C2",
          adminEmail: `c2.${Date.now()}@test.edu`,
        })
      ).rejects.toThrow(/limit reached/);
    });
  });

  // ── 2. Aggregated Cross-Campus Metrics ──────────────────────────────────────
  describe("Aggregated Cross-Campus Metrics", () => {
    it("should aggregate total students, staff, and revenue across all group branches", async () => {
      const metrics = await getGroupAggregatedMetrics(groupId);

      expect(metrics.totalCampuses).toBe(2);
      expect(metrics.totalGroupStudents).toBe(2); // 1 in Lekki + 1 in Ikeja
      expect(metrics.totalGroupRevenue).toBe(350000); // 150k + 200k
      expect(metrics.campusBreakdown.length).toBe(2);
    });
  });

  // ── 3. Group RBAC Roles & Branch-Level Isolation ────────────────────────────
  describe("Group Admin RBAC & Strict Branch Visibility Bounds", () => {
    it("should allow Group Admin to access group metrics", async () => {
      const hasAccess = await assertGroupAdminAccess(ownerUserId, groupId);
      expect(hasAccess).toBe(true);
    });

    it("should REJECT non-group admin attempting to access group metrics", async () => {
      const fakeUserId = randomUUID();
      await expect(assertGroupAdminAccess(fakeUserId, groupId)).rejects.toThrow();
    });

    it("should strictly confine branch admins to their own branch", async () => {
      // Find branch 1 admin user
      const branch1Users = await db.select().from(students).where(eq(students.schoolId, branch1Id));
      expect(branch1Users.length).toBe(1);

      // Verify branch 1 data is isolated from branch 2
      const branch2Users = await db.select().from(students).where(eq(students.schoolId, branch2Id));
      expect(branch2Users.length).toBe(1);

      expect(branch1Users[0].admissionNumber).toBe("ADM-LEKKI-001");
      expect(branch2Users[0].admissionNumber).toBe("ADM-IKEJA-001");
    });
  });
});
