import { db } from "../client";
import { saasPlatformOperators } from "../schema/index";
import { eq, and } from "drizzle-orm";

export interface PlatformOperatorRecord {
  id: string;
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Checks if a user is a verified, active platform operator.
 * Platform operators are system-level administrators with global SaaS visibility,
 * independent of any individual school tenancy.
 */
export async function isPlatformOperator(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const [operator] = await db
      .select()
      .from(saasPlatformOperators)
      .where(
        and(
          eq(saasPlatformOperators.userId, userId),
          eq(saasPlatformOperators.isActive, true)
        )
      )
      .limit(1);

    return !!operator;
  } catch (error) {
    console.error("Error checking platform operator status:", error);
    return false;
  }
}

/**
 * Finds a platform operator by email address.
 */
export async function getPlatformOperatorByEmail(email: string): Promise<PlatformOperatorRecord | null> {
  if (!email) return null;
  try {
    const [operator] = await db
      .select()
      .from(saasPlatformOperators)
      .where(eq(saasPlatformOperators.email, email.trim().toLowerCase()))
      .limit(1);

    return operator || null;
  } catch (error) {
    console.error("Error finding platform operator by email:", error);
    return null;
  }
}

/**
 * Provisions a platform operator idempotently.
 * This is a secure server-side/CLI operation only.
 */
export async function provisionPlatformOperator(params: {
  userId: string;
  email: string;
  role?: string;
}): Promise<PlatformOperatorRecord> {
  const email = params.email.trim().toLowerCase();
  const role = params.role || "platform_operator";

  // Check if existing record exists by userId or email
  const [existingByUser] = await db
    .select()
    .from(saasPlatformOperators)
    .where(eq(saasPlatformOperators.userId, params.userId))
    .limit(1);

  if (existingByUser) {
    const [updated] = await db
      .update(saasPlatformOperators)
      .set({
        email,
        role,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(saasPlatformOperators.id, existingByUser.id))
      .returning();

    return updated;
  }

  const [existingByEmail] = await db
    .select()
    .from(saasPlatformOperators)
    .where(eq(saasPlatformOperators.email, email))
    .limit(1);

  if (existingByEmail) {
    const [updated] = await db
      .update(saasPlatformOperators)
      .set({
        userId: params.userId,
        role,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(saasPlatformOperators.id, existingByEmail.id))
      .returning();

    return updated;
  }

  const [inserted] = await db
    .insert(saasPlatformOperators)
    .values({
      userId: params.userId,
      email,
      role,
      isActive: true,
    })
    .returning();

  return inserted;
}

/**
 * Revokes a platform operator's privileges.
 */
export async function revokePlatformOperator(userId: string): Promise<boolean> {
  try {
    const [updated] = await db
      .update(saasPlatformOperators)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(saasPlatformOperators.userId, userId))
      .returning();

    return !!updated;
  } catch (error) {
    console.error("Error revoking platform operator:", error);
    return false;
  }
}
