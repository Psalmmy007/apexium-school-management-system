import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  generateExecutiveKpiSummary,
  generateAcademicAnalytics,
  generateFinancialAnalytics,
  calculateStudentRiskScores,
} from "@apexium/db";
import type { Metadata } from "next";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "Analytics & Executive Dashboard — ERP",
};

export default async function AnalyticsDashboardPage() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    redirect("/auth/login");
  }

  let executive: any = null;
  let academic: any = null;
  let financial: any = null;
  let atRisk: any[] = [];

  try {
    [executive, academic, financial, atRisk] = await Promise.all([
      generateExecutiveKpiSummary(user.schoolId),
      generateAcademicAnalytics(user.schoolId),
      generateFinancialAnalytics(user.schoolId),
      calculateStudentRiskScores(user.schoolId),
    ]);
  } catch (error) {
    console.error("Failed loading analytics dashboard data:", error);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Analytics & Executive Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time institution-wide KPIs covering enrolment, attendance, academics, finances, operations, predictive at-risk indicators, and exportable reports.
          </p>
        </div>
      </div>

      <AnalyticsClient
        initialExecutive={executive}
        initialAcademic={academic}
        initialFinancial={financial}
        initialAtRisk={atRisk}
        userRole={user.role}
      />
    </div>
  );
}
