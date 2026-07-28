export interface LmsAttachment {
  id: string;
  schoolId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageProvider: "local" | "s3" | "r2" | "supabase";
  storageKey: string;
  uploadedBy?: string | null;
  createdAt: Date;
}

export interface LmsLesson {
  id: string;
  schoolId: string;
  title: string;
  subjectId: string;
  classId: string;
  termId: string;
  topic?: string | null;
  contentType: "lesson" | "quiz" | "resource" | "scorm";
  contentBody: string;
  attachmentIds?: string[] | null;
  mediaType: "none" | "youtube" | "vimeo" | "audio" | "direct_video";
  mediaUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LmsAssignment {
  id: string;
  schoolId: string;
  lessonId?: string | null;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  termId: string;
  dueAt: Date;
  totalMarks: number;
  weightage: number;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LmsSubmission {
  id: string;
  schoolId: string;
  assignmentId: string;
  studentId: string;
  submissionText?: string | null;
  attachmentId?: string | null;
  submittedAt: Date;
  score?: number | null;
  feedback?: string | null;
  status: "submitted" | "graded";
  gradedById?: string | null;
  gradedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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
