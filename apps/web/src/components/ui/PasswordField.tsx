"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";

export interface PasswordFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordField({
  id = "password",
  name = "password",
  value,
  onChange,
  label = "Password",
  placeholder = "••••••••",
  required = true,
  autoComplete = "current-password",
  showRequirements = true,
  className = "",
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Requirements checks
  const hasMinLength = value.length >= 8;
  const hasNumber = /\d/.test(value);
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasSymbol = /[^a-zA-Z0-9]/.test(value);

  // Strength score: 0 to 4
  const strengthScore = [hasMinLength, hasNumber, hasLetter, hasSymbol].filter(
    Boolean
  ).length;

  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-emerald-500",
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "CapsLock") {
      setCapsLockActive((prev) => !prev);
    } else if (typeof e.getModifierState === "function") {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "CapsLock" && typeof e.getModifierState === "function") {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            {label} {required && "*"}
          </label>
          {capsLockActive && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Caps Lock is ON</span>
            </span>
          )}
        </div>
      )}

      {/* Input + Show/Hide Toggle */}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all min-h-[44px]"
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label={showPassword ? "Mask entered characters" : "Reveal entered characters"}
          title={showPassword ? "Mask entered characters" : "Reveal entered characters"}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Live Requirements & Strength Meter (Active when focused or has input) */}
      {showRequirements && (isFocused || value.length > 0) && (
        <div className="pt-2 space-y-2 animate-fade-in">
          {/* Strength Bar */}
          {value.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Strength:</span>
                <span className="font-semibold text-slate-300">
                  {strengthLabels[strengthScore - 1] || "Too Weak"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all ${
                      strengthScore >= step
                        ? strengthColors[strengthScore - 1] || "bg-red-500"
                        : "bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              {hasMinLength ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className={hasMinLength ? "text-slate-200 font-medium" : ""}>
                8+ characters
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasNumber ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className={hasNumber ? "text-slate-200 font-medium" : ""}>
                At least one number
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasLetter ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className={hasLetter ? "text-slate-200 font-medium" : ""}>
                At least one letter
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasSymbol ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className={hasSymbol ? "text-slate-200 font-medium" : ""}>
                Special symbol (recommended)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
