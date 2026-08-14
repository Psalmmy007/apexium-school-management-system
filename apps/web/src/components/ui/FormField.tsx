"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";

export interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string | null;
  validate?: (value: string) => string | null | undefined;
  helperText?: string;
  required?: boolean;
}

export function FormField({
  label,
  name,
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  error: externalError,
  validate,
  helperText,
  required = false,
  className = "",
  placeholder,
  ...props
}: FormFieldProps) {
  const inputId = id || name;
  const [internalError, setInternalError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);

  const displayError = externalError || (hasBlurred ? internalError : null);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasBlurred(true);
    if (validate) {
      const err = validate(String(e.target.value || ""));
      setInternalError(err || null);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear error while typing if valid or wait until blur
    if (hasBlurred && validate) {
      const err = validate(String(e.target.value || ""));
      if (!err) setInternalError(null);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
      >
        {label} {required && <span className="text-indigo-400">*</span>}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-invalid={displayError ? "true" : "false"}
        aria-describedby={displayError ? `${inputId}-error` : undefined}
        className={`w-full px-4 py-3 rounded-xl bg-slate-800 border ${
          displayError
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
        } text-white placeholder-slate-500 focus:ring-1 outline-none text-sm transition-all min-h-[44px]`}
        {...props}
      />

      {/* Field-level Actionable Error Message */}
      {displayError ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-red-400 font-medium flex items-center gap-1.5 pt-0.5 animate-fade-in"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{displayError}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 pt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
