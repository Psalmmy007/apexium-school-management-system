"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { tokens } from "@/lib/design-system/tokens";
import { Lock, ArrowRight, Menu, X } from "lucide-react";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={tokens.header}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <BrandLogo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">
            Capabilities
          </a>
          <a href="#demo-preview" className="hover:text-white transition-colors">
            Product Demo
          </a>
          <a href="#proof" className="hover:text-white transition-colors">
            System Preview
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#onboarding-status" className="hover:text-white transition-colors">
            Admissions & Onboarding
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center space-x-3">
          <Link
            id="nav-signin-link"
            href="/auth/login"
            className={tokens.btnGhost}
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>School Login</span>
          </Link>

          <Link
            id="nav-register-link"
            href="/register"
            className={tokens.btnPrimary}
          >
            <span>Register School</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/auth/login"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold"
          >
            Login
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-950 border-b border-slate-800 shadow-2xl px-4 pt-3 pb-6 space-y-4 animate-slide-up">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200"
            >
              Capabilities
            </a>
            <a
              href="#demo-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200"
            >
              Product Demo
            </a>
            <a
              href="#proof"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200"
            >
              System Preview
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200"
            >
              Pricing
            </a>
            <a
              href="#onboarding-status"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200"
            >
              Admissions & Onboarding
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className={tokens.btnPrimary + " w-full py-3"}
            >
              <span>Register School Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className={tokens.btnSecondary + " w-full py-3"}
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>School Login</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
