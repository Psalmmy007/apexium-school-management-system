import { describe, it, expect, beforeAll } from "vitest";
import {
  createAttachmentMetadata,
  createLmsLesson,
  listLmsLessons,
  createLmsAssignment,
  submitLmsAssignment,
  gradeLmsSubmission,
  db,
  schools,
  subjects,
  classes,
  terms,
  students,
  users,
  studentScores,
} from "../index";
import { eq, and } from "drizzle-orm";

describe("Milestone 10: Learning Portal (LMS) Integration & Gradebook Safety Tests", () => {
  let schoolId: string;
  let subjectId: string;
  let classId: string;
  let termId: string;
  let teacherId: string;
  let studentId: string;

  beforeAll(async () => {
    // 1. Provision test tenant school
    const [sch] = await db
      .insert(schools)
      .values({
        name: "LMS Test Academy",
        slug: `lms-sch-${Date.now()}`,
      })
      .returning();
    schoolId = sch.id;

    // 2. Provision subject, class, term
    const [sub] = await db
      .insert(subjects)
      .values({ schoolId, name: "Chemistry", code: "CHM101" })
      .returning();
    subjectId = sub.id;

    const [cls] = await db
      .insert(classes)
      .values({ schoolId, name: "SS1 Science" })
      .returning();
    classId = cls.id;

    const [trm] = await db
      .insert(terms)
      .values({ schoolId, name: "First Term", session: "2025/2026" })
      .returning();
    termId = trm.id;

    // 3. Provision teacher user & student
    const [usr] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `teacher-${Date.now()}@lms.edu`,
        role: "teacher",
        firstName: "Sarah",
        lastName: "Connor",
      })
      .returning();
    teacherId = usr.id;

    const [st] = await db
      .insert(students)
      .values({
        schoolId,
        classId,
        admissionNumber: `LMS-STU-${Date.now()}`,
        firstName: "David",
        lastName: "Beckham",
      })
      .returning();
    studentId = st.id;
  }, 30000);

  it("creates attachment metadata record without storing raw file binaries in DB", async () => {
    const attachment = await createAttachmentMetadata({
      schoolId,
      originalFileName: "organic_chemistry_notes.pdf",
      mimeType: "application/pdf",
      fileSize: 1048576,
      storageProvider: "r2",
      storageKey: `schools/${schoolId}/lessons/organic_chemistry_notes.pdf`,
      uploadedBy: teacherId,
    });

    expect(attachment.id).toBeDefined();
    expect(attachment.originalFileName).toBe("organic_chemistry_notes.pdf");
    expect(attachment.storageProvider).toBe("r2");
    expect(attachment.storageKey).toContain("organic_chemistry_notes.pdf");
  });

  it("creates lesson notes with scheme-of-work topic mapping and low-bandwidth media option", async () => {
    const lesson = await createLmsLesson({
      schoolId,
      title: "Hydrocarbons & Alkanes",
      subjectId,
      classId,
      termId,
      topic: "Organic Chemistry — Week 4",
      contentType: "lesson",
      contentBody: "# Alkanes\nAlkanes are saturated hydrocarbons with single bonds.",
      mediaType: "youtube",
      mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      createdById: teacherId,
    });

    expect(lesson.id).toBeDefined();
    expect(lesson.topic).toBe("Organic Chemistry — Week 4");
    expect(lesson.mediaType).toBe("youtube");

    const list = await listLmsLessons(schoolId, { classId, subjectId });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].title).toBe("Hydrocarbons & Alkanes");
  });

  it("handles full assignment cycle and proves IDEMPOTENT gradebook sync into studentScores", async () => {
    // 1. Teacher creates assignment
    const assignment = await createLmsAssignment({
      schoolId,
      title: "Alkanes Structure Essay",
      description: "Write 200 words explaining methane geometry.",
      subjectId,
      classId,
      termId,
      dueAt: new Date(Date.now() + 86400000 * 7),
      totalMarks: 20,
      weightage: 20, // 20 CA marks
      createdById: teacherId,
    });

    expect(assignment.id).toBeDefined();

    // 2. Student submits assignment with text and attachment reference
    const submission = await submitLmsAssignment({
      schoolId,
      assignmentId: assignment.id,
      studentId,
      submissionText: "Methane has a tetrahedral structure with 109.5 degree bond angles.",
    });

    expect(submission.id).toBeDefined();
    expect(submission.status).toBe("submitted");

    // 3. Teacher grades submission (16 out of 20 = 80% = 16 CA marks)
    const graded = await gradeLmsSubmission({
      schoolId,
      submissionId: submission.id,
      score: 16,
      feedback: "Good concise explanation.",
      gradedById: teacherId,
    });

    expect(graded.status).toBe("graded");
    expect(graded.score).toBe(16);

    // 4. Verify score was synchronously written into core `studentScores` table
    const [scoreRecord] = await db
      .select()
      .from(studentScores)
      .where(
        and(
          eq(studentScores.schoolId, schoolId),
          eq(studentScores.studentId, studentId),
          eq(studentScores.subjectId, subjectId),
          eq(studentScores.termId, termId)
        )
      );

    expect(scoreRecord).toBeDefined();
    expect(scoreRecord.caScore).toBe(16); // 80% of 20 CA weightage = 16

    // 5. IDEMPOTENCY PROOF: Teacher re-grades the same submission (updating score to 18/20 = 90% = 18 CA marks)
    await gradeLmsSubmission({
      schoolId,
      submissionId: submission.id,
      score: 18,
      feedback: "Revised score after review.",
      gradedById: teacherId,
    });

    const [updatedScoreRecord] = await db
      .select()
      .from(studentScores)
      .where(
        and(
          eq(studentScores.schoolId, schoolId),
          eq(studentScores.studentId, studentId),
          eq(studentScores.subjectId, subjectId),
          eq(studentScores.termId, termId)
        )
      );

    // Score MUST update accurately to 18, NOT double-count to 16 + 18 = 34
    expect(updatedScoreRecord.caScore).toBe(18);
  });
});
