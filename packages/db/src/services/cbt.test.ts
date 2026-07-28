import { describe, it, expect, beforeAll } from "vitest";
import {
  createCbtQuestion,
  createCbtExam,
  assignQuestionsToExam,
  startExamSession,
  saveExamAnswer,
  submitExamSession,
  getExamSessionDetails,
} from "./cbt";
import { db, schools, subjects, classes, terms, students } from "../index";

describe("Milestone 9: CBT Platform Integration Tests", () => {
  let schoolId: string;
  let subjectId: string;
  let classId: string;
  let termId: string;
  let student1Id: string;
  let student2Id: string;

  beforeAll(async () => {
    // 1. Provision test tenant school
    const [sch] = await db
      .insert(schools)
      .values({
        name: "CBT Test Academy",
        slug: `cbt-sch-${Date.now()}`,
      })
      .returning();
    schoolId = sch.id;

    // 2. Provision subject, class, term
    const [sub] = await db
      .insert(subjects)
      .values({ schoolId, name: "Computer Science", code: "CS101" })
      .returning();
    subjectId = sub.id;

    const [cls] = await db
      .insert(classes)
      .values({ schoolId, name: "SS3 Science" })
      .returning();
    classId = cls.id;

    const [trm] = await db
      .insert(terms)
      .values({ schoolId, name: "First Term", session: "2025/2026" })
      .returning();
    termId = trm.id;

    // 3. Provision test students
    const [st1] = await db
      .insert(students)
      .values({ schoolId, admissionNumber: `CBT-STU-1-${Date.now()}`, firstName: "Alice", lastName: "Smith" })
      .returning();
    student1Id = st1.id;

    const [st2] = await db
      .insert(students)
      .values({ schoolId, admissionNumber: `CBT-STU-2-${Date.now()}`, firstName: "Bob", lastName: "Jones" })
      .returning();
    student2Id = st2.id;
  }, 30000);

  it("creates question bank items with MCQ options and tags", async () => {
    const q1 = await createCbtQuestion({
      schoolId,
      subjectId,
      questionText: "What does CPU stand for?",
      questionType: "mcq",
      options: [
        { id: "a", text: "Central Processing Unit" },
        { id: "b", text: "Computer Personal Unit" },
        { id: "c", text: "Central Power Unit" },
      ],
      correctAnswer: "a",
      difficulty: "easy",
      tags: ["hardware", "basics"],
    });

    expect(q1.id).toBeDefined();
    expect(q1.questionText).toBe("What does CPU stand for?");
    expect(q1.correctAnswer).toBe("a");
  });

  it("creates an exam definition and assigns questions", async () => {
    // Insert 3 questions
    const q1 = await createCbtQuestion({
      schoolId,
      subjectId,
      questionText: "Question 1: HTML stands for HyperText Markup Language?",
      questionType: "mcq",
      options: [
        { id: "a", text: "True" },
        { id: "b", text: "False" },
      ],
      correctAnswer: "a",
    });

    const q2 = await createCbtQuestion({
      schoolId,
      subjectId,
      questionText: "Question 2: Which protocol is used for web pages?",
      questionType: "mcq",
      options: [
        { id: "a", text: "HTTP" },
        { id: "b", text: "FTP" },
      ],
      correctAnswer: "a",
    });

    const exam = await createCbtExam({
      schoolId,
      title: "Mid-Term CS Exam",
      subjectId,
      classId,
      termId,
      durationMinutes: 45,
    });

    expect(exam.id).toBeDefined();
    expect(exam.durationMinutes).toBe(45);

    const assigned = await assignQuestionsToExam(schoolId, exam.id, [q1.id, q2.id], 5);
    expect(assigned.length).toBe(2);
  });

  it("initializes deterministic randomized question and option order per student", async () => {
    // Create exam with 5 questions
    const questionIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const q = await createCbtQuestion({
        schoolId,
        subjectId,
        questionText: `Randomized Test Question ${i}`,
        questionType: "mcq",
        options: [
          { id: "opt1", text: `Option 1 for Q${i}` },
          { id: "opt2", text: `Option 2 for Q${i}` },
          { id: "opt3", text: `Option 3 for Q${i}` },
        ],
        correctAnswer: "opt1",
      });
      questionIds.push(q.id);
    }

    const exam = await createCbtExam({
      schoolId,
      title: "Randomized Exam",
      subjectId,
      classId,
      termId,
      randomizeQuestions: true,
      randomizeOptions: true,
    });

    await assignQuestionsToExam(schoolId, exam.id, questionIds, 1);

    // Start session for Student 1 and Student 2
    const session1 = await startExamSession(schoolId, exam.id, student1Id);
    const session2 = await startExamSession(schoolId, exam.id, student2Id);

    const details1 = await getExamSessionDetails(session1.id);
    const details2 = await getExamSessionDetails(session2.id);

    expect(details1).not.toBeNull();
    expect(details2).not.toBeNull();

    // Verify two students receive different question order seeds
    expect(session1.seed).not.toEqual(session2.seed);
  });

  it("saves student answers continuously and auto-grades objective exam submission", async () => {
    const q1 = await createCbtQuestion({
      schoolId,
      subjectId,
      questionText: "What is 2 + 2?",
      questionType: "mcq",
      options: [
        { id: "a", text: "3" },
        { id: "b", text: "4" },
        { id: "c", text: "5" },
      ],
      correctAnswer: "b",
    });

    const q2 = await createCbtQuestion({
      schoolId,
      subjectId,
      questionText: "What is the capital of France?",
      questionType: "objective",
      correctAnswer: "Paris",
    });

    const exam = await createCbtExam({
      schoolId,
      title: "Math & Geo Quiz",
      subjectId,
      classId,
      termId,
    });

    await assignQuestionsToExam(schoolId, exam.id, [q1.id, q2.id], 10);

    const session = await startExamSession(schoolId, exam.id, student1Id);

    // Continuously save answers
    await saveExamAnswer(session.id, q1.id, "b"); // Correct answer (10 marks)
    await saveExamAnswer(session.id, q2.id, "Paris"); // Correct answer (10 marks)

    // Submit exam
    const submitted = await submitExamSession(session.id);

    expect(submitted.status).toBe("submitted");
    expect(submitted.score).toBe(20); // 20 out of 20
    expect(submitted.percentage).toBe("100.00");
  });
});
