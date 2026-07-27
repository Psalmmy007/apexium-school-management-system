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
