import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getSchoolOnboardingStatus, db, schools } from "@apexium/db";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { SetupClient } from "./SetupClient";

export const metadata: Metadata = {
  title: "School Onboarding & Setup Wizard — ERP",
};

export default async function SetupPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/login");
  }

  let status: any = {
    status: "In_Progress",
    isCompleted: false,
    hasSession: false,
    hasClass: false,
  };

  let initialSchool: any = null;

  if (user.schoolId) {
    try {
      status = await getSchoolOnboardingStatus(user.schoolId);
      const [sch] = await db.select().from(schools).where(eq(schools.id, user.schoolId)).limit(1);
      initialSchool = sch || null;
    } catch (error) {
      console.error("Failed loading setup status:", error);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          School Onboarding & Setup Wizard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create and configure your school institution, setup academic sessions, terms, classes, departments, subjects, grading scale, and activate all ERP modules.
        </p>
      </div>

      <SetupClient initialStatus={status} initialSchool={initialSchool} currentUser={user} />
    </div>
  );
}
