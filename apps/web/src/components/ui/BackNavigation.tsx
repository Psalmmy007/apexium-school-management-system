import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackNavigationProps {
  href: string;
  label?: string;
  className?: string;
  id?: string;
}

/**
 * BackNavigation
 * Standard in-UI back-navigation element for all non-root pages.
 * - Minimum 44x44px tap target size for mobile compliance.
 * - Navigates to a predictable parent page in the app hierarchy.
 * - Styled consistently with Apexium design system tokens.
 */
export function BackNavigation({
  href,
  label = "Back",
  className = "",
  id = "back-navigation-link",
}: BackNavigationProps) {
  return (
    <div className={`mb-4 flex items-center ${className}`}>
      <Link
        id={id}
        href={href}
        data-testid="back-navigation"
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors py-2 px-3 -ml-3 rounded-xl hover:bg-slate-800/80 min-h-[44px] min-w-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 group"
        aria-label={label}
      >
        <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:border-slate-600 transition-colors shrink-0">
          <ArrowLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-transform group-hover:-translate-x-0.5" />
        </div>
        <span className="truncate">{label}</span>
      </Link>
    </div>
  );
}
