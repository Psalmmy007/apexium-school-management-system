import type { Metadata } from "next";
import { BrandLogo } from "@/components/public/BrandLogo";
import { tokens } from "@/lib/design-system/tokens";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Apexium school account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={tokens.pageContainer + " overflow-x-hidden"}>
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left panel — consistent dark branding with feature highlights */}
        <div className="hidden lg:flex flex-col w-1/2 bg-slate-900 border-r border-slate-800 p-12 lg:p-16 text-white justify-between">
          <div>
            <BrandLogo />
          </div>

          <div className="my-auto py-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight leading-tight text-white">
              Every student deserves a well-run school.
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 font-normal">
              Manage students, attendance, timetables, grades, and report cards in one secure platform.
            </p>

            {/* Feature tags styled with shared design tokens */}
            <div className="flex flex-wrap gap-2.5">
              {[
                "Student Records",
                "Attendance Tracking",
                "Timetables",
                "Grade Reports",
                "Report Cards",
                "Offline Support",
              ].map((feature) => (
                <span
                  key={feature}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 shadow-sm"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Apexium ERP • Multi-Tenant School Management Platform
          </p>
        </div>

        {/* Right panel — auth form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-slate-950 min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
