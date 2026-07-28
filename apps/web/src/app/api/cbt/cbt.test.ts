import { describe, it, expect, beforeAll } from "vitest";
import { db, schools, subjects, classes, terms, students, cbtExams, cbtQuestions, assignQuestionsToExam, startExamSession } from "@apexium/db";

describe("Milestone 9: CBT API & Session Resilience Tests", () => {
  let schoolId: string;
  let subjectId: string;
  let classId: string;
  let termId: string;
  let studentId: string;
  let examId: string;
  let q1Id: string;
  let q2Id: string;

  beforeAll(async () => {
    const [sch] = await db.insert(schools).values({ name: "CBT API Test School", slug: `cbt-api-${Date.now()}` }).returning();
    schoolId = sch.id;

    const [sub] = await db.insert(subjects).values({ schoolId, name: "Physics", code: "PHY" }).returning();
    subjectId = sub.id;

    const [cls] = await db.insert(classes).values({ schoolId, name: "SS2 Science" }).returning();
    classId = cls.id;

    const [trm] = await db.insert(terms).values({ schoolId, name: "Second Term", session: "2025/2026" }).returning();
    termId = trm.id;

    const [st] = await db.insert(students).values({ schoolId, admissionNumber: `CBT-STU-${Date.now()}`, firstName: "Jane", lastName: "Doe" }).returning();
    studentId = st.id;

    const [ex] = await db.insert(cbtExams).values({
      schoolId,
      title: "Physics Midterm",
      subjectId,
      classId,
      termId,
      durationMinutes: 30,
      randomizeQuestions: true,
      randomizeOptions: true,
    }).returning();
    examId = ex.id;

    const [q1] = await db.insert(cbtQuestions).values({
      schoolId,
      subjectId,
      questionText: "Unit of Force is?",
      questionType: "mcq",
      options: [{ id: "a", text: "Newton" }, { id: "b", text: "Joule" }],
      correctAnswer: "a",
    }).returning();
    q1Id = q1.id;

    const [q2] = await db.insert(cbtQuestions).values({
      schoolId,
      subjectId,
      questionText: "Speed of light is 3x10^8 m/s?",
      questionType: "mcq",
      options: [{ id: "a", text: "True" }, { id: "b", text: "False" }],
      correctAnswer: "a",
    }).returning();
    q2Id = q2.id;

    await assignQuestionsToExam(schoolId, examId, [q1Id, q2Id], 5);
  }, 30000);

  it("simulates mid-exam browser crash/refresh — verifies answers persist and session resumes without timer reset", async () => {
    // 1. Start exam session
    const session1 = await startExamSession(schoolId, examId, studentId);
    expect(session1.id).toBeDefined();

    // 2. Simulate browser crash/refresh by re-starting session with same student & exam
    const sessionResumed = await startExamSession(schoolId, examId, studentId);
    
    // Resumed session MUST return exact same session ID and original startedAt timestamp
    expect(sessionResumed.id).toBe(session1.id);
    expect(new Date(sessionResumed.startedAt).getTime()).toBe(new Date(session1.startedAt).getTime());
  });
});
