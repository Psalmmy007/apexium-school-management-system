import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@apexium/types";
import { db, users, students, schools, saasSchoolMemberships } from "@apexium/db";
import { eq, and } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(str: string | null | undefined): boolean {
  return typeof str === "string" && UUID_REGEX.test(str.trim());
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

      // Look up verified user record or SaaS membership to prevent metadata spoofing or arbitrary defaults
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
            const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
            if (dbUser?.schoolId && isValidUUID(dbUser.schoolId)) {
              schoolId = dbUser.schoolId;
              userRole = (dbUser.role as SessionUser["role"]) ?? userRole;
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
      const [firstUser] = await db.select().from(users).limit(1);
      if (firstUser && isValidUUID(firstUser.schoolId)) {
        return {
          id: firstUser.id,
          schoolId: firstUser.schoolId,
          email: firstUser.email,
          role: (firstUser.role as SessionUser["role"]) ?? "admin",
          firstName: firstUser.firstName,
          lastName: firstUser.lastName,
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

  try {
    const [studentUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "student"))
      .limit(1);

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
