import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  id?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  id = "empty-state-container",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div
      id={id}
      className="card flex flex-col items-center justify-center py-12 px-6 text-center border-dashed border-2 border-slate-200 bg-slate-50/50 rounded-2xl"
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600 shadow-xs">
        {icon || (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.5h3m-6 0a3 3 0 106 0M3.75 7.5h16.5m-16.5 0l1.35-3.375A2.25 2.25 0 0110.74 3h2.52a2.25 2.25 0 012.09 1.125L16.5 7.5" />
          </svg>
        )}
      </div>

      <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>

      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary btn-md flex items-center gap-2">
          <span>{actionLabel}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <button type="button" onClick={onAction} className="btn-primary btn-md flex items-center gap-2">
          <span>{actionLabel}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}
    </div>
  );
}
