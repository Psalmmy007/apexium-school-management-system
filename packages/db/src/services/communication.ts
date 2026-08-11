import {
  db,
  commAnnouncements,
  commNotificationTemplates,
  commNotifications,
  commDomainEvents,
  commScheduledTriggers,
  commUserPreferences,
  commAuditLogs,
  users,
} from "../index";
import { eq, and, sql, inArray, desc, count } from "drizzle-orm";

// ── Audit Trail Logger ──────────────────────────────────────
export async function logCommAuditTrail(data: {
  schoolId: string;
  performedById?: string;
  action: string;
  details: string;
}) {
  const [log] = await db
    .insert(commAuditLogs)
    .values({
      schoolId: data.schoolId,
      performedById: data.performedById,
      action: data.action,
      details: data.details,
    })
    .returning();
  return log;
}

// ── 1. Default Notification Templates & Dynamic Placeholder Engine ──
export function renderTemplate(templateString: string, placeholders: Record<string, string | number>): string {
  let rendered = templateString;
  for (const [key, value] of Object.entries(placeholders)) {
    const reg = new RegExp(`\\{${key}\\}`, "g");
    rendered = rendered.replace(reg, String(value));
  }
  return rendered;
}

export async function setupDefaultNotificationTemplates(schoolId: string) {
  const existing = await db
    .select()
    .from(commNotificationTemplates)
    .where(eq(commNotificationTemplates.schoolId, schoolId));

  if (existing.length > 0) return existing;

  const defaults = [
    {
      schoolId,
      name: "School Fee Payment Reminder",
      code: "FEE_REMINDER",
      channel: "in_app",
      subjectTemplate: "Fee Reminder for {student_name}",
      bodyTemplate: "Dear Parent, a tuition fee balance of ₦{fee_amount} is due on {due_date} for {student_name}.",
    },
    {
      schoolId,
      name: "Unexcused Student Absence Alert",
      code: "STUDENT_ABSENT",
      channel: "in_app",
      subjectTemplate: "Absence Alert: {student_name}",
      bodyTemplate: "Notice: {student_name} was marked absent for class on {date}.",
    },
    {
      schoolId,
      name: "Report Card Ready Notification",
      code: "REPORT_CARD_READY",
      channel: "in_app",
      subjectTemplate: "Term Report Card Available",
      bodyTemplate: "The {term} report card for {student_name} is now ready to download in the Parent Portal.",
    },
    {
      schoolId,
      name: "New Assignment Published",
      code: "ASSIGNMENT_DUE",
      channel: "in_app",
      subjectTemplate: "New Assignment: {subject_name}",
      bodyTemplate: "A new assignment '{assignment_title}' has been assigned in {subject_name}. Due Date: {due_date}.",
    },
    {
      schoolId,
      name: "Hostel Fee Payment Notice",
      code: "HOSTEL_FEE_DUE",
      channel: "in_app",
      subjectTemplate: "Hostel Fee Renewal Notice",
      bodyTemplate: "Hostel accommodation fee of ₦{fee_amount} for Room {room_number} is due for renewal.",
    },
    {
      schoolId,
      name: "Transport Bus Arrival Alert",
      code: "TRANSPORT_ALERT",
      channel: "in_app",
      subjectTemplate: "School Bus Status: Route {route_name}",
      bodyTemplate: "Transport update for Route {route_name}: Bus {vehicle_num} has arrived at Stop {stop_name}.",
    },
  ];

  await db.insert(commNotificationTemplates).values(defaults).onConflictDoNothing();
  return await db.select().from(commNotificationTemplates).where(eq(commNotificationTemplates.schoolId, schoolId));
}

// ── 2. Event-Driven Domain Event Bus ──────────────────────────
export async function emitDomainEvent(data: {
  schoolId: string;
  eventType: string; // STUDENT_ABSENT, FEE_REMINDER, ASSIGNMENT_DUE, REPORT_CARD_READY, etc.
  entityId?: string;
  payload: Record<string, any>;
  recipientUserIds?: string[];
}) {
  const { schoolId, eventType, entityId, payload } = data;

  // 1. Record Domain Event
  const [eventRecord] = await db
    .insert(commDomainEvents)
    .values({
      schoolId,
      eventType,
      entityId,
      payload,
      processed: false,
    })
    .returning();

  // 2. Asynchronously Process Event to Generate Notifications
  await processDomainEvent(eventRecord.id, data.recipientUserIds);

  return eventRecord;
}

export async function processDomainEvent(eventId: string, targetUserIds?: string[]) {
  const [event] = await db
    .select()
    .from(commDomainEvents)
    .where(eq(commDomainEvents.id, eventId));

  if (!event || event.processed) return;

  const schoolId = event.schoolId;
  const payload = (event.payload as Record<string, any>) || {};

  // Find matching template
  const templates = await db
    .select()
    .from(commNotificationTemplates)
    .where(
      and(
        eq(commNotificationTemplates.schoolId, schoolId),
        eq(commNotificationTemplates.code, event.eventType),
        eq(commNotificationTemplates.active, true)
      )
    );

  if (templates.length === 0) {
    // If no template, mark processed
    await db.update(commDomainEvents).set({ processed: true }).where(eq(commDomainEvents.id, event.id));
    return;
  }

  const template = templates[0];
  const renderedSubject = renderTemplate(template.subjectTemplate, payload);
  const renderedBody = renderTemplate(template.bodyTemplate, payload);

  // Resolve Recipient Users if not explicitly passed
  let recipientIds = targetUserIds || [];
  if (recipientIds.length === 0 && payload.recipientUserId) {
    recipientIds = [payload.recipientUserId];
  }

  if (recipientIds.length === 0) {
    // Default to all active users in school for general event broadcast
    const schoolUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.schoolId, schoolId))
      .limit(50);
    recipientIds = schoolUsers.map((u) => u.id);
  }

  // Generate Notifications respecting User Channel Preferences
  for (const recipientId of recipientIds) {
    const prefs = await db
      .select()
      .from(commUserPreferences)
      .where(and(eq(commUserPreferences.schoolId, schoolId), eq(commUserPreferences.userId, recipientId)));

    const inAppEnabled = prefs.length === 0 || prefs[0].inAppEnabled;
    if (!inAppEnabled && template.channel === "in_app") continue;

    await db.insert(commNotifications).values({
      schoolId,
      templateId: template.id,
      recipientUserId: recipientId,
      recipientRole: payload.recipientRole || "parent",
      channel: template.channel,
      title: renderedSubject,
      message: renderedBody,
      metadata: payload,
      status: "Sent",
      sentAt: new Date(),
    });
  }

  // Mark Event as Processed
  await db.update(commDomainEvents).set({ processed: true }).where(eq(commDomainEvents.id, event.id));
}

// ── 3. Announcements Publishing ──────────────────────────────
export async function publishAnnouncement(data: {
  schoolId: string;
  title: string;
  content: string;
  category?: string;
  audienceType?: string; // all, staff, teachers, parents, students
  targetId?: string;
  publishedById?: string;
}) {
  const { schoolId, title, content, category, audienceType, targetId, publishedById } = data;

  const [announcement] = await db
    .insert(commAnnouncements)
    .values({
      schoolId,
      title: title.trim(),
      content: content.trim(),
      category: category || "general",
      audienceType: audienceType || "all",
      targetId,
      publishedById,
      status: "Published",
    })
    .returning();

  // Emit Domain Event for Announcement
  await emitDomainEvent({
    schoolId,
    eventType: "ANNOUNCEMENT_PUBLISHED",
    entityId: announcement.id,
    payload: {
      announcement_title: announcement.title,
      category: announcement.category,
      audience: announcement.audienceType,
    },
  });

  await logCommAuditTrail({
    schoolId,
    performedById: publishedById,
    action: "announcement_published",
    details: `Published Announcement: ${title} (${audienceType}).`,
  });

  return announcement;
}

// ── 4. In-App User Notifications & Read Receipts ──────────────
export async function getUserNotifications(userId: string, schoolId: string) {
  return await db
    .select()
    .from(commNotifications)
    .where(and(eq(commNotifications.schoolId, schoolId), eq(commNotifications.recipientUserId, userId)))
    .orderBy(desc(commNotifications.createdAt));
}

export async function markCommNotificationAsRead(userId: string, notificationId: string, schoolId: string) {
  const [notif] = await db
    .update(commNotifications)
    .set({
      status: "Read",
      readAt: new Date(),
    })
    .where(and(eq(commNotifications.id, notificationId), eq(commNotifications.recipientUserId, userId), eq(commNotifications.schoolId, schoolId)))
    .returning();

  return notif;
}

// ── 5. Communication Analytics & Engagement Metrics ─────────
export async function getCommunicationAnalytics(schoolId: string) {
  const allNotifs = await db
    .select()
    .from(commNotifications)
    .where(eq(commNotifications.schoolId, schoolId));

  const totalSent = allNotifs.length;
  const deliveredCount = allNotifs.filter((n) => n.status === "Delivered" || n.status === "Read" || n.status === "Sent").length;
  const readCount = allNotifs.filter((n) => n.status === "Read").length;
  const failedCount = allNotifs.filter((n) => n.status === "Failed").length;

  const deliveryRate = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 100;
  const readRate = totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0;

  const channelBreakdown = {
    in_app: allNotifs.filter((n) => n.channel === "in_app").length,
    email: allNotifs.filter((n) => n.channel === "email").length,
    sms: allNotifs.filter((n) => n.channel === "sms").length,
    push: allNotifs.filter((n) => n.channel === "push").length,
  };

  const announcements = await db
    .select()
    .from(commAnnouncements)
    .where(eq(commAnnouncements.schoolId, schoolId));

  return {
    totalSent,
    deliveredCount,
    readCount,
    failedCount,
    deliveryRate,
    readRate,
    channelBreakdown,
    totalAnnouncements: announcements.length,
  };
}

export async function sendNotification(data: {
  schoolId: string;
  recipientId: string;
  title: string;
  message: string;
  type?: string;
}) {
  return emitDomainEvent({
    schoolId: data.schoolId,
    eventType: data.type ?? "system_alert",
    payload: { title: data.title, message: data.message, recipientId: data.recipientId },
  });
}
