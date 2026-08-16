import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getSchoolGeneralSettings } from "@apexium/db";
import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "School Settings — ERP",
  description: "Manage institution profile, campus address, contact details, motto, and school logo.",
};

export default async function SchoolSettingsPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "platform_operator")) {
    redirect("/auth/login");
  }

  const initialSettings = user.schoolId
    ? await getSchoolGeneralSettings(user.schoolId)
    : null;

  return (
    <SettingsClient
      initialSettings={
        initialSettings
          ? {
              ...initialSettings,
              createdAt: initialSettings.createdAt.toISOString(),
              updatedAt: initialSettings.updatedAt.toISOString(),
            }
          : null
      }
    />
  );
}
