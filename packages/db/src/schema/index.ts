import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  pgEnum,
  uniqueIndex,
  index,
  json,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "teacher",
  "parent",
  "student",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "inactive",
  "graduated",
  "transferred",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

// ── Table: schools (tenants) ──────────────────────────────────
export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: users ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id in Supabase
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: classes ────────────────────────────────────────────
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "JSS 1", "Grade 10"
  code: varchar("code", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: sections ───────────────────────────────────────────
export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "A", "Gold"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: subjects ───────────────────────────────────────────
export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: periods ────────────────────────────────────────────
export const periods = pgTable("periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: terms (Academic terms) ──────────────────────────────
export const terms = pgTable("terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  session: varchar("session", { length: 50 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  isCurrent: boolean("is_current").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: grading_scales (Configurable grade bands per school) ─
export const gradingScales = pgTable("grading_scales", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull().default("WAEC Grade Scale"),
  grade: varchar("grade", { length: 5 }).notNull(), // e.g. "A1", "B2"
  minScore: doublePrecision("min_score").notNull(), // e.g. 75.0
  maxScore: doublePrecision("max_score").notNull(), // e.g. 100.0
  remark: varchar("remark", { length: 100 }).notNull(), // e.g. "Excellent"
  sortOrder: integer("sort_order").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: students ───────────────────────────────────────────
export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    admissionNumber: varchar("admission_number", { length: 50 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    gender: genderEnum("gender"),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
    address: text("address"),
    photoUrl: text("photo_url"),
    classId: uuid("class_id").references(() => classes.id, {
      onDelete: "set null",
    }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notificationPreferences: jsonb("notification_preferences"),
    status: studentStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    schoolAdmissionIdx: uniqueIndex("school_admission_idx").on(
      table.schoolId,
      table.admissionNumber
    ),
    classStudentsIdx: index("class_students_idx").on(
      table.schoolId,
      table.classId
    ),
  })
);

// ── Table: student_guardians ──────────────────────────────────
export const studentGuardians = pgTable("student_guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  relationship: varchar("relationship", { length: 50 }).notNull(),
  isPrimary: boolean("is_primary").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: student_attendance ─────────────────────────────────
export const studentAttendance = pgTable(
  "student_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    date: varchar("date", { length: 10 }).notNull(),
    period: varchar("period", { length: 50 }).notNull().default("daily"),
    status: attendanceStatusEnum("status").notNull(),
    remarks: text("remarks"),
    markedBy: uuid("marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentDatePeriodIdx: uniqueIndex("student_date_period_idx").on(
      table.schoolId,
      table.studentId,
      table.date,
      table.period
    ),
    classAttendanceIdx: index("class_attendance_idx").on(
      table.schoolId,
      table.classId
    ),
  })
);

// ── Table: staff_attendance ───────────────────────────────────
export const staffAttendance = pgTable(
  "staff_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    status: attendanceStatusEnum("status").notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    remarks: text("remarks"),
    markedBy: uuid("marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    staffDateIdx: uniqueIndex("staff_date_idx").on(
      table.schoolId,
      table.userId,
      table.date
    ),
  })
);

// ── Table: attendance_conflict_logs ───────────────────────────
export const attendanceConflictLogs = pgTable("attendance_conflict_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  period: varchar("period", { length: 50 }).notNull().default("daily"),
  previousStatus: varchar("previous_status", { length: 50 }).notNull(),
  winningStatus: varchar("winning_status", { length: 50 }).notNull(),
  previousUpdatedAt: timestamp("previous_updated_at", { withTimezone: true }),
  winningUpdatedAt: timestamp("winning_updated_at", { withTimezone: true }),
  reason: text("reason").notNull(),
  resolvedBy: uuid("resolved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: timetable_entries ──────────────────────────────────
export const timetableEntries = pgTable(
  "timetable_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    roomNumber: varchar("room_number", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    classPeriodDayIdx: uniqueIndex("class_period_day_idx").on(
      table.schoolId,
      table.classId,
      table.periodId,
      table.dayOfWeek
    ),
    teacherPeriodDayIdx: uniqueIndex("teacher_period_day_idx").on(
      table.schoolId,
      table.teacherId,
      table.periodId,
      table.dayOfWeek
    ),
  })
);

// ── Table: student_scores (Academic Scores per term) ──────────
export const studentScores = pgTable(
  "student_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    caScore: doublePrecision("ca_score").notNull().default(0),
    examScore: doublePrecision("exam_score").notNull().default(0),
    totalScore: doublePrecision("total_score").notNull().default(0),
    grade: varchar("grade", { length: 5 }),
    remarks: text("remarks"),
    enteredBy: uuid("entered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentSubjectTermIdx: uniqueIndex("student_subject_term_idx").on(
      table.schoolId,
      table.studentId,
      table.subjectId,
      table.termId
    ),
    classScoresIdx: index("class_scores_idx").on(
      table.schoolId,
      table.classId,
      table.termId
    ),
  })
);

// ── Table: student_term_reports (Affective & psychomotor traits, remarks) ─
export const studentTermReports = pgTable(
  "student_term_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    principalRemarks: text("principal_remarks"),
    teacherRemarks: text("teacher_remarks"),
    affectiveTraits: json("affective_traits"), // stores Array<{ trait: string, rating: number }>
    psychomotorTraits: json("psychomotor_traits"), // stores Array<{ trait: string, rating: number }>
    enteredBy: uuid("entered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentTermIdx: uniqueIndex("student_term_idx").on(
      table.schoolId,
      table.studentId,
      table.termId
    ),
  })
);

// ── Table: licenses (Milestone 8 License Center) ──────────────
export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull().unique(),
    tier: varchar("tier", { length: 50 }).notNull().default("starter"), // "starter" | "growth" | "enterprise"
    enabledModules: json("enabled_modules").notNull(), // Array<string> e.g. ["core_erp", "cbt", "lms"]
    maxStudents: integer("max_students").notNull().default(250),
    status: varchar("status", { length: 20 }).notNull().default("active"), // "active" | "expired" | "suspended"
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    schoolLicenseIdx: index("school_license_idx").on(table.schoolId),
  })
);

// ── Table: license_events (Audit logging for renewals/upgrades) ─
export const licenseEvents = pgTable("license_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  licenseId: uuid("license_id")
    .notNull()
    .references(() => licenses.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "issued" | "renewed" | "upgraded" | "downgraded" | "expired"
  details: json("details"),
  performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  classes: many(classes),
  sections: many(sections),
  subjects: many(subjects),
  periods: many(periods),
  terms: many(terms),
  gradingScales: many(gradingScales),
  students: many(students),
  studentGuardians: many(studentGuardians),
  studentAttendance: many(studentAttendance),
  staffAttendance: many(staffAttendance),
  conflictLogs: many(attendanceConflictLogs),
  timetableEntries: many(timetableEntries),
  studentScores: many(studentScores),
  studentTermReports: many(studentTermReports),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  guardianLinks: many(studentGuardians),
  attendanceMarked: many(studentAttendance),
  staffAttendanceRecords: many(staffAttendance),
  timetableAssigned: many(timetableEntries),
  scoresEntered: many(studentScores),
  termReportsEntered: many(studentTermReports),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  school: one(schools, {
    fields: [terms.schoolId],
    references: [schools.id],
  }),
  scores: many(studentScores),
  termReports: many(studentTermReports),
}));

export const gradingScalesRelations = relations(gradingScales, ({ one }) => ({
  school: one(schools, {
    fields: [gradingScales.schoolId],
    references: [schools.id],
  }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  sections: many(sections),
  students: many(students),
  attendance: many(studentAttendance),
  conflictLogs: many(attendanceConflictLogs),
  timetableEntries: many(timetableEntries),
  scores: many(studentScores),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  school: one(schools, {
    fields: [subjects.schoolId],
    references: [schools.id],
  }),
  timetableEntries: many(timetableEntries),
  scores: many(studentScores),
}));

export const periodsRelations = relations(periods, ({ one, many }) => ({
  school: one(schools, {
    fields: [periods.schoolId],
    references: [schools.id],
  }),
  timetableEntries: many(timetableEntries),
}));

export const timetableEntriesRelations = relations(
  timetableEntries,
  ({ one }) => ({
    school: one(schools, {
      fields: [timetableEntries.schoolId],
      references: [schools.id],
    }),
    class: one(classes, {
      fields: [timetableEntries.classId],
      references: [classes.id],
    }),
    section: one(sections, {
      fields: [timetableEntries.sectionId],
      references: [sections.id],
    }),
    subject: one(subjects, {
      fields: [timetableEntries.subjectId],
      references: [subjects.id],
    }),
    teacher: one(users, {
      fields: [timetableEntries.teacherId],
      references: [users.id],
    }),
    period: one(periods, {
      fields: [timetableEntries.periodId],
      references: [periods.id],
    }),
  })
);

export const studentScoresRelations = relations(studentScores, ({ one }) => ({
  school: one(schools, {
    fields: [studentScores.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [studentScores.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [studentScores.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [studentScores.subjectId],
    references: [subjects.id],
  }),
  term: one(terms, {
    fields: [studentScores.termId],
    references: [terms.id],
  }),
  enteredBy: one(users, {
    fields: [studentScores.enteredBy],
    references: [users.id],
  }),
}));

export const studentTermReportsRelations = relations(studentTermReports, ({ one }) => ({
  school: one(schools, {
    fields: [studentTermReports.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [studentTermReports.studentId],
    references: [students.id],
  }),
  term: one(terms, {
    fields: [studentTermReports.termId],
    references: [terms.id],
  }),
  enteredUser: one(users, {
    fields: [studentTermReports.enteredBy],
    references: [users.id],
  }),
}));

// ── Milestone 9: Computer-Based Testing (CBT Platform) Tables ───

// Question Bank Table
export const cbtQuestions = pgTable("cbt_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull().default("mcq"), // mcq, objective, theory
  options: jsonb("options"), // [{ id: "a", text: "Option A" }, ...]
  correctAnswer: text("correct_answer").notNull(), // e.g. "a" or exact text
  explanation: text("explanation"),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("medium"), // easy, medium, hard
  tags: jsonb("tags"), // ["algebra", "equations"]
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Exam Definitions Table
export const cbtExams = pgTable("cbt_exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  termId: uuid("term_id")
    .notNull()
    .references(() => terms.id, { onDelete: "cascade" }),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  totalMarks: integer("total_marks").notNull().default(100),
  passMarks: integer("pass_marks").notNull().default(50),
  randomizeQuestions: boolean("randomize_questions").notNull().default(true),
  randomizeOptions: boolean("randomize_options").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, published, archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Exam Questions Link Table
export const cbtExamQuestions = pgTable("cbt_exam_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  examId: uuid("exam_id")
    .notNull()
    .references(() => cbtExams.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => cbtQuestions.id, { onDelete: "cascade" }),
  marks: integer("marks").notNull().default(1),
  order: integer("order").notNull().default(1),
});

// Student Exam Sessions Tracking Table
export const cbtExamSessions = pgTable("cbt_exam_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  examId: uuid("exam_id")
    .notNull()
    .references(() => cbtExams.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, submitted, timed_out
  answers: jsonb("answers").notNull().default({}), // { [questionId]: answerValue }
  seed: varchar("seed", { length: 64 }).notNull(), // deterministic order seed per student session
  score: integer("score"),
  percentage: text("percentage"),
  tabSwitchesCount: integer("tab_switches_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Milestone 10: Learning Portal (LMS) Tables ─────────────────────────────

// Attachment Metadata Abstraction Table (Supports Local, S3, R2, Supabase)
export const lmsAttachments = pgTable("lms_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  storageProvider: varchar("storage_provider", { length: 50 }).notNull().default("local"), // local, s3, r2, supabase
  storageKey: text("storage_key").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Lesson Notes & Scheme-of-Work Topic Mapping Table
export const lmsLessons = pgTable("lms_lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  termId: uuid("term_id")
    .notNull()
    .references(() => terms.id, { onDelete: "cascade" }),
  topic: varchar("topic", { length: 255 }), // Curriculum/scheme-of-work mapping
  contentType: varchar("content_type", { length: 50 }).notNull().default("lesson"), // lesson, quiz, resource, scorm
  contentBody: text("content_body").notNull(),
  attachmentIds: jsonb("attachment_ids").default([]), // array of lmsAttachments.id strings
  mediaType: varchar("media_type", { length: 20 }).notNull().default("none"), // none, youtube, vimeo, audio, direct_video
  mediaUrl: text("media_url"),
  metadata: jsonb("metadata").default({}), // Extensible metadata for SCORM/quizzes/discussions
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Assignments Table
export const lmsAssignments = pgTable("lms_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lmsLessons.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  termId: uuid("term_id")
    .notNull()
    .references(() => terms.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  totalMarks: integer("total_marks").notNull().default(20),
  weightage: doublePrecision("weightage").notNull().default(10), // Max CA points weight
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Student Submissions Table
export const lmsSubmissions = pgTable("lms_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => lmsAssignments.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  submissionText: text("submission_text"),
  attachmentId: uuid("attachment_id").references(() => lmsAttachments.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  score: doublePrecision("score"),
  feedback: text("feedback"),
  status: varchar("status", { length: 20 }).notNull().default("submitted"), // submitted, graded
  gradedById: uuid("graded_by_id").references(() => users.id, { onDelete: "set null" }),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Milestone 11: Teacher Portal & Messaging Schema ───────────────────────

export const messageThreads = pgTable(
  "message_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
    parentId: uuid("parent_id").references(() => users.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("open"), // open, closed
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolTeacherIdx: index("school_teacher_msg_idx").on(table.schoolId, table.teacherId),
    schoolParentIdx: index("school_parent_msg_idx").on(table.schoolId, table.parentId),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolThreadIdx: index("school_thread_msg_idx").on(table.schoolId, table.threadId),
    recipientReadIdx: index("recipient_read_idx").on(table.schoolId, table.recipientId, table.isRead),
  })
);

// ── Milestone 12: Parent Portal — Fee & Announcement Schema ────────────────

export const feeStructures = pgTable(
  "fee_structures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    termId: uuid("term_id").notNull().references(() => terms.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // e.g. "First Term School Fees"
    description: text("description"),
    totalAmount: doublePrecision("total_amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolTermIdx: index("fee_school_term_idx").on(table.schoolId, table.termId),
  })
);

export const feeInstallments = pgTable(
  "fee_installments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    feeStructureId: uuid("fee_structure_id").notNull().references(() => feeStructures.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(), // e.g. "Installment 1"
    amount: doublePrecision("amount").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    sortOrder: integer("sort_order").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    feeInstallmentIdx: index("fee_installment_idx").on(table.schoolId, table.feeStructureId),
  })
);

export const feeInvoices = pgTable(
  "fee_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    feeStructureId: uuid("fee_structure_id").notNull().references(() => feeStructures.id, { onDelete: "cascade" }),
    totalAmount: doublePrecision("total_amount").notNull(),
    amountPaid: doublePrecision("amount_paid").notNull().default(0),
    outstandingBalance: doublePrecision("outstanding_balance").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("unpaid"), // unpaid, partial, paid
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceStudentIdx: index("invoice_student_idx").on(table.schoolId, table.studentId),
    invoiceUniqueIdx: uniqueIndex("invoice_unique_idx").on(table.schoolId, table.studentId, table.feeStructureId),
  })
);

export const feePayments = pgTable(
  "fee_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").notNull().references(() => feeInvoices.id, { onDelete: "cascade" }),
    installmentId: uuid("installment_id").references(() => feeInstallments.id, { onDelete: "set null" }),
    paystackReference: varchar("paystack_reference", { length: 255 }).notNull().unique(), // idempotency key
    amount: doublePrecision("amount").notNull(),
    channel: varchar("channel", { length: 50 }), // card, bank, ussd
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    webhookVerified: boolean("webhook_verified").notNull().default(false), // ONLY true when Paystack webhook confirms
    webhookPayload: jsonb("webhook_payload"), // raw webhook body stored for audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paymentInvoiceIdx: index("payment_invoice_idx").on(table.schoolId, table.invoiceId),
  })
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }), // null = school-wide
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    announcementSchoolIdx: index("announcement_school_idx").on(table.schoolId, table.publishedAt),
  })
);

export const studentNotifications = pgTable(
  "student_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).notNull().default("general"), // announcement, assignment, cbt, fee, message
    isRead: boolean("is_read").notNull().default(false),
    link: text("link"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentNotifyIdx: index("student_notify_idx").on(table.schoolId, table.studentId, table.isRead),
  })
);

// ── Milestone 14: Library Management System Schema ──────────────────────────

export const libraryCategories = pgTable(
  "library_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categorySchoolIdx: index("lib_cat_school_idx").on(table.schoolId),
  })
);

export const libraryBooks = pgTable(
  "library_books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    author: varchar("author", { length: 255 }).notNull(),
    publisher: varchar("publisher", { length: 255 }),
    isbn: varchar("isbn", { length: 50 }),
    edition: varchar("edition", { length: 50 }),
    categoryId: uuid("category_id").references(() => libraryCategories.id, { onDelete: "set null" }),
    shelfLocation: varchar("shelf_location", { length: 100 }),
    subject: varchar("subject", { length: 100 }),
    description: text("description"),
    coverUrl: text("cover_url"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, archived
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bookSchoolIdx: index("lib_book_school_idx").on(table.schoolId, table.title),
  })
);

export const libraryBookCopies = pgTable(
  "library_book_copies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    bookId: uuid("book_id").notNull().references(() => libraryBooks.id, { onDelete: "cascade" }),
    copyNumber: integer("copy_number").notNull().default(1),
    barcode: varchar("barcode", { length: 100 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("available"), // available, borrowed, reserved, damaged, lost, archived
    condition: varchar("condition", { length: 20 }).notNull().default("good"), // new, good, fair, damaged
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    copySchoolBookIdx: index("lib_copy_school_book_idx").on(table.schoolId, table.bookId, table.status),
  })
);

export const librarySettings = pgTable(
  "library_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }).unique(),
    maxBooksPerStudent: integer("max_books_per_student").notNull().default(3),
    maxBooksPerStaff: integer("max_books_per_staff").notNull().default(5),
    borrowingPeriodDays: integer("borrowing_period_days").notNull().default(14),
    finePerDay: doublePrecision("fine_per_day").notNull().default(50.0), // NGN per day overdue
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const libraryLoans = pgTable(
  "library_loans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    copyId: uuid("copy_id").notNull().references(() => libraryBookCopies.id, { onDelete: "cascade" }),
    bookId: uuid("book_id").notNull().references(() => libraryBooks.id, { onDelete: "cascade" }),
    borrowerId: uuid("borrower_id").notNull(), // userId or studentId
    borrowerType: varchar("borrower_type", { length: 20 }).notNull().default("student"), // student, staff
    issuedById: uuid("issued_by_id").references(() => users.id, { onDelete: "set null" }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, returned, overdue, lost
    fineAmount: doublePrecision("fine_amount").notNull().default(0),
    finePaid: boolean("fine_paid").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    loanSchoolBorrowerIdx: index("lib_loan_school_borrower_idx").on(table.schoolId, table.borrowerId, table.status),
  })
);

export const libraryReservations = pgTable(
  "library_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    bookId: uuid("book_id").notNull().references(() => libraryBooks.id, { onDelete: "cascade" }),
    reserverId: uuid("reserver_id").notNull(),
    reserverType: varchar("reserver_type", { length: 20 }).notNull().default("student"), // student, staff
    reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, fulfilled, cancelled, expired
    fulfilledCopyId: uuid("fulfilled_copy_id").references(() => libraryBookCopies.id, { onDelete: "set null" }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    resSchoolBookIdx: index("lib_res_school_book_idx").on(table.schoolId, table.bookId, table.status),
  })
);






