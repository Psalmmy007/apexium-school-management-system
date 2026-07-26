import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@apexium/types";

// Get the current authenticated user's session data.
// Returns null if not authenticated.
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // User metadata is stored in Supabase Auth and mirrored in our DB.
    // We read from the auth metadata here for speed; the DB profile is the source of truth.
    const meta = user.user_metadata as Record<string, unknown>;

    return {
      id: user.id,
      schoolId: (meta.school_id as string) ?? "",
      email: user.email ?? "",
      role: (meta.role as SessionUser["role"]) ?? "student",
      firstName: (meta.first_name as string) ?? "",
      lastName: (meta.last_name as string) ?? "",
    };
  } catch {
    return null;
  }
}
