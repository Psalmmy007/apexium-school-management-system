import {
  db,
  messageThreads,
  messages,
  studentGuardians,
  timetableEntries,
  classes,
  students,
  cbtExamSessions,
  lmsSubmissions,
  lmsAssignments,
  users,
} from "../index";
import { eq, and, or, count, desc, inArray } from "drizzle-orm";

export interface CreateThreadInput {
  schoolId: string;
  studentId?: string;
  parentId?: string;
  teacherId: string;
  subject: string;
  initialMessage: string;
}

export interface SendMessageInput {
  schoolId: string;
  threadId: string;
  senderId: string;
  content: string;
}

// ── Teacher Home Overview Aggregation ────────────────────────────────────
export async function getTeacherHomeOverview(schoolId: string, teacherId: string) {
  // 1. Assigned Today's Timetable Entries
  const timetable = await db
    .select()
    .from(timetableEntries)
    .where(and(eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.teacherId, teacherId)));

  // 2. Assigned Classes Count
  const assignedClassIds = Array.from(new Set(timetable.map((t) => t.classId)));
  const assignedClassesCount = assignedClassIds.length;

  // 3. Pending CBT Exam Sessions (submitted or in_progress)
  const [cbtPending] = await db
    .select({ count: count() })
    .from(cbtExamSessions)
    .where(and(eq(cbtExamSessions.schoolId, schoolId), eq(cbtExamSessions.status, "in_progress")));

  // 4. Pending LMS Assignment Submissions
  const [lmsPending] = await db
    .select({ count: count() })
    .from(lmsSubmissions)
    .where(and(eq(lmsSubmissions.schoolId, schoolId), eq(lmsSubmissions.status, "submitted")));

  // 5. Unread Messages Count
  const [unreadMsg] = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        eq(messages.schoolId, schoolId),
        eq(messages.recipientId, teacherId),
        eq(messages.isRead, false)
      )
    );

  return {
    todayTimetableCount: timetable.length,
    assignedClassesCount,
    pendingCbtGradingCount: Number(cbtPending?.count || 0),
    pendingLmsGradingCount: Number(lmsPending?.count || 0),
    unreadMessagesCount: Number(unreadMsg?.count || 0),
  };
}

// ── Threaded Messaging Service ───────────────────────────────────────────

/**
 * Creates a message thread strictly validated against student-guardian relationships.
 */
export async function createMessageThread(input: CreateThreadInput) {
  // 1. SECURITY & RELATIONSHIP VALIDATION:
  // If messaging a parent about a student, verify studentGuardians link exists!
  if (input.parentId && input.studentId) {
    const [guardianLink] = await db
      .select()
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.schoolId, input.schoolId),
          eq(studentGuardians.studentId, input.studentId),
          eq(studentGuardians.parentId, input.parentId)
        )
      );

    if (!guardianLink) {
      throw new Error("Unauthorized: Parent is not linked as a guardian to this student.");
    }
  }

  // 2. Create message thread
  const [thread] = await db
    .insert(messageThreads)
    .values({
      schoolId: input.schoolId,
      studentId: input.studentId || null,
      parentId: input.parentId || null,
      teacherId: input.teacherId,
      subject: input.subject,
      status: "open",
      lastMessageAt: new Date(),
    })
    .returning();

  // 3. Determine recipient
  const recipientId = input.parentId || input.teacherId;

  // 4. Create initial message
  await db.insert(messages).values({
    schoolId: input.schoolId,
    threadId: thread.id,
    senderId: input.teacherId,
    recipientId,
    content: input.initialMessage,
    isRead: false,
  });

  return thread;
}

/**
 * Send a reply message within an existing thread.
 */
export async function sendMessage(input: SendMessageInput) {
  // 1. Verify thread exists and belongs to school
  const [thread] = await db
    .select()
    .from(messageThreads)
    .where(and(eq(messageThreads.id, input.threadId), eq(messageThreads.schoolId, input.schoolId)));

  if (!thread) throw new Error("Message thread not found.");

  // 2. SECURITY CHECK: Verify sender is a participant in this thread
  if (thread.teacherId !== input.senderId && thread.parentId !== input.senderId) {
    throw new Error("Unauthorized: Sender is not a participant in this message thread.");
  }

  // 3. Determine recipient
  const recipientId = input.senderId === thread.teacherId ? thread.parentId : thread.teacherId;
  if (!recipientId) throw new Error("Thread recipient not defined.");

  // 4. Insert message & update thread timestamp
  const [msg] = await db
    .insert(messages)
    .values({
      schoolId: input.schoolId,
      threadId: thread.id,
      senderId: input.senderId,
      recipientId,
      content: input.content,
      isRead: false,
    })
    .returning();

  await db
    .update(messageThreads)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messageThreads.id, thread.id));

  return msg;
}

/**
 * List message threads for a user (teacher or parent) in a school.
 */
export async function listUserThreads(schoolId: string, userId: string) {
  return db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.schoolId, schoolId),
        or(eq(messageThreads.teacherId, userId), eq(messageThreads.parentId, userId))
      )
    )
    .orderBy(desc(messageThreads.lastMessageAt));
}

/**
 * Fetch messages inside a thread with read receipt updates.
 */
export async function getThreadMessages(schoolId: string, threadId: string, userId: string) {
  // 1. Verify thread access
  const [thread] = await db
    .select()
    .from(messageThreads)
    .where(and(eq(messageThreads.id, threadId), eq(messageThreads.schoolId, schoolId)));

  if (!thread) throw new Error("Thread not found.");
  if (thread.teacherId !== userId && thread.parentId !== userId) {
    throw new Error("Unauthorized: You do not have access to this conversation thread.");
  }

  // 2. Automatically mark unread messages for userId as read
  await db
    .update(messages)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(messages.schoolId, schoolId),
        eq(messages.threadId, threadId),
        eq(messages.recipientId, userId),
        eq(messages.isRead, false)
      )
    );

  // 3. Fetch all messages in thread
  const threadMessages = await db
    .select()
    .from(messages)
    .where(and(eq(messages.schoolId, schoolId), eq(messages.threadId, threadId)))
    .orderBy(messages.createdAt);

  return { thread, messages: threadMessages };
}
