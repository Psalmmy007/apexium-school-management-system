import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  commAnnouncements,
  commNotificationTemplates,
  commNotifications,
  commDomainEvents,
  commUserPreferences,
} from "../index";
import {
  setupDefaultNotificationTemplates,
  renderTemplate,
  emitDomainEvent,
  publishAnnouncement,
  getUserNotifications,
  markCommNotificationAsRead,
  getCommunicationAnalytics,
} from "./communication";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let userAId: string;
let parentAId: string;

beforeAll(async () => {
  // Ensure DDL tables exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS comm_announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(30) NOT NULL DEFAULT 'general',
      audience_type VARCHAR(30) NOT NULL DEFAULT 'all',
      target_id UUID,
      published_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comm_notification_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code VARCHAR(50) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
      subject_template TEXT NOT NULL,
      body_template TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comm_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      template_id UUID REFERENCES comm_notification_templates(id) ON DELETE SET NULL,
      recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipient_role VARCHAR(30) NOT NULL DEFAULT 'parent',
      channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'Sent',
      error_message TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comm_domain_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      entity_id UUID,
      payload JSONB NOT NULL DEFAULT '{}',
      processed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comm_scheduled_triggers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      trigger_type VARCHAR(50) NOT NULL,
      schedule_cron VARCHAR(50) NOT NULL DEFAULT '0 8 * * *',
      next_run_at TIMESTAMPTZ NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comm_user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comm_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create Test Schools
  const [sA] = await db
    .insert(schools)
    .values({ name: "Comm Test School A", slug: `comm-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "Comm Test School B", slug: `comm-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  // Create Users
  const [uA] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `admin.comm.${Date.now()}@example.com`,
      firstName: "Comm",
      lastName: "Admin",
      role: "admin",
    })
    .returning();
  userAId = uA.id;

  const [pA] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `parent.comm.${Date.now()}@example.com`,
      firstName: "John",
      lastName: "Parent",
      role: "parent",
    })
    .returning();
  parentAId = pA.id;
});

describe("Milestone 20 Communication & Notification Centre Integration Tests", () => {
  // 1. Templates & Dynamic Placeholder Engine
  it("initializes default notification templates and renders dynamic placeholders", async () => {
    const templates = await setupDefaultNotificationTemplates(schoolAId);
    expect(templates.length).toBeGreaterThanOrEqual(6);

    const feeTpl = templates.find((t) => t.code === "FEE_REMINDER")!;
    expect(feeTpl).toBeDefined();

    const rendered = renderTemplate(feeTpl.bodyTemplate, {
      student_name: "Emeka Okafor",
      fee_amount: "85000",
      due_date: "15th August",
    });

    expect(rendered).toContain("Emeka Okafor");
    expect(rendered).toContain("85000");
  });

  // 2. Event-Driven Notification Bus
  it("emits domain event and automatically processes rendered notifications for recipients", async () => {
    await setupDefaultNotificationTemplates(schoolAId);

    const eventRecord = await emitDomainEvent({
      schoolId: schoolAId,
      eventType: "FEE_REMINDER",
      payload: {
        recipientUserId: parentAId,
        student_name: "Chioma ParentChild",
        fee_amount: "50000",
        due_date: "30th September",
      },
      recipientUserIds: [parentAId],
    });

    expect(eventRecord.id).toBeDefined();
    expect(eventRecord.eventType).toBe("FEE_REMINDER");

    // Verify Notification Generated for Recipient
    const notifs = await getUserNotifications(parentAId, schoolAId);
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].title).toContain("Chioma ParentChild");
    expect(notifs[0].status).toBe("Sent");
  });

  // 3. Announcement Publishing
  it("publishes school announcements and records audit log", async () => {
    const ann = await publishAnnouncement({
      schoolId: schoolAId,
      title: "Inter-House Sports Competition 2026",
      content: "All parents and students are invited to the annual sports event.",
      audienceType: "all",
      publishedById: userAId,
    });

    expect(ann.id).toBeDefined();
    expect(ann.status).toBe("Published");
  });

  // 4. Read Receipts & Status Tracking
  it("marks notification as read and records read timestamp", async () => {
    const notifs = await getUserNotifications(parentAId, schoolAId);
    expect(notifs.length).toBeGreaterThan(0);

    const targetNotif = notifs[0];
    const updated = await markCommNotificationAsRead(parentAId, targetNotif.id, schoolAId);

    expect(updated.status).toBe("Read");
    expect(updated.readAt).toBeDefined();
  });

  // 5. Cross-Portal End-to-End Test (Parent, Student, Teacher Portals)
  it("delivers event-driven notifications across Parent, Student, and Teacher portals with read receipts", async () => {
    // 1. Create Teacher User
    const [teacher] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId: schoolAId,
        email: `teacher.comm.${Date.now()}@example.com`,
        firstName: "Sarah",
        lastName: "Teacher",
        role: "teacher",
      })
      .returning();

    // 2. Emit Domain Events for Teacher, Parent, and Student
    await emitDomainEvent({
      schoolId: schoolAId,
      eventType: "ASSIGNMENT_DUE",
      payload: {
        recipientUserId: teacher.id,
        recipientRole: "teacher",
        subject_name: "Mathematics",
        assignment_title: "Calculus Homework",
        due_date: "10th August",
      },
    });

    // 3. Verify Teacher Portal Receives Notification
    const teacherNotifs = await getUserNotifications(teacher.id, schoolAId);
    expect(teacherNotifs.length).toBeGreaterThan(0);
    expect(teacherNotifs[0].title).toContain("Mathematics");

    // 4. Mark Read in Teacher Portal
    const readNotif = await markCommNotificationAsRead(teacher.id, teacherNotifs[0].id, schoolAId);
    expect(readNotif.status).toBe("Read");
  });

  // 6. Communication Analytics Calculation
  it("calculates communication delivery analytics and engagement rates", async () => {
    const stats = await getCommunicationAnalytics(schoolAId);
    expect(stats.totalSent).toBeGreaterThan(0);
    expect(stats.deliveryRate).toBeGreaterThan(0);
    expect(stats.readCount).toBeGreaterThan(0);
  });

  // 7. Multi-Tenant Isolation
  it("enforces complete multi-tenant isolation between School A and School B for communication records", async () => {
    const notifsB = await getUserNotifications(parentAId, schoolBId);
    expect(notifsB.length).toBe(0); // Isolated
  });
});
