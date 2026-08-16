import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";
import { db, schools, groupMemberships } from "@apexium/db";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Dashboard — Apexium ERP",
  description: "Your school management dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  let isMultiBranch = false;

  if (user.schoolId) {
    try {
      const [school] = await db
        .select({ groupId: schools.groupId })
        .from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);

      if (school?.groupId) {
        isMultiBranch = true;
      } else if (user.id) {
        const [membership] = await db
          .select()
          .from(groupMemberships)
          .where(eq(groupMemberships.userId, user.id))
          .limit(1);
        if (membership) {
          isMultiBranch = true;
        }
      }
    } catch {
      // In standalone or test mode with uninitialized DB, default to false
      isMultiBranch = false;
    }
  }

  return (
    <DashboardShell
      user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}
      isMultiBranch={isMultiBranch}
    >
      {children}
    </DashboardShell>
  );
}

