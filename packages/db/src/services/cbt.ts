import { db, cbtQuestions, cbtExams, cbtExamQuestions, cbtExamSessions, schools, subjects, classes, terms, students } from "../index";
import { eq, and, inArray, count, desc } from "drizzle-orm";
import crypto from "crypto";

export interface CreateQuestionInput {
  schoolId: string;
  subjectId: string;
  questionText: string;
  questionType?: "mcq" | "objective" | "theory";
  options?: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
}

export interface CreateExamInput {
  schoolId: string;
  title: string;
  subjectId: string;
  classId: string;
  termId: string;
  durationMinutes?: number;
  totalMarks?: number;
  passMarks?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
}

// ── Question Bank Service ──────────────────────────────────────
export async function createCbtQuestion(input: CreateQuestionInput) {
  const [question] = await db
    .insert(cbtQuestions)
    .values({
      schoolId: input.schoolId,
      subjectId: input.subjectId,
      questionText: input.questionText,
      questionType: input.questionType || "mcq",
      options: input.options || null,
      correctAnswer: input.correctAnswer,
      explanation: input.explanation || null,
      difficulty: input.difficulty || "medium",
      tags: input.tags || null,
    })
    .returning();

  return question;
}

export async function listCbtQuestions(schoolId: string, subjectId?: string) {
  const conditions = [eq(cbtQuestions.schoolId, schoolId)];
  if (subjectId) conditions.push(eq(cbtQuestions.subjectId, subjectId));

  return db.select().from(cbtQuestions).where(and(...conditions)).orderBy(desc(cbtQuestions.createdAt));
}

// ── Exam Management Service ───────────────────────────────────
export async function createCbtExam(input: CreateExamInput) {
  const [exam] = await db
    .insert(cbtExams)
    .values({
      schoolId: input.schoolId,
      title: input.title,
      subjectId: input.subjectId,
      classId: input.classId,
      termId: input.termId,
      durationMinutes: input.durationMinutes ?? 60,
      totalMarks: input.totalMarks ?? 100,
      passMarks: input.passMarks ?? 50,
      randomizeQuestions: input.randomizeQuestions ?? true,
      randomizeOptions: input.randomizeOptions ?? true,
      status: "draft",
    })
    .returning();

  return exam;
}

export async function assignQuestionsToExam(
  schoolId: string,
  examId: string,
  questionIds: string[],
  marksPerQuestion: number = 1
) {
  // Clear previous exam questions
  await db
    .delete(cbtExamQuestions)
    .where(and(eq(cbtExamQuestions.schoolId, schoolId), eq(cbtExamQuestions.examId, examId)));

  if (questionIds.length === 0) return [];

  const values = questionIds.map((qId, index) => ({
    schoolId,
    examId,
    questionId: qId,
    marks: marksPerQuestion,
    order: index + 1,
  }));

  return db.insert(cbtExamQuestions).values(values).returning();
}

// ── Deterministic Pseudo-Randomizer Helper (Fisher-Yates with PRNG seed) ──
function prng(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return function () {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

export function shuffleWithSeed<T>(array: T[], seedStr: string): T[] {
  const copy = [...array];
  const rand = prng(seedStr);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Student Exam Session Service ───────────────────────────────
export async function startExamSession(schoolId: string, examId: string, studentId: string) {
  // Check if active session already exists for this student and exam
  const [existing] = await db
    .select()
    .from(cbtExamSessions)
    .where(
      and(
        eq(cbtExamSessions.schoolId, schoolId),
        eq(cbtExamSessions.examId, examId),
        eq(cbtExamSessions.studentId, studentId)
      )
    );

  if (existing) {
    return existing;
  }

  // Create new session with unique student seed
  const seed = crypto.createHash("sha256").update(`${studentId}-${examId}-${Date.now()}`).digest("hex");

  const [session] = await db
    .insert(cbtExamSessions)
    .values({
      schoolId,
      examId,
      studentId,
      startedAt: new Date(),
      status: "in_progress",
      answers: {},
      seed,
    })
    .returning();

  return session;
}

export async function saveExamAnswer(sessionId: string, questionId: string, answerValue: string) {
  const [session] = await db.select().from(cbtExamSessions).where(eq(cbtExamSessions.id, sessionId));
  if (!session) throw new Error("Exam session not found.");
  if (session.status !== "in_progress") throw new Error("Cannot save answer: Exam session is closed.");

  const currentAnswers = (session.answers as Record<string, string>) || {};
  const updatedAnswers = { ...currentAnswers, [questionId]: answerValue };

  const [updated] = await db
    .update(cbtExamSessions)
    .set({
      answers: updatedAnswers,
      updatedAt: new Date(),
    })
    .where(eq(cbtExamSessions.id, sessionId))
    .returning();

  return updated;
}

export async function submitExamSession(sessionId: string) {
  const [session] = await db.select().from(cbtExamSessions).where(eq(cbtExamSessions.id, sessionId));
  if (!session) throw new Error("Exam session not found.");
  if (session.status !== "in_progress") return session;

  // Fetch exam questions and correct answers for auto-grading
  const examQuestionsList = await db
    .select({
      questionId: cbtQuestions.id,
      correctAnswer: cbtQuestions.correctAnswer,
      questionType: cbtQuestions.questionType,
      marks: cbtExamQuestions.marks,
    })
    .from(cbtExamQuestions)
    .innerJoin(cbtQuestions, eq(cbtExamQuestions.questionId, cbtQuestions.id))
    .where(eq(cbtExamQuestions.examId, session.examId));

  const answers = (session.answers as Record<string, string>) || {};
  let totalAchievedScore = 0;
  let totalPossibleMarks = 0;

  for (const eqItem of examQuestionsList) {
    totalPossibleMarks += eqItem.marks;
    const studentAns = answers[eqItem.questionId];

    if (eqItem.questionType === "mcq" || eqItem.questionType === "objective") {
      if (studentAns && studentAns.trim().toLowerCase() === eqItem.correctAnswer.trim().toLowerCase()) {
        totalAchievedScore += eqItem.marks;
      }
    }
  }

  const percentage = totalPossibleMarks > 0
    ? ((totalAchievedScore / totalPossibleMarks) * 100).toFixed(2)
    : "0.00";

  const [submittedSession] = await db
    .update(cbtExamSessions)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      score: totalAchievedScore,
      percentage,
      updatedAt: new Date(),
    })
    .where(eq(cbtExamSessions.id, sessionId))
    .returning();

  return submittedSession;
}

export async function getExamSessionDetails(sessionId: string) {
  const [session] = await db.select().from(cbtExamSessions).where(eq(cbtExamSessions.id, sessionId));
  if (!session) return null;

  const [exam] = await db.select().from(cbtExams).where(eq(cbtExams.id, session.examId));
  const examQuestionsList = await db
    .select({
      id: cbtQuestions.id,
      questionText: cbtQuestions.questionText,
      questionType: cbtQuestions.questionType,
      options: cbtQuestions.options,
      difficulty: cbtQuestions.difficulty,
      marks: cbtExamQuestions.marks,
      order: cbtExamQuestions.order,
    })
    .from(cbtExamQuestions)
    .innerJoin(cbtQuestions, eq(cbtExamQuestions.questionId, cbtQuestions.id))
    .where(eq(cbtExamQuestions.examId, session.examId))
    .orderBy(cbtExamQuestions.order);

  // Apply deterministic student-specific randomization if enabled on exam
  let finalQuestions = examQuestionsList;
  if (exam?.randomizeQuestions) {
    finalQuestions = shuffleWithSeed(examQuestionsList, session.seed);
  }

  if (exam?.randomizeOptions) {
    finalQuestions = finalQuestions.map((q) => {
      if (q.options && Array.isArray(q.options)) {
        return {
          ...q,
          options: shuffleWithSeed(q.options, `${session.seed}-${q.id}`),
        };
      }
      return q;
    });
  }

  return {
    session,
    exam,
    questions: finalQuestions,
  };
}
