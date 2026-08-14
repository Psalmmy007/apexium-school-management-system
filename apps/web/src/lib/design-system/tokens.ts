/**
 * Apexium Shared Public Design System Tokens
 * Source of truth for all public-facing pages (Landing, Login, Pricing, Registration, Subdomain Portal).
 * Compliant with Milestone 37 anti-slop guidelines:
 * - High-contrast deep slate palette (bg-slate-950 / bg-slate-900)
 * - Pure indigo primary accent (#4F46E5 / bg-indigo-600)
 * - Zero glowing colored shadows (standard elevation shadows only)
 * - Tight, deliberate typographic scale
 * - Neutral border styling (border-slate-800 / border-slate-700)
 */

export const tokens = {
  // Page & Surface Containers
  pageContainer: "min-h-screen bg-slate-950 text-slate-100 font-sans antialiased",
  header: "sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 border-b border-slate-800",
  footer: "py-12 bg-slate-950 border-t border-slate-900 text-xs text-slate-500",

  // Cards & Panels
  card: "p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md",
  cardHover: "p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all",
  cardSubtle: "p-4 rounded-xl bg-slate-950 border border-slate-800",
  authCard: "w-full max-w-md p-8 sm:p-10 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl",

  // Typography
  h1: "text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.15]",
  h2: "text-2xl sm:text-3xl font-bold text-white tracking-tight",
  h3: "text-lg font-bold text-white",
  subtitle: "text-lg sm:text-xl text-slate-300 leading-relaxed font-normal",
  body: "text-sm text-slate-300 leading-relaxed",
  caption: "text-xs text-slate-400",
  overline: "text-xs font-bold text-slate-400 uppercase tracking-wider",

  // Form Inputs
  input: "w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all",
  label: "block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2",

  // Buttons
  btnPrimary: "inline-flex items-center justify-center font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 rounded-xl shadow-md transition-all gap-2 disabled:opacity-50",
  btnPrimaryLg: "inline-flex items-center justify-center font-bold text-base text-white bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-xl shadow-lg transition-all gap-2 disabled:opacity-50",
  btnSecondary: "inline-flex items-center justify-center font-semibold text-sm text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-3.5 rounded-xl shadow-sm transition-all gap-2",
  btnGhost: "inline-flex items-center justify-center font-semibold text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all gap-2",
  btnSmallAction: "w-full text-center py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5",

  // Badges & Notices
  badgeNeutral: "inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium",
  badgeRecommended: "inline-flex items-center px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider",
  bannerNotice: "p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-800 text-xs font-semibold text-indigo-300 flex items-center gap-2",
  bannerError: "p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs font-medium text-red-300 flex items-center gap-2",

  // Icon Containers
  iconBoxPrimary: "w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md text-white",
  iconBoxNeutral: "w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400",
  iconBoxLarge: "w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400",
} as const;
