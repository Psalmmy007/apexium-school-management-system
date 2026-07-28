export interface CbtQuestionOption {
  id: string;
  text: string;
}

export interface CbtQuestion {
  id: string;
  schoolId: string;
  subjectId: string;
  questionText: string;
  questionType: "mcq" | "objective" | "theory";
  options?: CbtQuestionOption[] | null;
  correctAnswer: string;
  explanation?: string | null;
  difficulty: "easy" | "medium" | "hard";
  tags?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CbtExam {
  id: string;
  schoolId: string;
  title: string;
  subjectId: string;
  classId: string;
  termId: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface CbtExamQuestion {
  id: string;
  schoolId: string;
  examId: string;
  questionId: string;
  marks: number;
  order: number;
}

export interface CbtExamSession {
  id: string;
  schoolId: string;
  examId: string;
  studentId: string;
  startedAt: Date;
  submittedAt?: Date | null;
  status: "in_progress" | "submitted" | "timed_out";
  answers: Record<string, string>; // { [questionId]: answerValue }
  seed: string;
  score?: number | null;
  percentage?: string | null;
  tabSwitchesCount: number;
  createdAt: Date;
  updatedAt: Date;
}
