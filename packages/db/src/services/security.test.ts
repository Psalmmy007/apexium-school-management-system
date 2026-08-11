import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  securityLoginHistory,
  securityActiveSessions,
  securityRateLimits,
  securityAuditTrails,
} from "../index";
import {
  recordLoginAttempt,
  isAccountLocked,
  checkApiRateLimit,
  registerActiveUserSession,
  getUserActiveSessions,
  revokeUserActiveSession,
  verifyEndpointPermission,
  logSecurityAudit,
} from "./security";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let userAId: string;
let userBId: string;

beforeAll(async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS security_login_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      status VARCHAR(50) NOT NULL,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS security_active_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      device_info TEXT,
      ip_address VARCHAR(50),
      expires_at TIMESTAMPTZ NOT NULL,
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS security_rate_limits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
      identifier VARCHAR(100) NOT NULL,
      hits_count INTEGER NOT NULL DEFAULT 1,
      window_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_until TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sec_rate_identifier ON security_rate_limits(identifier);

    CREATE TABLE IF NOT EXISTS security_audit_trails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      ip_address VARCHAR(50),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const [sA] = await db
    .insert(schools)
    .values({ name: "Security Test School A", slug: `sec-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "Security Test School B", slug: `sec-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  userAId = crypto.randomUUID();
  userBId = crypto.randomUUID();

  await db.insert(users).values({
    id: userAId,
    schoolId: schoolAId,
    email: `sec.user.a.${Date.now()}@schoola.com`,
    firstName: "SecurityA",
    lastName: "User",
    role: "teacher",
  });

  await db.insert(users).values({
    id: userBId,
    schoolId: schoolBId,
    email: `sec.user.b.${Date.now()}@schoolb.com`,
    firstName: "SecurityB",
    lastName: "User",
    role: "teacher",
  });
});

describe("Milestone 23 Security, Authentication & Permission Hardening Tests", () => {
  // 1. Brute Force Login Throttling & Account Lockout
  it("locks account after 5 consecutive failed login attempts within 15 minutes", async () => {
    const targetEmail = `brute.target.${Date.now()}@schoola.com`;

    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt({
        schoolId: schoolAId,
        email: targetEmail,
        status: "Failed_Invalid_Password",
        failureReason: "Invalid credentials",
      });
    }

    const locked = await isAccountLocked(schoolAId, targetEmail);
    expect(locked).toBe(true);
  });

  // 2. Sliding Window API Rate Limiter
  it("throttles API requests when rate limit threshold is exceeded", async () => {
    const id = `ip_test_${Date.now()}`;

    const res1 = await checkApiRateLimit(id, 2, 60);
    expect(res1.allowed).toBe(true);

    const res2 = await checkApiRateLimit(id, 2, 60);
    expect(res2.allowed).toBe(true);

    const res3 = await checkApiRateLimit(id, 2, 60);
    expect(res3.allowed).toBe(false);
  });

  // 3. Active Device Session Tracking & Revocation
  it("tracks active device sessions and supports remote session revocation", async () => {
    const token = "test_device_token_123";
    const session = await registerActiveUserSession({
      schoolId: schoolAId,
      userId: userAId,
      token,
      deviceInfo: "Chrome on macOS",
    });

    expect(session).toBeDefined();

    const devicesBefore = await getUserActiveSessions(schoolAId, userAId);
    expect(devicesBefore.length).toBeGreaterThan(0);

    const revoked = await revokeUserActiveSession(schoolAId, session.id);
    expect(revoked.isRevoked).toBe(true);

    const devicesAfter = await getUserActiveSessions(schoolAId, userAId);
    expect(devicesAfter.find((d) => d.id === session.id)).toBeUndefined();
  });

  // 4. RBAC Permission & Cross-Tenant Penetration Test
  it("blocks User A in School A from accessing School B resources (Cross-Tenant Penetration Test)", async () => {
    const checkSameSchool = await verifyEndpointPermission(schoolAId, userAId);
    expect(checkSameSchool.authorized).toBe(true);

    // Penetration Attempt: User A trying to access School B
    const checkCrossTenant = await verifyEndpointPermission(schoolBId, userAId);
    expect(checkCrossTenant.authorized).toBe(false);
    expect(checkCrossTenant.reason).toContain("cross-tenant access prohibited");
  });

  // 5. Security Audit Logging
  it("logs immutable security audit events for compliance tracking", async () => {
    const audit = await logSecurityAudit({
      schoolId: schoolAId,
      performedById: userAId,
      action: "auth_password_reset",
      details: "User requested password reset token",
    });

    expect(audit).toBeDefined();
    expect(audit.action).toBe("auth_password_reset");
  });
});
