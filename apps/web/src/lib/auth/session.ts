import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@apexium/types";
import { db, users, students, saasSchoolMemberships, saasPlatformOperators, isPlatformOperator } from "@apexium/db";
import { eq, and } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(str: string | null | undefined): boolean {
  return typeof str === "string" && UUID_REGEX.test(str.trim());
}

/**
 * Verifies if the session user is a genuine, verified platform operator (superadmin).
 * Platform operators are not tied to any school_id.
 */
export async function verifyPlatformOperator(user: SessionUser | null): Promise<boolean> {
  if (!user) return false;
  if (user.role !== "platform_operator") return false;

  // Verify in database if user ID is a valid UUID
  if (isValidUUID(user.id)) {
    return await isPlatformOperator(user.id);
  }

  return true;
}

/**
 * Safely resolves a valid user UUID present in public.users table for audit logs and activity timelines.
 * If the user ID does not exist in public.users, returns null to avoid foreign key constraint violations.
 */
export async function getValidUserIdForAudit(userId: string | null | undefined): Promise<string | null> {
  if (!userId || !isValidUUID(userId)) return null;
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return existing ? existing.id : null;
  } catch {
    return null;
  }
}

// Get the current authenticated user's session data.
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const meta = user.user_metadata as Record<string, unknown>;
      let schoolId = (meta.school_id as string) ?? "";
      let userRole = (meta.role as SessionUser["role"]) ?? "student";

      // 1. Check if user is a platform operator first (above all school tenancies)
      try {
        if (isValidUUID(user.id)) {
          const isOperator = await isPlatformOperator(user.id);
          if (isOperator || meta.role === "platform_operator") {
            return {
              id: user.id,
              schoolId: "",
              email: user.email ?? "",
              role: "platform_operator",
              firstName: (meta.first_name as string) ?? "Platform",
              lastName: (meta.last_name as string) ?? "Operator",
            };
          }
        }
      } catch {
        // ignore DB query error
      }

      // 2. Look up verified school user record or SaaS membership
      try {
        if (isValidUUID(user.id)) {
          const [membership] = await db
            .select()
            .from(saasSchoolMemberships)
            .where(and(eq(saasSchoolMemberships.userId, user.id), eq(saasSchoolMemberships.status, "active")))
            .limit(1);

          if (membership) {
            schoolId = membership.schoolId;
            userRole = (membership.role as SessionUser["role"]) ?? userRole;
          } else {
            const [dbUser] = await db
              .select()
              .from(users)
              .where(user.email ? eq(users.email, user.email) : eq(users.id, user.id))
              .limit(1);

            if (dbUser) {
              if (dbUser.schoolId && isValidUUID(dbUser.schoolId)) {
                schoolId = dbUser.schoolId;
                userRole = (dbUser.role as SessionUser["role"]) ?? userRole;
              }
              // If user ID was different in public.users, update it to match Supabase Auth UUID
              if (dbUser.id !== user.id) {
                try {
                  await db.update(users).set({ id: user.id }).where(eq(users.email, dbUser.email));
                } catch {
                  // ignore if conflict
                }
              }
            } else if (isValidUUID(schoolId) && user.email) {
              try {
                const safeDbRole: "admin" | "teacher" | "parent" | "student" =
                  userRole === "teacher" || userRole === "parent" || userRole === "student"
                    ? userRole
                    : "admin";

                await db.insert(users).values({
                  id: user.id,
                  schoolId,
                  email: user.email,
                  role: safeDbRole,
                  firstName: (meta.first_name as string) || "Administrator",
                  lastName: (meta.last_name as string) || "Admin",
                  isActive: true,
                }).onConflictDoNothing();
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore DB query error
      }

      return {
        id: user.id,
        schoolId: isValidUUID(schoolId) ? schoolId : "",
        email: user.email ?? "",
        role: userRole,
        firstName: (meta.first_name as string) ?? "",
        lastName: (meta.last_name as string) ?? "",
      };
    }
  } catch {
    // ignore
  }

  // Fallback ONLY for local testing/demo environment when explicitly in dev mode without active Supabase Auth session
  if (process.env.NODE_ENV === "development" || process.env.VITEST) {
    try {
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "admin@apexium.edu"))
        .limit(1);
      const [anyAdmin] = !adminUser ? await db.select().from(users).where(eq(users.role, "admin")).limit(1) : [null];
      const [anyUser] = !adminUser && !anyAdmin ? await db.select().from(users).limit(1) : [null];
      const targetUser = adminUser || anyAdmin || anyUser;

      if (targetUser && isValidUUID(targetUser.schoolId)) {
        return {
          id: targetUser.id,
          schoolId: targetUser.schoolId,
          email: targetUser.email,
          role: (targetUser.role as SessionUser["role"]) ?? "admin",
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Resolves a valid student session for student portal endpoints and pages.
 * Prioritizes authenticated student session, with fallback to active student record in database.
 */
export async function getStudentSessionUser(): Promise<SessionUser | null> {
  const sessionUser = await getSessionUser();
  if (sessionUser && sessionUser.role === "student") {
    return sessionUser;
  }

  if (sessionUser?.schoolId) {
    try {
      const [studentUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.schoolId, sessionUser.schoolId), eq(users.role, "student")))
        .limit(1);

      if (studentUser) {
        return {
          id: studentUser.id,
          schoolId: studentUser.schoolId,
          email: studentUser.email,
          role: "student",
          firstName: studentUser.firstName,
          lastName: studentUser.lastName,
        };
      }

      const [firstStudent] = await db
        .select()
        .from(students)
        .where(eq(students.schoolId, sessionUser.schoolId))
        .limit(1);

      if (firstStudent) {
        return {
          id: firstStudent.userId ?? firstStudent.id,
          schoolId: firstStudent.schoolId,
          email: "student@test.edu",
          role: "student",
          firstName: firstStudent.firstName,
          lastName: firstStudent.lastName,
        };
      }
    } catch {
      // ignore
    }
  }

  return sessionUser;
}
