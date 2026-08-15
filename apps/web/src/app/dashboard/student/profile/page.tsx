"use client";

import { useEffect, useState } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  photoUrl?: string;
  address?: string;
  status: string;
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/student/profile");
        const json = await res.json();
        if (json.success) {
          setProfile(json.data);
          setPhotoUrl(json.data.photoUrl ?? "");
          setAddress(json.data.address ?? "");
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, address }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Profile updated successfully!");
        setProfile(json.data);
      } else {
        setMessage(json.error ?? "Failed updating profile");
      }
    } catch (err) {
      setMessage("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back to Student Dashboard Navigation */}
      <BackNavigation href="/dashboard/student" label="Back to Student Dashboard" />

      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Student Profile & Settings</h1>
        <p className="text-sm text-slate-400">Manage profile photo, address, and preferences</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading student profile...</div>
      ) : (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          {message && (
            <div className="p-3 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
              {message}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase">Admission Number (SIS Record)</label>
            <input
              type="text"
              disabled
              value={profile?.admissionNumber ?? ""}
              className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase">First Name</label>
              <input
                type="text"
                disabled
                value={profile?.firstName ?? ""}
                className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase">Last Name</label>
              <input
                type="text"
                disabled
                value={profile?.lastName ?? ""}
                className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase">Profile Photo URL</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase">Residential Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter residential address"
              rows={3}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition"
          >
            {saving ? "Saving Changes..." : "Save Profile Settings"}
          </button>
        </form>
      )}
    </div>
  );
}
