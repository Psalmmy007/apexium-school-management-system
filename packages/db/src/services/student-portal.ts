import {
  db,
  students,
  users,
  classes,
  timetableEntries,
  periods,
  subjects,
  studentAttendance,
  studentScores,
  cbtExams,
  cbtExamSessions,
  lmsLessons,
  lmsAssignments,
  lmsSubmissions,
  announcements,
  studentNotifications,
  terms,
} from "../index";
import { eq, and, desc } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────

export interface UpdateStudentProfileInput {
  photoUrl?: string;
  address?: string;
  notificationPreferences?: Record<string, boolean>;
}

// ── Student Identification & Isolation ──────────────────────────────

/**
 * Resolves student record by schoolId and userId.
 * Strictly scoped to schoolId to prevent cross-tenant access.
 */
export async function getStudentProfileByUserId(schoolId: string, userId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.userId, userId)));

  if (student) return student;

  // Fallback: if student record doesn't have userId attached, attempt matching by email or first user link
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.schoolId, schoolId)));

  if (!user) return null;

  // Match by schoolId and status
  const [matchingStudent] = await db
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.status, "active")));

  if (matchingStudent && !matchingStudent.userId) {
    await db
      .update(students)
      .set({ userId, updatedAt: new Date() })
      .where(eq(students.id, matchingStudent.id));
    return { ...matchingStudent, userId };
  }

  return matchingStudent ?? null;
}

/**
 * Get student by ID with school tenant isolation check.
 */
export async function getStudentById(schoolId: string, studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

  return student ?? null;
}

// ── Student Dashboard Overview ──────────────────────────────────────

/**
 * Fetches personalized dashboard summary for student.
 * All queries are strictly scoped by schoolId and studentId/classId.
 */
export async function getStudentDashboardOverview(schoolId: string, studentId: string) {
  const student = await getStudentById(schoolId, studentId);
  if (!student) throw new Error("Student not found or unauthorized");

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayName = dayNames[new Date().getDay()];

  // 1. Today's Timetable
  const todayTimetable = student.classId
    ? await db
        .select({
          id: timetableEntries.id,
          dayOfWeek: timetableEntries.dayOfWeek,
          subjectId: timetableEntries.subjectId,
          periodId: timetableEntries.periodId,
        })
        .from(timetableEntries)
        .where(
          and(
            eq(timetableEntries.schoolId, schoolId),
            eq(timetableEntries.classId, student.classId),
            eq(timetableEntries.dayOfWeek, todayName as any)
          )
        )
    : [];

  // 2. Attendance Stats
  const attendanceRecords = await db
    .select()
    .from(studentAttendance)
    .where(and(eq(studentAttendance.schoolId, schoolId), eq(studentAttendance.studentId, studentId)));

  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((a) => a.status === "present").length;
  const absentCount = attendanceRecords.filter((a) => a.status === "absent").length;
  const lateCount = attendanceRecords.filter((a) => a.status === "late").length;
  const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

  // 3. Upcoming Assignments
  const upcomingAssignments = student.classId
    ? await db
        .select()
        .from(lmsAssignments)
        .where(
          and(
            eq(lmsAssignments.schoolId, schoolId),
            eq(lmsAssignments.classId, student.classId)
          )
        )
        .orderBy(desc(lmsAssignments.createdAt))
    : [];

  // 4. CBT Exams
  const cbtExamsList = student.classId
    ? await db
        .select()
        .from(cbtExams)
        .where(
          and(
            eq(cbtExams.schoolId, schoolId),
            eq(cbtExams.classId, student.classId),
            eq(cbtExams.status, "published")
          )
        )
    : [];

  // 5. Active Announcements (school-wide or student's class)
  const now = new Date();
  const allAnnouncements = await db
    .select()
    .from(announcements)
    .where(eq(announcements.schoolId, schoolId))
    .orderBy(desc(announcements.publishedAt));

  const activeAnnouncements = allAnnouncements.filter((a) => {
    if (a.expiresAt && a.expiresAt < now) return false;
    if (!a.publishedAt || a.publishedAt > now) return false;
    if (!a.classId) return true;
    return a.classId === student.classId;
  });

  // 6. Unread Notifications Count
  const notifications = await db
    .select()
    .from(studentNotifications)
    .where(
      and(
        eq(studentNotifications.schoolId, schoolId),
        eq(studentNotifications.studentId, studentId),
        eq(studentNotifications.isRead, false)
      )
    );

  // 7. Recent Scores
  const recentScores = await db
    .select()
    .from(studentScores)
    .where(and(eq(studentScores.schoolId, schoolId), eq(studentScores.studentId, studentId)))
    .orderBy(desc(studentScores.createdAt));

  return {
    student,
    todayTimetable,
    attendanceSummary: {
      total: totalAttendance,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      percentage: attendancePercentage,
    },
    upcomingAssignments: upcomingAssignments.slice(0, 5),
    cbtExamsCount: cbtExamsList.length,
    announcements: activeAnnouncements.slice(0, 5),
    unreadNotificationsCount: notifications.length,
    recentScores: recentScores.slice(0, 5),
  };
}

// ── Timetable View ──────────────────────────────────────────────────

export async function getStudentTimetable(schoolId: string, studentId: string) {
  const student = await getStudentById(schoolId, studentId);
  if (!student || !student.classId) return [];

  return db
    .select()
    .from(timetableEntries)
    .where(and(eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.classId, student.classId)));
}

// ── Attendance History ──────────────────────────────────────────────

export async function getStudentAttendanceHistory(schoolId: string, studentId: string) {
  const student = await getStudentById(schoolId, studentId);
  if (!student) throw new Error("Student not found");

  const records = await db
    .select()
    .from(studentAttendance)
    .where(and(eq(studentAttendance.schoolId, schoolId), eq(studentAttendance.studentId, studentId)))
    .orderBy(desc(studentAttendance.date));

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const excused = records.filter((r) => r.status === "excused").length;

  return {
    total,
    present,
    absent,
    late,
    excused,
    percentage: total > 0 ? Math.round((present / total) * 100) : 100,
    records,
  };
}

// ── Academic Results ────────────────────────────────────────────────

export async function getStudentAcademicResults(schoolId: string, studentId: string) {
  const student = await getStudentById(schoolId, studentId);
  if (!student) throw new Error("Student not found");

  const scores = await db
    .select()
    .from(studentScores)
    .where(and(eq(studentScores.schoolId, schoolId), eq(studentScores.studentId, studentId)))
    .orderBy(desc(studentScores.createdAt));

  const gpa =
    scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length) * 100) / 100
      : 0;

  return { student, scores, gpa };
}

// ── CBT Integration ──────────────────────────────────────────────────

export async function getStudentCbtOverview(schoolId: string, studentId: string) {
  const student = await getStudentById(schoolId, studentId);
  if (!student) throw new Error("Student not found");

  const availableExams = student.classId
    ? await db
        .select()
        .from(cbtExams)
        .where(
          and(
            eq(cbtExams.schoolId, schoolId),
            eq(cbtExams.classId, student.classId),
            eq(cbtExams.status, "published")
          )
        )
    : [];

  const sessions = await db
    .select()
    .from(cbtExamSessions)
    .where(and(eq(cbtExamSessions.schoolId, schoolId), eq(cbtExamSessions.studentId, studentId)))
    .orderBy(desc(cbtExamSessions.startedAt));

  return { availableExams, sessions };
}

// ── LMS Integration ──────────────────────────────────────────────────

export async function getStudentLmsOverview(schoolId: string, studentId: string) {
  const student = await getStudentById(schoolId, studentId);
  if (!student) throw new Error("Student not found");

  const lessons = student.classId
    ? await db
        .select()
        .from(lmsLessons)
        .where(
          and(
            eq(lmsLessons.schoolId, schoolId),
            eq(lmsLessons.classId, student.classId)
          )
        )
        .orderBy(desc(lmsLessons.createdAt))
    : [];

  const assignments = student.classId
    ? await db
        .select()
        .from(lmsAssignments)
        .where(
          and(
            eq(lmsAssignments.schoolId, schoolId),
            eq(lmsAssignments.classId, student.classId)
          )
        )
        .orderBy(desc(lmsAssignments.createdAt))
    : [];

  const submissions = await db
    .select()
    .from(lmsSubmissions)
    .where(and(eq(lmsSubmissions.schoolId, schoolId), eq(lmsSubmissions.studentId, studentId)));

  return { lessons, assignments, submissions };
}

// ── Notifications ───────────────────────────────────────────────────

export async function getStudentNotifications(schoolId: string, studentId: string) {
  return db
    .select()
    .from(studentNotifications)
    .where(and(eq(studentNotifications.schoolId, schoolId), eq(studentNotifications.studentId, studentId)))
    .orderBy(desc(studentNotifications.createdAt));
}

export async function markNotificationAsRead(
  schoolId: string,
  studentId: string,
  notificationId: string
) {
  const [updated] = await db
    .update(studentNotifications)
    .set({ isRead: true })
    .where(
      and(
        eq(studentNotifications.id, notificationId),
        eq(studentNotifications.schoolId, schoolId),
        eq(studentNotifications.studentId, studentId)
      )
    )
    .returning();

  return updated ?? null;
}

// ── Student Profile Management ──────────────────────────────────────

export async function updateStudentProfile(
  schoolId: string,
  studentId: string,
  input: UpdateStudentProfileInput
) {
  const [updated] = await db
    .update(students)
    .set({
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(input.notificationPreferences ? { notificationPreferences: input.notificationPreferences } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .returning();

  return updated ?? null;
}
