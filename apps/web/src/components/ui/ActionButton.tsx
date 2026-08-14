"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "primaryLg" | "secondary" | "danger" | "ghost" | "small";
  icon?: React.ReactNode;
}

export function ActionButton({
  children,
  loading = false,
  loadingText,
  variant = "primary",
  icon,
  disabled,
  className = "",
  type = "button",
  ...props
}: ActionButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold rounded-xl transition-all gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed select-none";

  const variantStyles: Record<string, string> = {
    primary:
      "text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md disabled:bg-indigo-600/60 disabled:opacity-60 px-6 py-3.5 min-h-[44px]",
    primaryLg:
      "text-base text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg disabled:bg-indigo-600/60 disabled:opacity-60 px-8 py-4 min-h-[48px]",
    secondary:
      "text-sm text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 px-6 py-3.5 min-h-[44px]",
    danger:
      "text-sm text-white bg-red-600 hover:bg-red-500 shadow-md disabled:bg-red-600/60 disabled:opacity-60 px-6 py-3.5 min-h-[44px]",
    ghost:
      "text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 disabled:opacity-50",
    small:
      "w-full text-center py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 flex items-center justify-center gap-1.5",
  };

  const isButtonDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isButtonDisabled}
      aria-busy={loading ? "true" : "false"}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
          <span>{loadingText || "Processing…"}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
