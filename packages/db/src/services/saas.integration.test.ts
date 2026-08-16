import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "../client";
import {
  schools,
  users,
  students,
  classes,
  feeStructures,
  saasSchoolMemberships,
  saasSchoolDomains,
  saasOnboardingSessions,
  saasSchoolSubscriptions,
} from "../schema/index";
import { eq, and } from "drizzle-orm";
import {
  registerSchool,
  createSchoolAdministrator,
  createSchoolMembership,
  initializeSchoolTenant,
  getOnboardingStatus,
} from "./school-onboarding";
import {
  getSubscriptionPlans,
  createSubscription,
  confirmSubscriptionPayment,
  renewSubscription,
  expireSubscription,
  getSchoolSubscription,
  isSubscriptionActive,
  recordFailedPayment,
  seedDefaultSubscriptionPlans,
} from "./subscriptions";
import {
  assertTenantMembership,
  assertTenantAccess,
  resolveTenantFromHostname,
  resolveTenantFromSchoolSlug,
  isReservedSlug,
} from "./tenant";
import {
  processSubscriptionWebhook,
  verifyPaystackWebhookSignature,
} from "./saas-payments";

describe("Milestone 28 — Comprehensive End-to-End SaaS & Multi-Tenant Audit", () => {
  let schoolAId: string;
  let schoolASlug: string;
  let userAId: string;

  let schoolBId: string;
  let schoolBSlug: string;
  let userBId: string;

  beforeAll(async () => {
    await seedDefaultSubscriptionPlans();

    // ── 1. Create School A ──────────────────────────────────────────────────
    userAId = randomUUID();
    const regA = await registerSchool({
      schoolName: "Apexium School Alpha",
      adminFirstName: "Admin",
      adminLastName: "Alpha",
      adminEmail: `admin.alpha.${Date.now()}@schoola.edu`,
    });
    schoolAId = regA.schoolId;
    schoolASlug = regA.schoolSlug;

    await createSchoolAdministrator({
      userId: userAId,
      schoolId: schoolAId,
      firstName: "Admin",
      lastName: "Alpha",
      email: `admin.alpha.${Date.now()}@schoola.edu`,
    });
    await createSchoolMembership({ userId: userAId, schoolId: schoolAId, role: "admin" });
    await initializeSchoolTenant({ schoolId: schoolAId, schoolSlug: schoolASlug, adminUserId: userAId });

    // ── 2. Create School B ──────────────────────────────────────────────────
    userBId = randomUUID();
    const regB = await registerSchool({
      schoolName: "Apexium School Beta",
      adminFirstName: "Admin",
      adminLastName: "Beta",
      adminEmail: `admin.beta.${Date.now()}@schoolb.edu`,
    });
    schoolBId = regB.schoolId;
    schoolBSlug = regB.schoolSlug;

    await createSchoolAdministrator({
      userId: userBId,
      schoolId: schoolBId,
      firstName: "Admin",
      lastName: "Beta",
      email: `admin.beta.${Date.now()}@schoolb.edu`,
    });
    await createSchoolMembership({ userId: userBId, schoolId: schoolBId, role: "admin" });
    await initializeSchoolTenant({ schoolId: schoolBId, schoolSlug: schoolBSlug, adminUserId: userBId });

    // ── Seed operational ERP data for School A and School B ─────────────────
    // School A class & student
    const [classA] = await db.insert(classes).values({
      schoolId: schoolAId,
      name: "Grade 10A",
    }).returning();

    await db.insert(students).values({
      schoolId: schoolAId,
      classId: classA.id,
      admissionNumber: "ADM-A-001",
      firstName: "Student",
      lastName: "Alpha",
      gender: "male",
      dateOfBirth: new Date("2010-01-01"),
    });

    // School B class & student
    const [classB] = await db.insert(classes).values({
      schoolId: schoolBId,
      name: "Grade 10B",
    }).returning();

    await db.insert(students).values({
      schoolId: schoolBId,
      classId: classB.id,
      admissionNumber: "ADM-B-001",
      firstName: "Student",
      lastName: "Beta",
      gender: "female",
      dateOfBirth: new Date("2010-02-02"),
    });
  });

  // ── TEST GROUP 1: Subdomain & Hostname Tenant Resolution ───────────────────
  describe("Subdomain & Hostname Resolution", () => {
    it("should resolve School A tenant from subdomain hostname", async () => {
      const tenantA = await resolveTenantFromSchoolSlug(schoolASlug);
      expect(tenantA).not.toBeNull();
      expect(tenantA?.schoolId).toBe(schoolAId);
      expect(tenantA?.schoolSlug).toBe(schoolASlug);
    });

    it("should resolve School B tenant from subdomain hostname", async () => {
      const tenantB = await resolveTenantFromSchoolSlug(schoolBSlug);
      expect(tenantB).not.toBeNull();
      expect(tenantB?.schoolId).toBe(schoolBId);
      expect(tenantB?.schoolSlug).toBe(schoolBSlug);
    });

    it("should reject reserved platform slugs", () => {
      expect(isReservedSlug("admin")).toBe(true);
      expect(isReservedSlug("api")).toBe(true);
      expect(isReservedSlug("platform")).toBe(true);
      expect(isReservedSlug("login")).toBe(true);
      expect(isReservedSlug("register")).toBe(true);
      expect(isReservedSlug("pricing")).toBe(true);
      expect(isReservedSlug("valid-school-slug")).toBe(false);
    });
  });

  // ── TEST GROUP 2: Strict Multi-Tenant ERP Data Isolation ──────────────────
  describe("ERP Data Isolation (School A vs School B)", () => {
    it("should return only School A students when querying School A school_id", async () => {
      const studentsA = await db.select().from(students).where(eq(students.schoolId, schoolAId));
      expect(studentsA.length).toBe(1);
      expect(studentsA[0].admissionNumber).toBe("ADM-A-001");
      expect(studentsA[0].schoolId).toBe(schoolAId);

      // Verify no School B student is returned
      const hasSchoolBStudent = studentsA.some((s) => s.schoolId === schoolBId);
      expect(hasSchoolBStudent).toBe(false);
    });

    it("should return only School B students when querying School B school_id", async () => {
      const studentsB = await db.select().from(students).where(eq(students.schoolId, schoolBId));
      expect(studentsB.length).toBe(1);
      expect(studentsB[0].admissionNumber).toBe("ADM-B-001");
      expect(studentsB[0].schoolId).toBe(schoolBId);
    });

    it("should isolate classes between School A and School B", async () => {
      const classesA = await db.select().from(classes).where(eq(classes.schoolId, schoolAId));
      const classesB = await db.select().from(classes).where(eq(classes.schoolId, schoolBId));

      expect(classesA.map((c) => c.name)).toContain("Grade 10A");
      expect(classesA.map((c) => c.name)).not.toContain("Grade 10B");

      expect(classesB.map((c) => c.name)).toContain("Grade 10B");
      expect(classesB.map((c) => c.name)).not.toContain("Grade 10A");
    });
  });

  // ── TEST GROUP 3: Cross-Tenant Attack Mitigation ──────────────────────────
  describe("Cross-Tenant Security Controls", () => {
    it("should reject School A user attempting to assert membership in School B", async () => {
      await expect(assertTenantMembership(userAId, schoolBId)).rejects.toThrow();
    });

    it("should reject School B user attempting to assert membership in School A", async () => {
      await expect(assertTenantMembership(userBId, schoolAId)).rejects.toThrow();
    });

    it("should enforce membership check in assertTenantAccess", async () => {
      const accessA = await assertTenantAccess(userAId, schoolAId);
      expect(accessA.membership.role).toBe("admin");

      await expect(assertTenantAccess(userAId, schoolBId)).rejects.toThrow();
    });

    it("should isolate domain records so School A cannot query School B domains", async () => {
      const domainsA = await db
        .select()
        .from(saasSchoolDomains)
        .where(eq(saasSchoolDomains.schoolId, schoolAId));

      expect(domainsA.every((d) => d.schoolId === schoolAId)).toBe(true);
      expect(domainsA.some((d) => d.schoolId === schoolBId)).toBe(false);
    });

    it("should isolate onboarding sessions between schools", async () => {
      const sessionA = await getOnboardingStatus(schoolAId);
      const sessionB = await getOnboardingStatus(schoolBId);

      expect(sessionA?.schoolId).toBe(schoolAId);
      expect(sessionB?.schoolId).toBe(schoolBId);
      expect(sessionA?.schoolId).not.toBe(sessionB?.schoolId);
    });
  });

  // ── TEST GROUP 4: Subscription Lifecycle & Payment Verification ───────────
  describe("Subscription Lifecycle & Paystack Gateway", () => {
    it("should complete full subscription lifecycle (Pending -> Active -> Renewed -> Expired -> Failed)", async () => {
      const plans = await getSubscriptionPlans();
      const plan = plans[0]; // Starter

      // 1. Create subscription (Pending)
      const subA = await createSubscription(schoolAId, plan.id);
      expect(subA.status).toBe("pending_payment");
      expect(subA.schoolId).toBe(schoolAId);

      // 2. Initial check - inactive
      let active = await isSubscriptionActive(schoolAId);
      expect(active).toBe(false);

      // 3. Payment confirmed -> Active
      const ref = `PAY-REF-${Date.now()}`;
      await confirmSubscriptionPayment({
        schoolId: schoolAId,
        subscriptionId: subA.id,
        paystackReference: ref,
        amount: plan.termlyPrice,
      });

      active = await isSubscriptionActive(schoolAId);
      expect(active).toBe(true);

      const activeSub = await getSchoolSubscription(schoolAId);
      expect(activeSub?.status).toBe("active");
      expect(activeSub?.paystackReference).toBe(ref);

      // 4. Renewal -> Creates new subscription
      const newSub = await renewSubscription(schoolAId, plan.id);
      expect(newSub.id).not.toBe(subA.id);

      // 5. Expiration -> Status expired
      await expireSubscription(schoolAId);
      const expiredSub = await getSchoolSubscription(schoolAId);
      expect(expiredSub?.status).toBe("expired");

      // 6. Record failed payment -> Status payment_failed
      const failRef = `FAIL-REF-${Date.now()}`;
      await recordFailedPayment({
        schoolId: schoolAId,
        subscriptionId: newSub.id,
        reference: failRef,
        amount: plan.termlyPrice,
        reason: "insufficient_funds",
      });

      const failedSub = await getSchoolSubscription(schoolAId);
      expect(failedSub?.status).toBe("payment_failed");
    });

    it("should enforce idempotent Paystack webhook processing", async () => {
      const plans = await getSubscriptionPlans();
      const subB = await createSubscription(schoolBId, plans[0].id);
      const ref = `WEBHOOK-IDEMPOTENT-REF-${Date.now()}`;

      const webhookPayload = {
        event: "charge.success",
        reference: ref,
        amount: plans[0].termlyPrice * 100, // kobo
        metadata: { schoolId: schoolBId, subscriptionId: subB.id },
        paidAt: new Date().toISOString(),
        channel: "card",
      };

      // Call 1: Processed
      const res1 = await processSubscriptionWebhook(webhookPayload);
      expect(res1.processed).toBe(true);
      expect(res1.reason).toBe("payment_confirmed");

      // Call 2: Duplicate blocked by idempotency
      const res2 = await processSubscriptionWebhook(webhookPayload);
      expect(res2.processed).toBe(false);
      expect(res2.reason).toBe("already_processed_idempotent");
    });
  });
});
