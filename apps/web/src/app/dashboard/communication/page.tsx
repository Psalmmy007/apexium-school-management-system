import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  db,
  setupDefaultNotificationTemplates,
  getUserNotifications,
  getCommunicationAnalytics,
  commAnnouncements,
} from "@apexium/db";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { CommunicationClient } from "./CommunicationClient";

export const metadata: Metadata = {
  title: "Communication Centre — ERP",
};

export default async function CommunicationDashboardPage() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    redirect("/auth/login");
  }

  let announcements: any[] = [];
  let templates: any[] = [];
  let notifications: any[] = [];
  const defaultAnalytics = {
    totalSent: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    deliveryRate: 100,
    readRate: 0,
    channelBreakdown: { in_app: 0, email: 0, sms: 0, push: 0 },
    totalAnnouncements: 0,
  };

  let analytics: any = defaultAnalytics;

  try {
    templates = await setupDefaultNotificationTemplates(user.schoolId);

    const [aList, nList, stats] = await Promise.all([
      db
        .select()
        .from(commAnnouncements)
        .where(eq(commAnnouncements.schoolId, user.schoolId))
        .orderBy(desc(commAnnouncements.createdAt)),
      getUserNotifications(user.id, user.schoolId),
      getCommunicationAnalytics(user.schoolId),
    ]);

    announcements = aList.map((a) => ({
      ...a,
      createdAt: a.createdAt ? a.createdAt.toISOString() : "",
    }));

    notifications = nList.map((n) => ({
      ...n,
      sentAt: n.sentAt ? n.sentAt.toISOString() : "",
      readAt: n.readAt ? n.readAt.toISOString() : undefined,
    }));

    analytics = stats;
  } catch (error) {
    console.error("Failed loading communication dashboard data:", error);
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Communication & Notification Centre
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Event-driven multi-channel notification platform, school announcements, dynamic template placeholders, delivery queue logs, and analytics.
          </p>
        </div>
      </div>

      <CommunicationClient
        initialAnnouncements={announcements}
        initialTemplates={templates}
        initialNotifications={notifications}
        initialAnalytics={analytics}
        userRole={user.role}
      />
    </div>
  );
}
