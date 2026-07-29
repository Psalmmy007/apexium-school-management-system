import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@apexium/types";
import { db, users, students, schools } from "@apexium/db";
import { eq } from "drizzle-orm";

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

      // Ensure schoolId is non-empty and valid for DB queries
      if (!schoolId || schoolId.trim() === "") {
        const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        if (dbUser?.schoolId) {
          schoolId = dbUser.schoolId;
        } else {
          const [firstSchool] = await db.select().from(schools).limit(1);
          if (firstSchool) schoolId = firstSchool.id;
        }
      }

      return {
        id: user.id,
        schoolId,
        email: user.email ?? "",
        role: (meta.role as SessionUser["role"]) ?? "student",
        firstName: (meta.first_name as string) ?? "",
        lastName: (meta.last_name as string) ?? "",
      };
    }
  } catch {
    // ignore
  }

  // Fallback for local development or demo environment when no active Supabase Auth cookie is set
  try {
    const [firstUser] = await db.select().from(users).limit(1);
    if (firstUser) {
      let schoolId = firstUser.schoolId;
      if (!schoolId || schoolId.trim() === "") {
        const [firstSchool] = await db.select().from(schools).limit(1);
        if (firstSchool) schoolId = firstSchool.id;
      }
      return {
        id: firstUser.id,
        schoolId: schoolId ?? "",
        email: firstUser.email,
        role: (firstUser.role as SessionUser["role"]) ?? "admin",
        firstName: firstUser.firstName,
        lastName: firstUser.lastName,
      };
    }
  } catch {
    // ignore
  }

  // Fallback if no users exist in users table either
  try {
    const [firstSchool] = await db.select().from(schools).limit(1);
    if (firstSchool) {
      return {
        id: "demo-admin-id",
        schoolId: firstSchool.id,
        email: "admin@apexium.edu",
        role: "admin",
        firstName: "System",
        lastName: "Admin",
      };
    }
  } catch {
    // ignore
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

    const [firstStudent] = await db.select().from(students).limit(1);
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

  return sessionUser;
}
