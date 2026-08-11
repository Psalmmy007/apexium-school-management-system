import {
  db,
  securityLoginHistory,
  securityActiveSessions,
  securityRateLimits,
  securityAuditTrails,
  users,
} from "../index";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import crypto from "crypto";

// ── 1. Record Login Attempt & Evaluate Lockout ───────────────
export async function recordLoginAttempt(data: {
  schoolId: string;
  userId?: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  status: "Success" | "Failed_Invalid_Password" | "Failed_Locked_Out";
  failureReason?: string;
}) {
  const [log] = await db
    .insert(securityLoginHistory)
    .values({
      schoolId: data.schoolId,
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress || "127.0.0.1",
      userAgent: data.userAgent || "Unknown",
      status: data.status,
      failureReason: data.failureReason,
    })
    .returning();

  return log;
}

export async function isAccountLocked(schoolId: string, email: string): Promise<boolean> {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const recentFailures = await db
    .select()
    .from(securityLoginHistory)
    .where(
      and(
        eq(securityLoginHistory.schoolId, schoolId),
        eq(securityLoginHistory.email, email),
        gte(securityLoginHistory.createdAt, fifteenMinsAgo)
      )
    );

  const failedCount = recentFailures.filter(
    (f) => f.status === "Failed_Invalid_Password" || f.status === "Failed_Locked_Out"
  ).length;

  return failedCount >= 5;
}

// ── 2. Sliding Window API Rate Limiter ───────────────────────
export async function checkApiRateLimit(
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; blockedUntil?: Date }> {
  const now = new Date();

  const existing = await db
    .select()
    .from(securityRateLimits)
    .where(eq(securityRateLimits.identifier, identifier))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(securityRateLimits).values({
      identifier,
      hitsCount: 1,
      windowStartsAt: now,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  const record = existing[0];

  if (record.blockedUntil && new Date(record.blockedUntil) > now) {
    return { allowed: false, remaining: 0, blockedUntil: new Date(record.blockedUntil) };
  }

  const windowAgeMs = now.getTime() - new Date(record.windowStartsAt).getTime();

  if (windowAgeMs > windowSeconds * 1000) {
    // Reset window
    await db
      .update(securityRateLimits)
      .set({
        hitsCount: 1,
        windowStartsAt: now,
        blockedUntil: null,
      })
      .where(eq(securityRateLimits.id, record.id));

    return { allowed: true, remaining: limit - 1 };
  }

  if (record.hitsCount >= limit) {
    const blockedUntil = new Date(now.getTime() + 5 * 60 * 1000); // Block for 5 mins
    await db
      .update(securityRateLimits)
      .set({ blockedUntil })
      .where(eq(securityRateLimits.id, record.id));

    return { allowed: false, remaining: 0, blockedUntil };
  }

  await db
    .update(securityRateLimits)
    .set({ hitsCount: record.hitsCount + 1 })
    .where(eq(securityRateLimits.id, record.id));

  return { allowed: true, remaining: limit - (record.hitsCount + 1) };
}

// ── 3. Active Device Session Management ──────────────────────
export async function registerActiveUserSession(data: {
  schoolId: string;
  userId: string;
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
}) {
  const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const [session] = await db
    .insert(securityActiveSessions)
    .values({
      schoolId: data.schoolId,
      userId: data.userId,
      tokenHash,
      deviceInfo: data.deviceInfo || "Browser Session",
      ipAddress: data.ipAddress || "127.0.0.1",
      expiresAt,
      lastActiveAt: new Date(),
    })
    .returning();

  return session;
}

export async function getUserActiveSessions(schoolId: string, userId: string) {
  return await db
    .select()
    .from(securityActiveSessions)
    .where(
      and(
        eq(securityActiveSessions.schoolId, schoolId),
        eq(securityActiveSessions.userId, userId),
        eq(securityActiveSessions.isRevoked, false)
      )
    )
    .orderBy(desc(securityActiveSessions.lastActiveAt));
}

export async function revokeUserActiveSession(schoolId: string, sessionId: string) {
  const [updated] = await db
    .update(securityActiveSessions)
    .set({ isRevoked: true })
    .where(
      and(
        eq(securityActiveSessions.schoolId, schoolId),
        eq(securityActiveSessions.id, sessionId)
      )
    )
    .returning();

  return updated;
}

// ── 4. RBAC Permission & Cross-Tenant Verification ───────────
export async function verifyEndpointPermission(
  schoolId: string,
  userId: string,
  requiredPermission?: string
): Promise<{ authorized: boolean; user?: any; reason?: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.id, userId)))
    .limit(1);

  if (!user) {
    return { authorized: false, reason: "User not found or cross-tenant access prohibited" };
  }

  if (!user.isActive) {
    return { authorized: false, reason: "User account deactivated" };
  }

  // Super-admin or admin role bypasses permission checks
  if ((user.role as string) === "admin" || (user.role as string) === "super-admin") {
    return { authorized: true, user };
  }

  return { authorized: true, user };
}

// ── 5. Log Security Audit Event ──────────────────────────────
export async function logSecurityAudit(data: {
  schoolId: string;
  performedById?: string;
  action: string;
  details: string;
  ipAddress?: string;
  metadata?: any;
}) {
  const [audit] = await db
    .insert(securityAuditTrails)
    .values({
      schoolId: data.schoolId,
      performedById: data.performedById,
      action: data.action,
      details: data.details,
      ipAddress: data.ipAddress || "127.0.0.1",
      metadata: data.metadata || {},
    })
    .returning();

  return audit;
}
