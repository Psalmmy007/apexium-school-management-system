import {
  db,
  lmsAttachments,
  lmsLessons,
  lmsAssignments,
  lmsSubmissions,
  studentScores,
} from "../index";
import { eq, and, desc } from "drizzle-orm";
import { calculateGrade } from "./grading";

export interface CreateAttachmentInput {
  schoolId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageProvider?: "local" | "s3" | "r2" | "supabase";
  storageKey: string;
  uploadedBy?: string;
}

export interface CreateLessonInput {
  schoolId: string;
  title: string;
  subjectId: string;
  classId: string;
  termId: string;
  topic?: string;
  contentType?: "lesson" | "quiz" | "resource" | "scorm";
  contentBody: string;
  attachmentIds?: string[];
  mediaType?: "none" | "youtube" | "vimeo" | "audio" | "direct_video";
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  createdById?: string;
}

export interface CreateAssignmentInput {
  schoolId: string;
  lessonId?: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  termId: string;
  dueAt: Date;
  totalMarks?: number;
  weightage?: number;
  createdById?: string;
}

export interface SubmitAssignmentInput {
  schoolId: string;
  assignmentId: string;
  studentId: string;
  submissionText?: string;
  attachmentId?: string;
}

export interface GradeSubmissionInput {
  schoolId: string;
  submissionId: string;
  score: number;
  feedback?: string;
  gradedById: string;
}

// ── Attachment Metadata Management ──────────────────────────────────────
export async function createAttachmentMetadata(input: CreateAttachmentInput) {
  const [attachment] = await db
    .insert(lmsAttachments)
    .values({
      schoolId: input.schoolId,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      storageProvider: input.storageProvider || "local",
      storageKey: input.storageKey,
      uploadedBy: input.uploadedBy || null,
    })
    .returning();

  return attachment;
}

export async function getAttachmentMetadata(schoolId: string, attachmentId: string) {
  const [attachment] = await db
    .select()
    .from(lmsAttachments)
    .where(and(eq(lmsAttachments.id, attachmentId), eq(lmsAttachments.schoolId, schoolId)));

  return attachment || null;
}

// ── Lesson Notes & Scheme-of-Work Management ───────────────────────────
export async function createLmsLesson(input: CreateLessonInput) {
  const [lesson] = await db
    .insert(lmsLessons)
    .values({
      schoolId: input.schoolId,
      title: input.title,
      subjectId: input.subjectId,
      classId: input.classId,
      termId: input.termId,
      topic: input.topic || null,
      contentType: input.contentType || "lesson",
      contentBody: input.contentBody,
      attachmentIds: input.attachmentIds || [],
      mediaType: input.mediaType || "none",
      mediaUrl: input.mediaUrl || null,
      metadata: input.metadata || {},
      createdById: input.createdById || null,
    })
    .returning();

  return lesson;
}

export async function listLmsLessons(
  schoolId: string,
  filter?: { classId?: string; subjectId?: string; termId?: string }
) {
  const conditions = [eq(lmsLessons.schoolId, schoolId)];
  if (filter?.classId) conditions.push(eq(lmsLessons.classId, filter.classId));
  if (filter?.subjectId) conditions.push(eq(lmsLessons.subjectId, filter.subjectId));
  if (filter?.termId) conditions.push(eq(lmsLessons.termId, filter.termId));

  return db
    .select()
    .from(lmsLessons)
    .where(and(...conditions))
    .orderBy(desc(lmsLessons.createdAt));
}

export async function getLmsLessonById(schoolId: string, lessonId: string) {
  const [lesson] = await db
    .select()
    .from(lmsLessons)
    .where(and(eq(lmsLessons.id, lessonId), eq(lmsLessons.schoolId, schoolId)));

  return lesson || null;
}

// ── Assignment Definition Management ───────────────────────────────────
export async function createLmsAssignment(input: CreateAssignmentInput) {
  const [assignment] = await db
    .insert(lmsAssignments)
    .values({
      schoolId: input.schoolId,
      lessonId: input.lessonId || null,
      title: input.title,
      description: input.description,
      subjectId: input.subjectId,
      classId: input.classId,
      termId: input.termId,
      dueAt: input.dueAt,
      totalMarks: input.totalMarks ?? 20,
      weightage: input.weightage ?? 10,
      createdById: input.createdById || null,
    })
    .returning();

  return assignment;
}

export async function listLmsAssignments(
  schoolId: string,
  filter?: { classId?: string; subjectId?: string; termId?: string }
) {
  const conditions = [eq(lmsAssignments.schoolId, schoolId)];
  if (filter?.classId) conditions.push(eq(lmsAssignments.classId, filter.classId));
  if (filter?.subjectId) conditions.push(eq(lmsAssignments.subjectId, filter.subjectId));
  if (filter?.termId) conditions.push(eq(lmsAssignments.termId, filter.termId));

  return db
    .select()
    .from(lmsAssignments)
    .where(and(...conditions))
    .orderBy(desc(lmsAssignments.dueAt));
}

// ── Student Submissions & Teacher Grading Management ─────────────────
export async function submitLmsAssignment(input: SubmitAssignmentInput) {
  // Check if existing submission exists for student + assignment
  const [existing] = await db
    .select()
    .from(lmsSubmissions)
    .where(
      and(
        eq(lmsSubmissions.schoolId, input.schoolId),
        eq(lmsSubmissions.assignmentId, input.assignmentId),
        eq(lmsSubmissions.studentId, input.studentId)
      )
    );

  if (existing) {
    const [updated] = await db
      .update(lmsSubmissions)
      .set({
        submissionText: input.submissionText || existing.submissionText,
        attachmentId: input.attachmentId || existing.attachmentId,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lmsSubmissions.id, existing.id))
      .returning();
    return updated;
  }

  const [submission] = await db
    .insert(lmsSubmissions)
    .values({
      schoolId: input.schoolId,
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      submissionText: input.submissionText || null,
      attachmentId: input.attachmentId || null,
      status: "submitted",
    })
    .returning();

  return submission;
}

/**
 * Grade a student assignment submission and IDEMPOTENTLY sync the score into
 * the core `studentScores` table used by the Academics module & Report Generator.
 */
export async function gradeLmsSubmission(input: GradeSubmissionInput) {
  // 1. Fetch submission record
  const [submission] = await db
    .select()
    .from(lmsSubmissions)
    .where(and(eq(lmsSubmissions.id, input.submissionId), eq(lmsSubmissions.schoolId, input.schoolId)));

  if (!submission) throw new Error("LMS submission not found.");

  // 2. Fetch assignment details
  const [assignment] = await db
    .select()
    .from(lmsAssignments)
    .where(eq(lmsAssignments.id, submission.assignmentId));

  if (!assignment) throw new Error("Associated LMS assignment not found.");

  // 3. Update submission score & status
  const [graded] = await db
    .update(lmsSubmissions)
    .set({
      score: input.score,
      feedback: input.feedback || null,
      status: "graded",
      gradedById: input.gradedById,
      gradedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(lmsSubmissions.id, submission.id))
    .returning();

  // 4. IDEMPOTENT GRADEBOOK SYNC: Calculate student's total graded assignment average for subject/term
  const allGradedSubmissions = await db
    .select({
      score: lmsSubmissions.score,
      totalMarks: lmsAssignments.totalMarks,
      weightage: lmsAssignments.weightage,
    })
    .from(lmsSubmissions)
    .innerJoin(lmsAssignments, eq(lmsSubmissions.assignmentId, lmsAssignments.id))
    .where(
      and(
        eq(lmsSubmissions.schoolId, input.schoolId),
        eq(lmsSubmissions.studentId, submission.studentId),
        eq(lmsSubmissions.status, "graded"),
        eq(lmsAssignments.subjectId, assignment.subjectId),
        eq(lmsAssignments.termId, assignment.termId)
      )
    );

  let accumulatedLmsScore = 0;
  for (const item of allGradedSubmissions) {
    if (item.score !== null && item.totalMarks > 0) {
      const percentage = item.score / item.totalMarks;
      accumulatedLmsScore += percentage * item.weightage;
    }
  }

  // Clamp LMS contribution to max 40 CA points
  const safeLmsCaScore = Math.min(40, Math.max(0, Math.round(accumulatedLmsScore * 100) / 100));

  // 5. Upsert into core `studentScores` table
  const [existingScore] = await db
    .select()
    .from(studentScores)
    .where(
      and(
        eq(studentScores.schoolId, input.schoolId),
        eq(studentScores.studentId, submission.studentId),
        eq(studentScores.subjectId, assignment.subjectId),
        eq(studentScores.termId, assignment.termId)
      )
    );

  if (!existingScore) {
    const examScore = 0;
    const totalScore = safeLmsCaScore + examScore;
    const { grade, remark } = calculateGrade(totalScore);

    await db.insert(studentScores).values({
      schoolId: input.schoolId,
      studentId: submission.studentId,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      termId: assignment.termId,
      caScore: safeLmsCaScore,
      examScore,
      totalScore,
      grade,
      remarks: remark,
      enteredBy: input.gradedById,
    });
  } else {
    const examScore = existingScore.examScore || 0;
    const totalScore = safeLmsCaScore + examScore;
    const { grade, remark } = calculateGrade(totalScore);

    await db
      .update(studentScores)
      .set({
        caScore: safeLmsCaScore,
        totalScore,
        grade,
        remarks: remark,
        enteredBy: input.gradedById,
        updatedAt: new Date(),
      })
      .where(eq(studentScores.id, existingScore.id));
  }

  return graded;
}
