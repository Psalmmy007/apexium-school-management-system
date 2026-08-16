"use client";

import React, { useState, useRef } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { Building2, Phone, Mail, MapPin, Sparkles, Upload, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface SchoolSettingsData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  motto: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsClientProps {
  initialSettings: SchoolSettingsData | null;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [name, setName] = useState(initialSettings?.name || "");
  const [motto, setMotto] = useState(initialSettings?.motto || "");
  const [phone, setPhone] = useState(initialSettings?.phone || "");
  const [email, setEmail] = useState(initialSettings?.email || "");
  const [address, setAddress] = useState(initialSettings?.address || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(initialSettings?.logoUrl || null);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed uploading school logo.");
      }

      setLogoUrl(json.url);
      setSuccessMsg("School logo uploaded. Click 'Save Changes' to apply.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed uploading logo.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    setSuccessMsg("School logo removed. Click 'Save Changes' to apply.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg("School Name is required.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/settings/school", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          motto: motto.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          logoUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed saving school settings.");
      }

      setSuccessMsg("School profile and settings updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed saving school settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-indigo-400" />
            General School Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your school identity, official campus location, contact info, motto, and institutional logo.
          </p>
        </div>

        {initialSettings?.slug && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            Tenant Slug: <span className="text-indigo-400 font-semibold ml-1.5">{initialSettings.slug}</span>
          </div>
        )}
      </div>

      {/* Notification Banners */}
      {successMsg && (
        <div id="settings-success-banner" className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 flex items-center gap-3 animate-fade-in text-sm shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div id="settings-error-banner" className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 flex items-center gap-3 animate-fade-in text-sm shadow-md">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Institutional Logo & Identity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            School Logo & Branding
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo Preview Avatar */}
            <div className="w-28 h-28 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-inner">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  id="settings-logo-preview"
                  src={logoUrl}
                  alt="School Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-1 p-2 text-center">
                  <Building2 className="w-8 h-8 text-slate-600" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">No Logo</span>
                </div>
              )}
            </div>

            {/* Upload & Action Controls */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-sm font-medium text-slate-200">Official Crest / Logo Image</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rendered on student ID cards, report cards, fee invoices, and official school headers. PNG, JPG, WebP, or SVG (max 5MB).
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  id="settings-logo-input"
                />
                <button
                  type="button"
                  id="settings-logo-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo || saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {logoUrl ? "Replace Logo" : "Upload Logo"}
                </button>

                {logoUrl && (
                  <button
                    type="button"
                    id="settings-logo-remove-btn"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo || saving}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: School Profile Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Institution Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* School Name */}
            <div className="sm:col-span-2">
              <label htmlFor="settings-school-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                School Name <span className="text-red-400">*</span>
              </label>
              <input
                id="settings-school-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apexium Model International College"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* School Motto */}
            <div className="sm:col-span-2">
              <label htmlFor="settings-school-motto" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                School Motto / Slogan
              </label>
              <input
                id="settings-school-motto"
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="e.g. Excellence, Character & Knowledge"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="settings-school-phone" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </label>
              <input
                id="settings-school-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234 803 123 4567"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="settings-school-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Contact Email
              </label>
              <input
                id="settings-school-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. info@apexium.edu.ng"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Campus Address */}
            <div className="sm:col-span-2">
              <label htmlFor="settings-school-address" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Campus Physical Address
              </label>
              <textarea
                id="settings-school-address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Plot 15, Admiralty Way, Lekki Phase 1, Lagos State"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            id="settings-save-btn"
            disabled={saving || uploadingLogo}
            className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save School Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
