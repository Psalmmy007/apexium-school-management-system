import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  subjects,
  classes,
  terms,
  students,
  users,
  createLmsLesson,
  createLmsAssignment,
  submitLmsAssignment,
  gradeLmsSubmission,
  studentScores,
} from "@apexium/db";
import { eq, and } from "drizzle-orm";

describe("Milestone 10: LMS Web API & Shared Model Verification Tests", () => {
  let schoolId: string;
  let subjectId: string;
  let classId: string;
  let termId: string;
  let teacherId: string;
  let studentId: string;

  beforeAll(async () => {
    const [sch] = await db
      .insert(schools)
      .values({ name: "LMS API Academy", slug: `lms-api-${Date.now()}` })
      .returning();
    schoolId = sch.id;

    const [sub] = await db
      .insert(subjects)
      .values({ schoolId, name: "Physics", code: "PHY201" })
      .returning();
    subjectId = sub.id;

    const [cls] = await db
      .insert(classes)
      .values({ schoolId, name: "SS2 Science" })
      .returning();
    classId = cls.id;

    const [trm] = await db
      .insert(terms)
      .values({ schoolId, name: "Second Term", session: "2025/2026" })
      .returning();
    termId = trm.id;

    const [usr] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `phys-teacher-${Date.now()}@lms.edu`,
        role: "teacher",
        firstName: "Albert",
        lastName: "Einstein",
      })
      .returning();
    teacherId = usr.id;

    const [st] = await db
      .insert(students)
      .values({
        schoolId,
        classId,
        admissionNumber: `PHY-STU-${Date.now()}`,
        firstName: "Isaac",
        lastName: "Newton",
      })
      .returning();
    studentId = st.id;
  }, 30000);

  it("verifies lesson creation, assignment submission, grading, and shared data model read by core Academics", async () => {
    // 1. Teacher creates lesson note
    const lesson = await createLmsLesson({
      schoolId,
      title: "Newton's Laws of Motion",
      subjectId,
      classId,
      termId,
      topic: "Mechanics — Week 2",
      contentBody: "1. An object remains at rest unless acted upon by a net force.",
      createdById: teacherId,
    });
    expect(lesson.id).toBeDefined();

    // 2. Teacher creates assignment
    const assignment = await createLmsAssignment({
      schoolId,
      lessonId: lesson.id,
      title: "First Law Calculation",
      description: "Solve F = ma for m = 5kg and a = 2m/s^2.",
      subjectId,
      classId,
      termId,
      dueAt: new Date(Date.now() + 86400000 * 3),
      totalMarks: 10,
      weightage: 10,
      createdById: teacherId,
    });
    expect(assignment.id).toBeDefined();

    // 3. Student submits assignment
    const submission = await submitLmsAssignment({
      schoolId,
      assignmentId: assignment.id,
      studentId,
      submissionText: "F = 5kg * 2m/s^2 = 10 Newtons.",
    });
    expect(submission.id).toBeDefined();

    // 4. Teacher grades submission (10/10 = 100% = 10 CA points)
    await gradeLmsSubmission({
      schoolId,
      submissionId: submission.id,
      score: 10,
      feedback: "Perfect calculation!",
      gradedById: teacherId,
    });

    // 5. Shared Model Verification: Query `studentScores` table (read by Core Academics / GET /api/scores)
    const [scoreInCoreAcademics] = await db
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

    expect(scoreInCoreAcademics).toBeDefined();
    expect(scoreInCoreAcademics.caScore).toBe(10);
    expect(scoreInCoreAcademics.grade).toBeDefined(); // Evaluated grade letter from Core Academics service
  });
});
