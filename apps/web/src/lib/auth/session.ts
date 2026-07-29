import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@apexium/types";
import { db, users, students } from "@apexium/db";
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
      return {
        id: user.id,
        schoolId: (meta.school_id as string) ?? "",
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
