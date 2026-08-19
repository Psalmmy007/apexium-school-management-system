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
  "suspended",
  "withdrawn",
  "expelled",
  "alumni",
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
  groupId: uuid("group_id"),
  branchName: varchar("branch_name", { length: 255 }),
  isGroupHeadquarters: boolean("is_group_headquarters").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  // Milestone 43 — Public Directory & Lightweight Listing
  listingStatus: varchar("listing_status", { length: 30 }).notNull().default("active_tenant"), // 'unclaimed', 'listed_unconverted', 'active_tenant'
  schoolType: varchar("school_type", { length: 50 }), // 'nursery', 'primary', 'secondary', 'combined', 'creche'
  state: varchar("state", { length: 100 }),
  city: varchar("city", { length: 100 }),
  listingVerified: boolean("listing_verified").notNull().default(false),
  verificationToken: varchar("verification_token", { length: 128 }),
  flaggedDomainMismatch: boolean("flagged_domain_mismatch").notNull().default(false),
  flagReason: varchar("flag_reason", { length: 255 }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: school_directory_views (Milestone 43 Directory Analytics) ───
export const schoolDirectoryViews = pgTable("school_directory_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 30 }).notNull(), // 'search_impression', 'profile_view'
  periodReported: boolean("period_reported").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => {
  return {
    schoolIdIdx: index("idx_dir_views_school_id").on(table.schoolId),
    createdAtIdx: index("idx_dir_views_created_at").on(table.createdAt),
    periodReportedIdx: index("idx_dir_views_period_reported").on(table.periodReported),
  };
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

// ── Table: academic_sections ──────────────────────────────────
export const academicSections = pgTable("academic_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }),
  displayOrder: integer("display_order").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("active"),
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
  sectionId: uuid("section_id").references(() => academicSections.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "JSS 1", "Grade 10"
  code: varchar("code", { length: 50 }),
  classTeacherId: uuid("class_teacher_id").references(() => users.id, {
    onDelete: "set null",
  }),
  capacity: integer("capacity"),
  displayOrder: integer("display_order").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("active"),
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
  capacity: integer("capacity"),
  classTeacherId: uuid("class_teacher_id").references(() => users.id, {
    onDelete: "set null",
  }),
  displayOrder: integer("display_order").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("active"),
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
    admissionDate: timestamp("admission_date", { withTimezone: true }),
    stateOfOrigin: varchar("state_of_origin", { length: 100 }),
    lga: varchar("lga", { length: 100 }),
    nationality: varchar("nationality", { length: 100 }),
    religion: varchar("religion", { length: 100 }),
    bloodGroup: varchar("blood_group", { length: 10 }),
    genotype: varchar("genotype", { length: 10 }),
    address: text("address"),
    photoUrl: text("photo_url"),
    passportUrl: text("passport_url"),
    classId: uuid("class_id").references(() => classes.id, {
      onDelete: "set null",
    }),
    sectionId: uuid("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    emergencyContactName: varchar("emergency_contact_name", { length: 200 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
    emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 100 }),
    previousSchool: text("previous_school"),
    medicalConditions: text("medical_conditions"),
    allergies: text("allergies"),
    hostelRoomId: uuid("hostel_room_id"),
    hostelBedId: uuid("hostel_bed_id"),
    notificationPreferences: jsonb("notification_preferences"),
    status: studentStatusEnum("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id"),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    mergedBy: uuid("merged_by").references(() => users.id, {
      onDelete: "set null",
    }),
    isReadOnly: boolean("is_read_only").notNull().default(false),
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
    schoolClassStatusIdx: index("idx_students_school_class_status").on(
      table.schoolId,
      table.classId,
      table.status
    ),
    statusClassSectionIdx: index("idx_students_status_class_section").on(
      table.schoolId,
      table.status,
      table.classId,
      table.sectionId
    ),
    nameDobIdx: index("idx_students_name_dob").on(
      table.schoolId,
      table.firstName,
      table.lastName,
      table.dateOfBirth
    ),
  })
);

// ── Table: guardians ──────────────────────────────────────────
export const guardians = pgTable("guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  occupation: varchar("occupation", { length: 100 }),
  address: text("address"),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Table: student_guardians ──────────────────────────────────
export const studentGuardians = pgTable("student_guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  guardianId: uuid("guardian_id").references(() => guardians.id, {
    onDelete: "cascade",
  }),
  parentId: uuid("parent_id").references(() => users.id, {
    onDelete: "cascade",
  }),
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
    schoolClassDateIdx: index("idx_attendance_school_class_date").on(
      table.schoolId,
      table.classId,
      table.date
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
    schoolStudentTermIdx: index("idx_scores_school_student_term").on(
      table.schoolId,
      table.studentId,
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

// Student & Applicant Exam Sessions Tracking Table
export const cbtExamSessions = pgTable("cbt_exam_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  examId: uuid("exam_id")
    .notNull()
    .references(() => cbtExams.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" }),
  admissionApplicationId: uuid("admission_application_id")
    .references(() => admissionApplications.id, { onDelete: "cascade" }),
  applicantReference: varchar("applicant_reference", { length: 100 }),
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
    schoolStatusCreatedIdx: index("idx_invoices_school_status_due").on(table.schoolId, table.status, table.createdAt),
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

// ── Milestone 15: Hostel Management System Schema ───────────────────────────

export const hostels = pgTable(
  "hostels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    code: varchar("code", { length: 50 }),
    genderType: varchar("gender_type", { length: 20 }).notNull().default("mixed"), // boys, girls, mixed
    capacity: integer("capacity").notNull().default(100),
    address: text("address"),
    wardenUserId: uuid("warden_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    hostelSchoolIdx: index("hostel_school_idx").on(table.schoolId),
  })
);

export const hostelBlocks = pgTable(
  "hostel_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    hostelId: uuid("hostel_id").notNull().references(() => hostels.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }),
    capacity: integer("capacity").notNull().default(50),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    blockSchoolHostelIdx: index("block_school_hostel_idx").on(table.schoolId, table.hostelId),
  })
);

export const hostelRooms = pgTable(
  "hostel_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    hostelId: uuid("hostel_id").notNull().references(() => hostels.id, { onDelete: "cascade" }),
    blockId: uuid("block_id").references(() => hostelBlocks.id, { onDelete: "set null" }),
    roomNumber: varchar("room_number", { length: 50 }).notNull(),
    floor: varchar("floor", { length: 50 }),
    capacity: integer("capacity").notNull().default(4), // Number of beds
    status: varchar("status", { length: 20 }).notNull().default("available"), // available, full, maintenance
    feePerTerm: doublePrecision("fee_per_term").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    roomSchoolHostelIdx: index("room_school_hostel_idx").on(table.schoolId, table.hostelId, table.status),
  })
);

export const hostelBeds = pgTable(
  "hostel_beds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
    bedNumber: varchar("bed_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("available"), // available, occupied, maintenance, reserved
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bedSchoolRoomIdx: index("bed_school_room_idx").on(table.schoolId, table.roomId, table.status),
  })
);

export const hostelAllocations = pgTable(
  "hostel_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    hostelId: uuid("hostel_id").notNull().references(() => hostels.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
    bedId: uuid("bed_id").notNull().references(() => hostelBeds.id, { onDelete: "cascade" }),
    allocatedAt: timestamp("allocated_at", { withTimezone: true }).notNull().defaultNow(),
    vacatedAt: timestamp("vacated_at", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, transferred, vacated
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    allocSchoolStudentIdx: index("alloc_school_student_idx").on(table.schoolId, table.studentId, table.status),
  })
);

export const hostelTransfers = pgTable(
  "hostel_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    allocationId: uuid("allocation_id").notNull().references(() => hostelAllocations.id, { onDelete: "cascade" }),
    fromRoomId: uuid("from_room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
    fromBedId: uuid("from_bed_id").notNull().references(() => hostelBeds.id, { onDelete: "cascade" }),
    toRoomId: uuid("to_room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
    toBedId: uuid("to_bed_id").notNull().references(() => hostelBeds.id, { onDelete: "cascade" }),
    transferredAt: timestamp("transferred_at", { withTimezone: true }).notNull().defaultNow(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    transferSchoolStudentIdx: index("transfer_school_student_idx").on(table.schoolId, table.studentId),
  })
);

export const hostelAttendance = pgTable(
  "hostel_attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    hostelId: uuid("hostel_id").notNull().references(() => hostels.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    status: varchar("status", { length: 20 }).notNull().default("present"), // present, absent, late, leave
    remarks: text("remarks"),
    markedById: uuid("marked_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    hostelAttIdx: index("hostel_att_idx").on(table.schoolId, table.hostelId, table.date),
  })
);

export const hostelMaintenance = pgTable(
  "hostel_maintenance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    hostelId: uuid("hostel_id").notNull().references(() => hostels.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => hostelRooms.id, { onDelete: "set null" }),
    bedId: uuid("bed_id").references(() => hostelBeds.id, { onDelete: "set null" }),
    issueDescription: text("issue_description").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("reported"), // reported, in_progress, resolved
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    cost: doublePrecision("cost").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    maintSchoolHostelIdx: index("maint_school_hostel_idx").on(table.schoolId, table.hostelId, table.status),
  })
);

// ── Table: student_activity_timeline ─────────────────────────
// Immutable audit log for all student lifecycle events.
// Records every admission, status change, transfer, promotion,
// guardian update, document upload, and hostel allocation.
export const studentActivityTimeline = pgTable(
  "student_activity_timeline",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // Who performed this action (null = system/automated)
    performedBy: uuid("performed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    // Category of event for filtering
    eventType: varchar("event_type", { length: 50 }).notNull(),
    // e.g. "admission", "status_change", "class_transfer", "promotion",
    //       "guardian_update", "document_upload", "hostel_allocation"
    // Human-readable description of the event
    description: text("description").notNull(),
    // Optional structured metadata (previous vs new value, etc.)
    metadata: jsonb("metadata"),
    // When the event occurred (immutable once inserted)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentTimelineIdx: index("student_timeline_idx").on(
      table.schoolId,
      table.studentId,
      table.createdAt
    ),
    eventTypeIdx: index("timeline_event_type_idx").on(
      table.schoolId,
      table.eventType
    ),
  })
);

export const studentActivityTimelineRelations = relations(
  studentActivityTimeline,
  ({ one }) => ({
    school: one(schools, {
      fields: [studentActivityTimeline.schoolId],
      references: [schools.id],
    }),
    student: one(students, {
      fields: [studentActivityTimeline.studentId],
      references: [students.id],
    }),
    performedByUser: one(users, {
      fields: [studentActivityTimeline.performedBy],
      references: [users.id],
    }),
  })
);

// ── Table: student_documents ─────────────────────────────────
export const studentDocuments = pgTable(
  "student_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    fileHash: varchar("file_hash", { length: 64 }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deleteReason: text("delete_reason"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
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
    studentDocIdx: index("student_doc_idx").on(
      table.schoolId,
      table.studentId
    ),
    studentDocActiveIdx: index("idx_student_docs_active").on(
      table.schoolId,
      table.studentId,
      table.isDeleted
    ),
  })
);

export const studentDocumentsRelations = relations(
  studentDocuments,
  ({ one }) => ({
    school: one(schools, {
      fields: [studentDocuments.schoolId],
      references: [schools.id],
    }),
    student: one(students, {
      fields: [studentDocuments.studentId],
      references: [students.id],
    }),
    uploadedByUser: one(users, {
      fields: [studentDocuments.uploadedBy],
      references: [users.id],
    }),
    deletedByUser: one(users, {
      fields: [studentDocuments.deletedBy],
      references: [users.id],
    }),
  })
);

// ── Table: admission_sequences ───────────────────────────────
export const admissionSequences = pgTable(
  "admission_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYear: varchar("academic_year", { length: 10 }).notNull(),
    currentNumber: integer("current_number").notNull().default(0),
    formatTemplate: varchar("format_template", { length: 100 })
      .notNull()
      .default("{prefix}/{year}/{seq:6}"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    schoolYearIdx: uniqueIndex("school_academic_year_idx").on(
      table.schoolId,
      table.academicYear
    ),
  })
);

export const admissionSequencesRelations = relations(
  admissionSequences,
  ({ one }) => ({
    school: one(schools, {
      fields: [admissionSequences.schoolId],
      references: [schools.id],
    }),
  })
);

// ── Table: transport_vehicles ────────────────────────────────
export const transportVehicles = pgTable(
  "transport_vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    registrationNumber: varchar("registration_number", { length: 50 }).notNull(),
    fleetNumber: varchar("fleet_number", { length: 50 }),
    make: varchar("make", { length: 50 }),
    model: varchar("model", { length: 50 }),
    manufactureYear: integer("manufacture_year"),
    color: varchar("color", { length: 30 }),
    seatingCapacity: integer("seating_capacity").notNull().default(30),
    currentMileage: integer("current_mileage").notNull().default(0),
    assignedDriverId: uuid("assigned_driver_id"),
    insuranceExpiry: timestamp("insurance_expiry", { withTimezone: true }),
    roadWorthinessExpiry: timestamp("road_worthiness_expiry", { withTimezone: true }),
    inspectionExpiry: timestamp("inspection_expiry", { withTimezone: true }),
    trackerInstalled: boolean("tracker_installed").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, maintenance, retired
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolRegIdx: uniqueIndex("idx_transport_veh_school_reg").on(table.schoolId, table.registrationNumber),
    schoolStatusIdx: index("idx_transport_veh_school_status").on(table.schoolId, table.status),
  })
);

// ── Table: transport_drivers ─────────────────────────────────
export const transportDrivers = pgTable(
  "transport_drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    linkedStaffId: uuid("linked_staff_id").references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    licenceNumber: varchar("licence_number", { length: 50 }).notNull(),
    licenceExpiry: timestamp("licence_expiry", { withTimezone: true }).notNull(),
    emergencyContact: text("emergency_contact"),
    employmentStatus: varchar("employment_status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
    medicalFitnessExpiry: timestamp("medical_fitness_expiry", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolDriverIdx: index("idx_transport_drv_school").on(table.schoolId, table.employmentStatus),
  })
);

// ── Table: transport_routes ──────────────────────────────────
export const transportRoutes = pgTable(
  "transport_routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    routeName: text("route_name").notNull(),
    routeCode: varchar("route_code", { length: 50 }).notNull(),
    assignedVehicleId: uuid("assigned_vehicle_id").references(() => transportVehicles.id, { onDelete: "set null" }),
    assignedDriverId: uuid("assigned_driver_id").references(() => transportDrivers.id, { onDelete: "set null" }),
    transportFee: doublePrecision("transport_fee").notNull().default(0),
    maximumStudents: integer("maximum_students").notNull().default(30),
    estimatedDurationMinutes: integer("estimated_duration_minutes").default(45),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolRouteCodeIdx: uniqueIndex("idx_transport_rte_school_code").on(table.schoolId, table.routeCode),
  })
);

// ── Table: transport_route_stops ────────────────────────────
export const transportRouteStops = pgTable(
  "transport_route_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    stopName: text("stop_name").notNull(),
    stopOrder: integer("stop_order").notNull().default(1),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    pickupTime: varchar("pickup_time", { length: 20 }),
    dropoffTime: varchar("dropoff_time", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    routeStopOrderIdx: index("idx_transport_stop_route_order").on(table.routeId, table.stopOrder),
  })
);

// ── Table: transport_assignments ────────────────────────────
export const transportAssignments = pgTable(
  "transport_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    stopId: uuid("stop_id").references(() => transportRouteStops.id, { onDelete: "set null" }),
    tripType: varchar("trip_type", { length: 20 }).notNull().default("Both"), // Morning, Afternoon, Both
    assignedDate: timestamp("assigned_date", { withTimezone: true }).notNull().defaultNow(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolStudentActiveIdx: index("idx_transport_assign_student").on(table.schoolId, table.studentId, table.active),
    schoolRouteActiveIdx: index("idx_transport_assign_route").on(table.schoolId, table.routeId, table.active),
  })
);

// ── Table: transport_daily_trips ────────────────────────────
export const transportDailyTrips = pgTable(
  "transport_daily_trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => transportVehicles.id, { onDelete: "set null" }),
    driverId: uuid("driver_id").references(() => transportDrivers.id, { onDelete: "set null" }),
    tripType: varchar("trip_type", { length: 30 }).notNull().default("morning_pickup"), // morning_pickup, afternoon_dropoff
    tripDate: varchar("trip_date", { length: 10 }).notNull(), // YYYY-MM-DD
    departureTime: timestamp("departure_time", { withTimezone: true }),
    arrivalTime: timestamp("arrival_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("Scheduled"), // Scheduled, In Progress, Completed, Cancelled
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolDateIdx: index("idx_transport_trip_school_date").on(table.schoolId, table.tripDate),
    routeDateIdx: index("idx_transport_trip_route_date").on(table.routeId, table.tripDate),
  })
);

// ── Table: transport_attendance ─────────────────────────────
export const transportAttendance = pgTable(
  "transport_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => transportDailyTrips.id, { onDelete: "cascade" }),
    boardedAt: timestamp("boarded_at", { withTimezone: true }),
    droppedAt: timestamp("dropped_at", { withTimezone: true }),
    boardedBy: uuid("boarded_by").references(() => users.id, { onDelete: "set null" }),
    droppedBy: uuid("dropped_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tripStudentIdx: uniqueIndex("idx_transport_att_trip_student").on(table.tripId, table.studentId),
  })
);

// ── Table: transport_maintenance_logs ────────────────────────
export const transportMaintenanceLogs = pgTable(
  "transport_maintenance_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => transportVehicles.id, { onDelete: "cascade" }),
    maintenanceType: varchar("maintenance_type", { length: 50 }).notNull().default("routine_service"), // routine_service, repair, inspection, tire_replacement
    description: text("description").notNull(),
    vendor: text("vendor"),
    invoiceReference: varchar("invoice_reference", { length: 100 }),
    labourCost: doublePrecision("labour_cost").notNull().default(0),
    partsCost: doublePrecision("parts_cost").notNull().default(0),
    totalCost: doublePrecision("total_cost").notNull().default(0),
    nextServiceMileage: integer("next_service_mileage"),
    nextServiceDate: timestamp("next_service_date", { withTimezone: true }),
    performedById: uuid("performed_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleMaintenanceIdx: index("idx_transport_maint_vehicle").on(table.vehicleId),
  })
);

// ── Table: transport_fuel_logs ───────────────────────────────
export const transportFuelLogs = pgTable(
  "transport_fuel_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => transportVehicles.id, { onDelete: "cascade" }),
    litres: doublePrecision("litres").notNull(),
    totalCost: doublePrecision("total_cost").notNull(),
    pricePerLitre: doublePrecision("price_per_litre").notNull(),
    odometer: integer("odometer").notNull(),
    filledBy: uuid("filled_by").references(() => users.id, { onDelete: "set null" }),
    stationName: text("station_name"),
    receiptReference: varchar("receipt_reference", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleFuelIdx: index("idx_transport_fuel_vehicle").on(table.vehicleId),
  })
);

// ── Table: hr_departments ─────────────────────────────────────
export const hrDepartments = pgTable(
  "hr_departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    departmentName: text("department_name").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    description: text("description"),
    headOfDepartmentId: uuid("head_of_department_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolCodeIdx: uniqueIndex("idx_hr_dept_school_code").on(table.schoolId, table.code),
  })
);

// ── Table: hr_positions ───────────────────────────────────────
export const hrPositions = pgTable(
  "hr_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => hrDepartments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    gradeLevel: varchar("grade_level", { length: 50 }),
    minSalary: doublePrecision("min_salary").default(0),
    maxSalary: doublePrecision("max_salary").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolDeptIdx: index("idx_hr_pos_school_dept").on(table.schoolId, table.departmentId),
  })
);

// ── Table: hr_employees ───────────────────────────────────────
export const hrEmployees = pgTable(
  "hr_employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    employeeNumber: varchar("employee_number", { length: 50 }).notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    middleName: text("middle_name"),
    gender: varchar("gender", { length: 20 }),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    departmentId: uuid("department_id").references(() => hrDepartments.id, { onDelete: "set null" }),
    positionId: uuid("position_id").references(() => hrPositions.id, { onDelete: "set null" }),
    employmentType: varchar("employment_type", { length: 30 }).notNull().default("full_time"), // full_time, part_time, contract
    employmentStatus: varchar("employment_status", { length: 30 }).notNull().default("active"), // active, on_leave, suspended, terminated, retired
    hireDate: timestamp("hire_date", { withTimezone: true }).notNull().defaultNow(),
    exitDate: timestamp("exit_date", { withTimezone: true }),
    bankName: text("bank_name"),
    accountNumber: varchar("account_number", { length: 50 }),
    taxIdNumber: varchar("tax_id_number", { length: 50 }),
    pensionPin: varchar("pension_pin", { length: 50 }),
    pensionPfaName: text("pension_pfa_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolEmpNumIdx: uniqueIndex("idx_hr_emp_school_num").on(table.schoolId, table.employeeNumber),
    schoolStatusIdx: index("idx_hr_emp_school_status").on(table.schoolId, table.employmentStatus),
  })
);

// ── Table: hr_salary_structures ──────────────────────────────
export const hrSalaryStructures = pgTable(
  "hr_salary_structures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gradeLevel: varchar("grade_level", { length: 50 }),
    basicSalary: doublePrecision("basic_salary").notNull().default(0),
    taxDeductionRate: doublePrecision("tax_deduction_rate").notNull().default(7.5), // %
    pensionDeductionRate: doublePrecision("pension_deduction_rate").notNull().default(8.0), // %
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolSalaryNameIdx: index("idx_hr_sal_struct_school").on(table.schoolId, table.status),
  })
);

// ── Table: hr_allowances ─────────────────────────────────────
export const hrAllowances = pgTable(
  "hr_allowances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    salaryStructureId: uuid("salary_structure_id")
      .notNull()
      .references(() => hrSalaryStructures.id, { onDelete: "cascade" }),
    allowanceType: varchar("allowance_type", { length: 50 }).notNull(), // Housing, Transport, Hazard, Meal, Duty, ICT, Responsibility
    amount: doublePrecision("amount").notNull().default(0),
    isTaxable: boolean("is_taxable").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    structAllowanceIdx: index("idx_hr_allowance_struct").on(table.salaryStructureId),
  })
);

// ── Table: hr_salary_history ──────────────────────────────────
export const hrSalaryHistory = pgTable(
  "hr_salary_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => hrEmployees.id, { onDelete: "cascade" }),
    oldBasicSalary: doublePrecision("old_basic_salary").notNull().default(0),
    newBasicSalary: doublePrecision("new_basic_salary").notNull().default(0),
    effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull().defaultNow(),
    changedById: uuid("changed_by_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    empSalaryHistoryIdx: index("idx_hr_sal_hist_emp").on(table.employeeId),
  })
);

// ── Table: hr_employee_documents ──────────────────────────────
export const hrEmployeeDocuments = pgTable(
  "hr_employee_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => hrEmployees.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 50 }).notNull(), // appointment_letter, cv, certificates, id_card, contract, passport, medical
    title: text("title").notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    empDocsIdx: index("idx_hr_emp_docs_emp").on(table.employeeId),
  })
);

// ── Table: hr_leave_balances ──────────────────────────────────
export const hrLeaveBalances = pgTable(
  "hr_leave_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => hrEmployees.id, { onDelete: "cascade" }),
    leaveType: varchar("leave_type", { length: 50 }).notNull(), // Annual, Sick, Maternity, Casual, Study
    year: integer("year").notNull().default(2026),
    entitledDays: integer("entitled_days").notNull().default(30),
    takenDays: integer("taken_days").notNull().default(0),
    remainingDays: integer("remaining_days").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    empLeaveBalIdx: uniqueIndex("idx_hr_leave_bal_emp_type_year").on(table.employeeId, table.leaveType, table.year),
  })
);

// ── Table: hr_leave_requests ──────────────────────────────────
export const hrLeaveRequests = pgTable(
  "hr_leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => hrEmployees.id, { onDelete: "cascade" }),
    leaveType: varchar("leave_type", { length: 50 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    totalDays: integer("total_days").notNull().default(1),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("Pending"), // Pending, Reviewed, Approved, Rejected, Cancelled
    reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolLeaveReqIdx: index("idx_hr_leave_req_school_status").on(table.schoolId, table.status),
  })
);

// ── Table: hr_payroll_runs ────────────────────────────────────
export const hrPayrollRuns = pgTable(
  "hr_payroll_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    payPeriodMonth: integer("pay_period_month").notNull(), // 1..12
    payPeriodYear: integer("pay_period_year").notNull(), // 2026
    runTitle: text("run_title").notNull(),
    totalGrossSalary: doublePrecision("total_gross_salary").notNull().default(0),
    totalDeductions: doublePrecision("total_deductions").notNull().default(0),
    totalNetSalary: doublePrecision("total_net_salary").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("Draft"), // Draft, Calculated, Approved, Paid, Locked
    processedById: uuid("processed_by_id").references(() => users.id, { onDelete: "set null" }),
    approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolPeriodIdx: uniqueIndex("idx_hr_payroll_run_period").on(table.schoolId, table.payPeriodMonth, table.payPeriodYear),
  })
);

// ── Table: hr_payslips ────────────────────────────────────────
export const hrPayslips = pgTable(
  "hr_payslips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => hrPayrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => hrEmployees.id, { onDelete: "cascade" }),
    basicSalary: doublePrecision("basic_salary").notNull().default(0),
    totalAllowances: doublePrecision("total_allowances").notNull().default(0),
    grossSalary: doublePrecision("gross_salary").notNull().default(0),
    taxDeduction: doublePrecision("tax_deduction").notNull().default(0),
    pensionDeduction: doublePrecision("pension_deduction").notNull().default(0),
    attendanceDeductions: doublePrecision("attendance_deductions").notNull().default(0),
    otherDeductions: doublePrecision("other_deductions").notNull().default(0),
    totalDeductions: doublePrecision("total_deductions").notNull().default(0),
    netSalary: doublePrecision("net_salary").notNull().default(0),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("Unpaid"), // Unpaid, Paid
    paymentDate: timestamp("payment_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runEmpPayslipIdx: uniqueIndex("idx_hr_payslip_run_emp").on(table.payrollRunId, table.employeeId),
  })
);

// ── Table: hr_payroll_items ───────────────────────────────────
export const hrPayrollItems = pgTable(
  "hr_payroll_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    payslipId: uuid("payslip_id")
      .notNull()
      .references(() => hrPayslips.id, { onDelete: "cascade" }),
    itemType: varchar("item_type", { length: 30 }).notNull(), // allowance, deduction, tax, pension, attendance_penalty, overtime
    itemLabel: text("item_label").notNull(),
    amount: doublePrecision("amount").notNull().default(0),
    isTaxable: boolean("is_taxable").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    payslipItemsIdx: index("idx_hr_pay_items_payslip").on(table.payslipId),
  })
);

// ── Table: hr_audit_logs ──────────────────────────────────────
export const hrAuditLogs = pgTable(
  "hr_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    performedById: uuid("performed_by_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // employee_created, employee_updated, leave_approved, payroll_calculated, payroll_locked, payslip_generated
    employeeId: uuid("employee_id").references(() => hrEmployees.id, { onDelete: "set null" }),
    details: text("details").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolAuditIdx: index("idx_hr_audit_school_date").on(table.schoolId, table.createdAt),
  })
);

// ── Table: finance_fiscal_years ────────────────────────────────
export const financeFiscalYears = pgTable(
  "finance_fiscal_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "2026 Fiscal Year"
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolFiscalIdx: index("idx_fin_fiscal_school").on(table.schoolId, table.isClosed),
  })
);

// ── Table: finance_accounting_periods ──────────────────────────
export const financeAccountingPeriods = pgTable(
  "finance_accounting_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    fiscalYearId: uuid("fiscal_year_id")
      .notNull()
      .references(() => financeFiscalYears.id, { onDelete: "cascade" }),
    periodName: text("period_name").notNull(), // e.g. "January 2026"
    periodMonth: integer("period_month").notNull(), // 1..12
    periodYear: integer("period_year").notNull(), // 2026
    isLocked: boolean("is_locked").notNull().default(false),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: uuid("locked_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolPeriodUniqueIdx: uniqueIndex("idx_fin_period_unique").on(table.schoolId, table.periodMonth, table.periodYear),
  })
);

// ── Table: finance_accounts ────────────────────────────────────
// Note: Derived balances (NO stored currentBalance) as specified.
export const financeAccounts = pgTable(
  "finance_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    accountCode: varchar("account_code", { length: 50 }).notNull(), // e.g. "1010", "4010"
    accountName: text("account_name").notNull(),
    accountType: varchar("account_type", { length: 30 }).notNull(), // Asset, Liability, Equity, Revenue, Expense
    category: varchar("category", { length: 50 }).notNull(), // Cash, Bank, Receivables, Payables, Revenue, Expense
    parentAccountId: uuid("parent_account_id").references((): any => financeAccounts.id, { onDelete: "set null" }),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolCodeUniqueIdx: uniqueIndex("idx_fin_acc_school_code").on(table.schoolId, table.accountCode),
    schoolTypeIdx: index("idx_fin_acc_type").on(table.schoolId, table.accountType),
  })
);

// ── Table: finance_journal_entries ────────────────────────────
// Note: Immutable posted journal entries (reversal workflow, NO editing after posting).
export const financeJournalEntries = pgTable(
  "finance_journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    entryNumber: varchar("entry_number", { length: 50 }).notNull(), // e.g. "JE-2026-0001"
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull().defaultNow(),
    periodId: uuid("period_id").references(() => financeAccountingPeriods.id, { onDelete: "set null" }),
    referenceType: varchar("reference_type", { length: 50 }).notNull(), // school_fees, hostel, transport, library, payroll, expense, manual, reversal
    referenceId: uuid("reference_id"),
    description: text("description").notNull(),
    postedById: uuid("posted_by_id").references(() => users.id, { onDelete: "set null" }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("Draft"), // Draft, Posted, Reversed, Cancelled
    reversedEntryId: uuid("reversed_entry_id").references((): any => financeJournalEntries.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolNumUniqueIdx: uniqueIndex("idx_fin_je_school_num").on(table.schoolId, table.entryNumber),
    schoolStatusDateIdx: index("idx_fin_je_status_date").on(table.schoolId, table.status, table.entryDate),
  })
);

// ── Table: finance_journal_lines ──────────────────────────────
export const financeJournalLines = pgTable(
  "finance_journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => financeJournalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    debitAmount: doublePrecision("debit_amount").notNull().default(0),
    creditAmount: doublePrecision("credit_amount").notNull().default(0),
    memo: text("memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entryAccountIdx: index("idx_fin_jl_entry_account").on(table.journalEntryId, table.accountId),
  })
);

// ── Table: finance_ledger ─────────────────────────────────────
// High-performance flat General Ledger table for real-time reporting & balance queries.
export const financeLedger = pgTable(
  "finance_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => financeJournalEntries.id, { onDelete: "cascade" }),
    journalLineId: uuid("journal_line_id")
      .notNull()
      .references(() => financeJournalLines.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    debitAmount: doublePrecision("debit_amount").notNull().default(0),
    creditAmount: doublePrecision("credit_amount").notNull().default(0),
    runningBalance: doublePrecision("running_balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolAccountDateIdx: index("idx_fin_ledger_account_date").on(table.schoolId, table.accountId, table.entryDate),
  })
);

// ── Table: finance_expenses ───────────────────────────────────
export const financeExpenses = pgTable(
  "finance_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    expenseNumber: varchar("expense_number", { length: 50 }).notNull(),
    vendorName: text("vendor_name").notNull(),
    category: text("category").notNull(),
    amount: doublePrecision("amount").notNull(),
    paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("Bank Transfer"), // Cash, Bank Transfer, Cheque
    paymentAccountId: uuid("payment_account_id").references(() => financeAccounts.id, { onDelete: "set null" }),
    expenseAccountId: uuid("expense_account_id").references(() => financeAccounts.id, { onDelete: "set null" }),
    receiptUrl: text("receipt_url"),
    status: varchar("status", { length: 20 }).notNull().default("Draft"), // Draft, Submitted, Approved, Rejected, Posted
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolExpenseStatusIdx: index("idx_fin_exp_school_status").on(table.schoolId, table.status),
  })
);

// ── Table: finance_recurring_expenses ─────────────────────────
export const financeRecurringExpenses = pgTable(
  "finance_recurring_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    amount: doublePrecision("amount").notNull(),
    frequency: varchar("frequency", { length: 20 }).notNull().default("monthly"), // monthly, quarterly, yearly
    vendorName: text("vendor_name").notNull(),
    paymentAccountId: uuid("payment_account_id").references(() => financeAccounts.id, { onDelete: "set null" }),
    expenseAccountId: uuid("expense_account_id").references(() => financeAccounts.id, { onDelete: "set null" }),
    nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolRecurIdx: index("idx_fin_recur_school_active").on(table.schoolId, table.active),
  })
);

// ── Table: finance_budgets ────────────────────────────────────
export const financeBudgets = pgTable(
  "finance_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    fiscalYearId: uuid("fiscal_year_id")
      .notNull()
      .references(() => financeFiscalYears.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => hrDepartments.id, { onDelete: "set null" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financeAccounts.id, { onDelete: "cascade" }),
    allocatedAmount: doublePrecision("allocated_amount").notNull().default(0),
    utilizedAmount: doublePrecision("utilized_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolBudgetUniqueIdx: uniqueIndex("idx_fin_budget_unique").on(table.schoolId, table.fiscalYearId, table.accountId),
  })
);

// ── Table: finance_bank_accounts ──────────────────────────────
export const financeBankAccounts = pgTable(
  "finance_bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    bankName: text("bank_name").notNull(),
    accountName: text("account_name").notNull(),
    accountNumber: varchar("account_number", { length: 50 }).notNull(),
    glAccountId: uuid("gl_account_id").references(() => financeAccounts.id, { onDelete: "set null" }),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    openingBalance: doublePrecision("opening_balance").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolBankNumIdx: uniqueIndex("idx_fin_bank_school_num").on(table.schoolId, table.accountNumber),
  })
);

// ── Table: finance_bank_reconciliations ───────────────────────
export const financeBankReconciliations = pgTable(
  "finance_bank_reconciliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id")
      .notNull()
      .references(() => financeBankAccounts.id, { onDelete: "cascade" }),
    statementDate: timestamp("statement_date", { withTimezone: true }).notNull(),
    statementEndingBalance: doublePrecision("statement_ending_balance").notNull().default(0),
    bookEndingBalance: doublePrecision("book_ending_balance").notNull().default(0),
    reconciledAmount: doublePrecision("reconciled_amount").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("In_Progress"), // In_Progress, Reconciled
    reconciledById: uuid("reconciled_by_id").references(() => users.id, { onDelete: "set null" }),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolBankRecIdx: index("idx_fin_bank_rec_school").on(table.schoolId, table.bankAccountId),
  })
);

// ── Table: finance_audit_logs ─────────────────────────────────
export const financeAuditLogs = pgTable(
  "finance_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    performedById: uuid("performed_by_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    details: text("details").notNull(),
    beforeState: jsonb("before_state").default({}),
    afterState: jsonb("after_state").default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolFinAuditIdx: index("idx_fin_audit_school_date").on(table.schoolId, table.createdAt),
  })
);

// ── Table: comm_announcements ─────────────────────────────────
export const commAnnouncements = pgTable(
  "comm_announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 30 }).notNull().default("general"), // general, academic, fee, emergency, event
    audienceType: varchar("audience_type", { length: 30 }).notNull().default("all"), // all, staff, teachers, parents, students, specific_class, specific_department
    targetId: uuid("target_id"),
    publishedById: uuid("published_by_id").references(() => users.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("Published"), // Draft, Published, Archived
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolAudienceIdx: index("idx_comm_ann_school_aud").on(table.schoolId, table.audienceType, table.status),
  })
);

// ── Table: comm_notification_templates ───────────────────────
export const commNotificationTemplates = pgTable(
  "comm_notification_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: varchar("code", { length: 50 }).notNull(), // FEE_REMINDER, STUDENT_ABSENT, REPORT_CARD_READY, ASSIGNMENT_DUE, HOSTEL_FEE_DUE, TRANSPORT_ALERT
    channel: varchar("channel", { length: 20 }).notNull().default("in_app"), // in_app, email, sms, push
    subjectTemplate: text("subject_template").notNull(),
    bodyTemplate: text("body_template").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolCodeChannelUniqueIdx: uniqueIndex("idx_comm_tpl_code_chan").on(table.schoolId, table.code, table.channel),
  })
);

// ── Table: comm_notifications ────────────────────────────────
export const commNotifications = pgTable(
  "comm_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => commNotificationTemplates.id, { onDelete: "set null" }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "cascade" }),
    recipientRole: varchar("recipient_role", { length: 30 }).notNull().default("parent"), // admin, teacher, parent, student, staff
    channel: varchar("channel", { length: 20 }).notNull().default("in_app"), // in_app, email, sms, push
    title: text("title").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").default({}),
    status: varchar("status", { length: 20 }).notNull().default("Sent"), // Queued, Sent, Delivered, Failed, Read
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolUserStatusIdx: index("idx_comm_notif_user_status").on(table.schoolId, table.recipientUserId, table.status),
  })
);

// ── Table: comm_domain_events ────────────────────────────────
// Event-driven domain event log for asynchronous notification processing.
export const commDomainEvents = pgTable(
  "comm_domain_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 50 }).notNull(), // STUDENT_ABSENT, FEE_PAID, ASSIGNMENT_CREATED, REPORT_CARD_READY, LIBRARY_OVERDUE
    entityId: uuid("entity_id"),
    payload: jsonb("payload").notNull().default({}),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolEventProcessedIdx: index("idx_comm_event_processed").on(table.schoolId, table.processed, table.createdAt),
  })
);

// ── Table: comm_scheduled_triggers ────────────────────────────
export const commScheduledTriggers = pgTable(
  "comm_scheduled_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    triggerType: varchar("trigger_type", { length: 50 }).notNull(), // fee_reminder, assignment_reminder, exam_alert, library_overdue, hostel_payment, transport_alert
    scheduleCron: varchar("schedule_cron", { length: 50 }).notNull().default("0 8 * * *"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolTriggerActiveIdx: index("idx_comm_trig_active").on(table.schoolId, table.active),
  })
);

// ── Table: comm_user_preferences ─────────────────────────────
export const commUserPreferences = pgTable(
  "comm_user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    smsEnabled: boolean("sms_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPrefUniqueIdx: uniqueIndex("idx_comm_pref_user").on(table.schoolId, table.userId),
  })
);

// ── Table: comm_audit_logs ────────────────────────────────────
export const commAuditLogs = pgTable(
  "comm_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    performedById: uuid("performed_by_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    details: text("details").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolCommAuditIdx: index("idx_comm_audit_school_date").on(table.schoolId, table.createdAt),
  })
);

// ── Table: analytics_kpi_snapshots ─────────────────────────────
export const analyticsKpiSnapshots = pgTable(
  "analytics_kpi_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull().defaultNow(),
    totalStudents: integer("total_students").notNull().default(0),
    totalTeachers: integer("total_teachers").notNull().default(0),
    totalStaff: integer("total_staff").notNull().default(0),
    studentAttendanceRate: doublePrecision("student_attendance_rate").notNull().default(0),
    staffAttendanceRate: doublePrecision("staff_attendance_rate").notNull().default(0),
    totalRevenue: doublePrecision("total_revenue").notNull().default(0),
    totalExpenses: doublePrecision("total_expenses").notNull().default(0),
    netIncome: doublePrecision("net_income").notNull().default(0),
    outstandingFees: doublePrecision("outstanding_fees").notNull().default(0),
    hostelOccupancyRate: doublePrecision("hostel_occupancy_rate").notNull().default(0),
    transportUtilizationRate: doublePrecision("transport_utilization_rate").notNull().default(0),
    libraryActiveLoans: integer("library_active_loans").notNull().default(0),
    cbtExamsCompleted: integer("cbt_exams_completed").notNull().default(0),
    lmsSubmissionsCount: integer("lms_submissions_count").notNull().default(0),
    atRiskStudentsCount: integer("at_risk_students_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolSnapshotDateIdx: index("idx_analytics_kpi_school_date").on(table.schoolId, table.snapshotDate),
  })
);

// ── Table: analytics_cached_reports ───────────────────────────
export const analyticsCachedReports = pgTable(
  "analytics_cached_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(), // executive, academic, financial, operational, risk, audit, comm_delivery
    parameters: jsonb("parameters").default({}),
    data: jsonb("data").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolTypeExpireIdx: index("idx_analytics_cache_school_type").on(table.schoolId, table.reportType, table.expiresAt),
  })
);

// ── Table: analytics_student_risk_scores ──────────────────────
export const analyticsStudentRiskScores = pgTable(
  "analytics_student_risk_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    academicRiskScore: doublePrecision("academic_risk_score").notNull().default(0), // 0-100
    attendanceRiskScore: doublePrecision("attendance_risk_score").notNull().default(0), // 0-100
    feeDefaultRiskScore: doublePrecision("fee_default_risk_score").notNull().default(0), // 0-100
    examRiskScore: doublePrecision("exam_risk_score").notNull().default(0), // 0-100
    overallRiskCategory: varchar("overall_risk_category", { length: 20 }).notNull().default("Low"), // Low, Medium, High, Critical
    flaggedReasons: jsonb("flagged_reasons").default([]),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolCategoryIdx: index("idx_analytics_risk_school_cat").on(table.schoolId, table.overallRiskCategory),
    studentRiskUniqueIdx: uniqueIndex("idx_analytics_risk_student").on(table.schoolId, table.studentId),
  })
);

// ── Table: analytics_audit_logs ───────────────────────────────
export const analyticsAuditLogs = pgTable(
  "analytics_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    performedById: uuid("performed_by_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    details: text("details").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolAnalyticsAuditIdx: index("idx_analytics_audit_school_date").on(table.schoolId, table.createdAt),
  })
);

// ── Table: analytics_dashboard_widgets ─────────────────────────
export const analyticsDashboardWidgets = pgTable(
  "analytics_dashboard_widgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    widgetKey: varchar("widget_key", { length: 50 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(), // executive, academic, financial, operational, risk, audit
    positionOrder: integer("position_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolUserWidgetIdx: index("idx_analytics_widget_school_user").on(table.schoolId, table.userId),
  })
);

// ── Table: analytics_trend_history ────────────────────────────
export const analyticsTrendHistory = pgTable(
  "analytics_trend_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    metricKey: varchar("metric_key", { length: 50 }).notNull(),
    metricValue: doublePrecision("metric_value").notNull().default(0),
    periodLabel: varchar("period_label", { length: 50 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolMetricRecordIdx: index("idx_analytics_trend_school_metric").on(table.schoolId, table.metricKey, table.recordedAt),
  })
);

// ── Table: analytics_report_queue ─────────────────────────────
export const analyticsReportQueue = pgTable(
  "analytics_report_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    reportType: varchar("report_type", { length: 50 }).notNull(),
    format: varchar("format", { length: 20 }).notNull().default("csv"), // pdf, excel, csv
    status: varchar("status", { length: 20 }).notNull().default("Queued"), // Queued, Processing, Completed, Failed
    parameters: jsonb("parameters").default({}),
    downloadUrl: text("download_url"),
    fileSize: varchar("file_size", { length: 50 }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolReportQueueIdx: index("idx_analytics_queue_school_status").on(table.schoolId, table.status),
  })
);

// ── Table: school_settings ────────────────────────────────────
export const schoolSettings = pgTable(
  "school_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolKeyUniqueIdx: uniqueIndex("idx_school_settings_unique").on(table.schoolId, table.key),
  })
);

// ── Table: security_login_history ─────────────────────────────
export const securityLoginHistory = pgTable(
  "security_login_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }).notNull(),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: text("user_agent"),
    status: varchar("status", { length: 50 }).notNull(), // Success, Failed_Invalid_Password, Failed_Locked_Out
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolLoginHistoryIdx: index("idx_sec_login_school_user").on(table.schoolId, table.email, table.createdAt),
  })
);

// ── Table: security_active_sessions ───────────────────────────
export const securityActiveSessions = pgTable(
  "security_active_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    deviceInfo: text("device_info"),
    ipAddress: varchar("ip_address", { length: 50 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSessionActiveIdx: index("idx_sec_active_session_user").on(table.userId, table.isRevoked),
  })
);

// ── Table: security_rate_limits ───────────────────────────────
export const securityRateLimits = pgTable(
  "security_rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
    identifier: varchar("identifier", { length: 100 }).notNull(),
    hitsCount: integer("hits_count").notNull().default(1),
    windowStartsAt: timestamp("window_starts_at", { withTimezone: true }).notNull().defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  },
  (table) => ({
    identifierRateIdx: uniqueIndex("idx_sec_rate_identifier").on(table.identifier),
  })
);

// ── Table: security_audit_trails ──────────────────────────────
export const securityAuditTrails = pgTable(
  "security_audit_trails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    performedById: uuid("performed_by_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    details: text("details").notNull(),
    ipAddress: varchar("ip_address", { length: 50 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolSecurityAuditIdx: index("idx_sec_audit_school_date").on(table.schoolId, table.createdAt),
  })
);

// ── Table: integration_gateways ───────────────────────────────
export const integrationGateways = pgTable(
  "integration_gateways",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // paystack, smtp, resend, termkii_sms, whatsapp, s3_storage
    config: jsonb("config").default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolProviderUniqueIdx: uniqueIndex("idx_gateway_school_provider").on(table.schoolId, table.provider),
  })
);

// ── Table: integration_webhooks ───────────────────────────────
export const integrationWebhooks = pgTable(
  "integration_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 100 }).notNull(),
    targetUrl: text("target_url").notNull(),
    secretKey: varchar("secret_key", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolWebhookIdx: index("idx_webhook_school_event").on(table.schoolId, table.event),
  })
);

// ── Table: integration_webhook_logs ───────────────────────────
export const integrationWebhookLogs = pgTable(
  "integration_webhook_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    webhookId: uuid("webhook_id").references(() => integrationWebhooks.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 100 }).notNull(),
    payload: jsonb("payload").default({}),
    responseCode: integer("response_code"),
    status: varchar("status", { length: 50 }).notNull().default("success"), // success, failed, retrying
    attemptCount: integer("attempt_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolWebhookLogIdx: index("idx_webhook_log_school_status").on(table.schoolId, table.status),
  })
);

// ── Table: automation_cron_schedules ─────────────────────────
export const automationCronSchedules = pgTable(
  "automation_cron_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    taskType: varchar("task_type", { length: 100 }).notNull(), // fee_reminder, assignment_reminder, report_card_export
    cronExpression: varchar("cron_expression", { length: 50 }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    status: varchar("status", { length: 50 }).notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolAutomationIdx: index("idx_automation_school_type").on(table.schoolId, table.taskType),
  })
);

// ════════════════════════════════════════════════════════════════
// MILESTONE 28 — Multi-Tenant SaaS Platform Tables
// ════════════════════════════════════════════════════════════════

export const saasSchoolStatusEnum = pgEnum("saas_school_status", [
  "active", "suspended", "cancelled", "pending",
]);

export const saasOnboardingStatusEnum = pgEnum("saas_onboarding_status", [
  "STARTED", "SCHOOL_CREATED", "ADMIN_CREATED", "SUBSCRIPTION_PENDING",
  "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "SETUP_IN_PROGRESS", "COMPLETED",
]);

export const saasSubscriptionStatusEnum = pgEnum("saas_subscription_status", [
  "active", "pending_payment", "expired", "cancelled", "payment_failed",
]);

export const saasMembershipStatusEnum = pgEnum("saas_membership_status", [
  "active", "inactive", "suspended",
]);

export const saasMembershipRoleEnum = pgEnum("saas_membership_role", [
  "admin", "teacher", "parent", "student", "staff", "platform_admin",
]);

// Configurable subscription plans — prices never hard-coded in UI
export const saasSubscriptionPlans = pgTable(
  "saas_subscription_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    termlyPrice: doublePrecision("termly_price").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    isActive: boolean("is_active").notNull().default(true),
    features: jsonb("features"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activePlanIdx: index("idx_saas_plans_active").on(table.isActive),
  })
);

// Authoritative user ↔ school relationship — no client-supplied school_id ever trusted
export const saasSchoolMemberships = pgTable(
  "saas_school_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    role: saasMembershipRoleEnum("role").notNull(),
    status: saasMembershipStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSchoolIdx: uniqueIndex("idx_saas_membership_user_school").on(table.userId, table.schoolId),
    schoolMembershipIdx: index("idx_saas_membership_school").on(table.schoolId),
    userMembershipIdx: index("idx_saas_membership_user").on(table.userId),
  })
);

// Maps subdomains → school tenants: schoola.apexium.example → school_id=A
export const saasSchoolDomains = pgTable(
  "saas_school_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    domainType: varchar("domain_type", { length: 30 }).notNull().default("subdomain"),
    isPrimary: boolean("is_primary").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    domainLookupIdx: uniqueIndex("idx_saas_domain_lookup").on(table.domain),
    schoolDomainIdx: index("idx_saas_domain_school").on(table.schoolId),
  })
);

// One active subscription record per school per term
export const saasSchoolSubscriptions = pgTable(
  "saas_school_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").notNull().references(() => saasSubscriptionPlans.id),
    status: saasSubscriptionStatusEnum("status").notNull().default("pending_payment"),
    billingPeriod: varchar("billing_period", { length: 20 }).notNull().default("TERM"),
    amount: doublePrecision("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    paymentReference: varchar("payment_reference", { length: 255 }).unique(),
    paystackReference: varchar("paystack_reference", { length: 255 }).unique(),
    lastPaymentAt: timestamp("last_payment_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolSubscriptionIdx: index("idx_saas_subscription_school").on(table.schoolId),
    subscriptionStatusIdx: index("idx_saas_subscription_status").on(table.status),
    subscriptionExpiryIdx: index("idx_saas_subscription_expiry").on(table.endsAt),
    paystackRefIdx: index("idx_saas_subscription_paystack_ref").on(table.paystackReference),
  })
);

// Immutable payment attempt records — never deleted to preserve financial history
export const saasSubscriptionPayments = pgTable(
  "saas_subscription_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").notNull().references(() => saasSchoolSubscriptions.id),
    provider: varchar("provider", { length: 50 }).notNull().default("paystack"),
    reference: varchar("reference", { length: 255 }).notNull().unique(),
    paystackReference: varchar("paystack_reference", { length: 255 }),
    amount: doublePrecision("amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    channel: varchar("channel", { length: 50 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paymentRefIdx: uniqueIndex("idx_saas_payment_ref").on(table.reference),
    schoolPaymentIdx: index("idx_saas_payment_school").on(table.schoolId),
    subscriptionPaymentIdx: index("idx_saas_payment_subscription").on(table.subscriptionId),
  })
);

// Resumeable onboarding state per school — one row per school
export const saasOnboardingSessions = pgTable(
  "saas_onboarding_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }).unique(),
    status: saasOnboardingStatusEnum("status").notNull().default("STARTED"),
    currentStep: varchar("current_step", { length: 50 }).notNull().default("SCHOOL_CREATED"),
    completedSteps: jsonb("completed_steps").notNull().default([]),
    adminUserId: uuid("admin_user_id"),
    metadata: jsonb("metadata"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    onboardingSchoolIdx: index("idx_saas_onboarding_school").on(table.schoolId),
    onboardingStatusIdx: index("idx_saas_onboarding_status").on(table.status),
  })
);

// Platform-level immutable audit log
export const saasAuditLogs = pgTable(
  "saas_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    actorId: uuid("actor_id"),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    auditSchoolIdx: index("idx_saas_audit_school").on(table.schoolId),
    auditEventIdx: index("idx_saas_audit_event").on(table.eventType),
    auditCreatedIdx: index("idx_saas_audit_created").on(table.createdAt),
  })
);

// SaaS Relations
export const saasSubscriptionPlansRelations = relations(saasSubscriptionPlans, ({ many }) => ({
  subscriptions: many(saasSchoolSubscriptions),
}));

export const saasSchoolMembershipsRelations = relations(saasSchoolMemberships, ({ one }) => ({
  school: one(schools, { fields: [saasSchoolMemberships.schoolId], references: [schools.id] }),
}));

export const saasSchoolDomainsRelations = relations(saasSchoolDomains, ({ one }) => ({
  school: one(schools, { fields: [saasSchoolDomains.schoolId], references: [schools.id] }),
}));

export const saasSchoolSubscriptionsRelations = relations(saasSchoolSubscriptions, ({ one, many }) => ({
  school: one(schools, { fields: [saasSchoolSubscriptions.schoolId], references: [schools.id] }),
  plan: one(saasSubscriptionPlans, { fields: [saasSchoolSubscriptions.planId], references: [saasSubscriptionPlans.id] }),
  payments: many(saasSubscriptionPayments),
}));

export const saasSubscriptionPaymentsRelations = relations(saasSubscriptionPayments, ({ one }) => ({
  school: one(schools, { fields: [saasSubscriptionPayments.schoolId], references: [schools.id] }),
  subscription: one(saasSchoolSubscriptions, { fields: [saasSubscriptionPayments.subscriptionId], references: [saasSchoolSubscriptions.id] }),
}));

export const saasOnboardingSessionsRelations = relations(saasOnboardingSessions, ({ one }) => ({
  school: one(schools, { fields: [saasOnboardingSessions.schoolId], references: [schools.id] }),
}));

// ════════════════════════════════════════════════════════════════
// MILESTONE 29 — Billing Automation, Invoices & Entitlements
// ════════════════════════════════════════════════════════════════

// ── Table: saas_coupons ───────────────────────────────────────
// Promotional discount codes for subscription checkout
export const saasCoupons = pgTable(
  "saas_coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    discountType: varchar("discount_type", { length: 20 }).notNull().default("percentage"), // percentage | fixed
    discountValue: doublePrecision("discount_value").notNull(), // e.g., 20 = 20% or NGN 5000
    maxRedemptions: integer("max_redemptions"),
    redemptionsCount: integer("redemptions_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    couponCodeIdx: uniqueIndex("idx_saas_coupon_code").on(table.code),
    couponActiveIdx: index("idx_saas_coupon_active").on(table.isActive),
  })
);

// ── Table: saas_invoices ───────────────────────────────────────
// Tax invoices generated for every termly subscription payment
export const saasInvoices = pgTable(
  "saas_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => saasSchoolSubscriptions.id),
    paymentId: uuid("payment_id").references(() => saasSubscriptionPayments.id),
    subtotal: doublePrecision("subtotal").notNull(),
    discountAmount: doublePrecision("discount_amount").notNull().default(0),
    taxAmount: doublePrecision("tax_amount").notNull().default(0),
    totalAmount: doublePrecision("total_amount").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("NGN"),
    status: varchar("status", { length: 30 }).notNull().default("paid"), // paid | unpaid | refunded | void
    billingPeriod: varchar("billing_period", { length: 20 }).notNull().default("TERM"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceNumberIdx: uniqueIndex("idx_saas_invoice_number").on(table.invoiceNumber),
    schoolInvoiceIdx: index("idx_saas_invoice_school").on(table.schoolId),
    subscriptionInvoiceIdx: index("idx_saas_invoice_subscription").on(table.subscriptionId),
  })
);

// ── Table: saas_subscription_usages ─────────────────────────
// Usage tracking (student count, storage, API usage) for entitlement enforcement
export const saasSubscriptionUsages = pgTable(
  "saas_subscription_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    activeStudentsCount: integer("active_students_count").notNull().default(0),
    maxStudentsLimit: integer("max_students_limit").notNull().default(200),
    gracePeriodEndsAt: timestamp("grace_period_ends_at", { withTimezone: true }),
    isGracePeriodActive: boolean("is_grace_period_active").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolUsageIdx: uniqueIndex("idx_saas_usage_school").on(table.schoolId),
  })
);

// ── Milestone 29 Relations ─────────────────────────────────────
export const saasInvoicesRelations = relations(saasInvoices, ({ one }) => ({
  school: one(schools, { fields: [saasInvoices.schoolId], references: [schools.id] }),
  subscription: one(saasSchoolSubscriptions, { fields: [saasInvoices.subscriptionId], references: [saasSchoolSubscriptions.id] }),
  payment: one(saasSubscriptionPayments, { fields: [saasInvoices.paymentId], references: [saasSubscriptionPayments.id] }),
}));

export const saasSubscriptionUsagesRelations = relations(saasSubscriptionUsages, ({ one }) => ({
  school: one(schools, { fields: [saasSubscriptionUsages.schoolId], references: [schools.id] }),
}));

// ════════════════════════════════════════════════════════════════
// MILESTONE 30 — Inventory Management & Fixed Assets
// ════════════════════════════════════════════════════════════════

// ── Table: inventory_items ──────────────────────────────────────
export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).notNull().default("General"), // Stationery, Chemicals, ICT, Books, Uniforms, Cleaning, Sports, Office
    unit: varchar("unit", { length: 50 }).notNull().default("pcs"), // pcs, boxes, reams, kg, liters, sets
    sku: varchar("sku", { length: 100 }),
    currentQuantity: integer("current_quantity").notNull().default(0),
    minimumQuantity: integer("minimum_quantity").notNull().default(10), // Low stock alert threshold
    unitCost: doublePrecision("unit_cost").notNull().default(0),
    totalStockValue: doublePrecision("total_stock_value").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolInventoryIdx: index("idx_inventory_school").on(table.schoolId),
    categoryIdx: index("idx_inventory_category").on(table.schoolId, table.category),
    skuIdx: index("idx_inventory_sku").on(table.schoolId, table.sku),
    lowStockIdx: index("idx_inventory_low_stock").on(table.schoolId, table.currentQuantity, table.minimumQuantity),
  })
);

// ── Table: inventory_transactions ──────────────────────────────
export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    transactionType: varchar("transaction_type", { length: 30 }).notNull(), // stock_in, stock_out, adjustment, opening_balance
    quantity: integer("quantity").notNull(),
    unitCost: doublePrecision("unit_cost").notNull().default(0),
    resultingBalance: integer("resulting_balance").notNull(),
    reference: varchar("reference", { length: 255 }), // PO-1001, MANUAL, ADJUSTMENT
    reason: text("reason"),
    performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolTxIdx: index("idx_inventory_tx_school").on(table.schoolId),
    itemTxIdx: index("idx_inventory_tx_item").on(table.schoolId, table.inventoryItemId),
    txDateIdx: index("idx_inventory_tx_date").on(table.schoolId, table.createdAt),
  })
);

// ── Table: suppliers ───────────────────────────────────────────
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    contactPerson: varchar("contact_person", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    taxNumber: varchar("tax_number", { length: 100 }),
    status: varchar("status", { length: 30 }).notNull().default("active"), // active, inactive
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolSupplierIdx: index("idx_supplier_school").on(table.schoolId),
    supplierNameIdx: index("idx_supplier_name").on(table.schoolId, table.name),
  })
);

// ── Table: purchase_orders ─────────────────────────────────────
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    orderNumber: varchar("order_number", { length: 100 }).notNull(),
    orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
    expectedDeliveryDate: timestamp("expected_delivery_date", { withTimezone: true }),
    status: varchar("status", { length: 30 }).notNull().default("draft"), // draft, pending_approval, approved, received, cancelled
    subtotal: doublePrecision("subtotal").notNull().default(0),
    taxAmount: doublePrecision("tax_amount").notNull().default(0),
    totalAmount: doublePrecision("total_amount").notNull().default(0),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolPoIdx: index("idx_po_school").on(table.schoolId),
    poNumberIdx: uniqueIndex("idx_po_number").on(table.schoolId, table.orderNumber),
    poStatusIdx: index("idx_po_status").on(table.schoolId, table.status),
  })
);

// ── Table: purchase_order_items ────────────────────────────────
export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    quantityOrdered: integer("quantity_ordered").notNull(),
    quantityReceived: integer("quantity_received").notNull().default(0),
    unitPrice: doublePrecision("unit_price").notNull(),
    totalPrice: doublePrecision("total_price").notNull(),
  },
  (table) => ({
    poItemIdx: index("idx_po_item_order").on(table.purchaseOrderId),
  })
);

// ── Table: asset_register ──────────────────────────────────────
export const assetRegister = pgTable(
  "asset_register",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    assetName: varchar("asset_name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull().default("Furniture"), // Furniture, IT Equipment, Vehicles, Buildings, Machinery, Lab Equipment
    description: text("description"),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull().defaultNow(),
    purchaseCost: doublePrecision("purchase_cost").notNull(),
    usefulLifeYears: integer("useful_life_years").notNull().default(5),
    depreciationMethod: varchar("depreciation_method", { length: 50 }).notNull().default("straight_line"), // straight_line
    accumulatedDepreciation: doublePrecision("accumulated_depreciation").notNull().default(0),
    currentBookValue: doublePrecision("current_book_value").notNull(),
    residualValue: doublePrecision("residual_value").notNull().default(0),
    location: varchar("location", { length: 255 }),
    assignedDepartment: varchar("assigned_department", { length: 255 }),
    assignedStaffId: uuid("assigned_staff_id").references(() => users.id, { onDelete: "set null" }),
    barcode: varchar("barcode", { length: 100 }),
    qrCode: varchar("qr_code", { length: 100 }),
    status: varchar("status", { length: 30 }).notNull().default("active"), // active, in_repair, disposed, written_off
    disposalDate: timestamp("disposal_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolAssetIdx: index("idx_asset_school").on(table.schoolId),
    barcodeIdx: index("idx_asset_barcode").on(table.schoolId, table.barcode),
    qrCodeIdx: index("idx_asset_qr").on(table.schoolId, table.qrCode),
    assetCategoryIdx: index("idx_asset_category").on(table.schoolId, table.category),
  })
);

// ── Milestone 30 Relations ─────────────────────────────────────
export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  school: one(schools, { fields: [inventoryItems.schoolId], references: [schools.id] }),
  transactions: many(inventoryTransactions),
  poItems: many(purchaseOrderItems),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  school: one(schools, { fields: [inventoryTransactions.schoolId], references: [schools.id] }),
  item: one(inventoryItems, { fields: [inventoryTransactions.inventoryItemId], references: [inventoryItems.id] }),
  user: one(users, { fields: [inventoryTransactions.performedBy], references: [users.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  school: one(schools, { fields: [suppliers.schoolId], references: [schools.id] }),
  purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  school: one(schools, { fields: [purchaseOrders.schoolId], references: [schools.id] }),
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  creator: one(users, { fields: [purchaseOrders.createdBy], references: [users.id] }),
  approver: one(users, { fields: [purchaseOrders.approvedBy], references: [users.id] }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.purchaseOrderId], references: [purchaseOrders.id] }),
  inventoryItem: one(inventoryItems, { fields: [purchaseOrderItems.inventoryItemId], references: [inventoryItems.id] }),
}));

export const assetRegisterRelations = relations(assetRegister, ({ one }) => ({
  school: one(schools, { fields: [assetRegister.schoolId], references: [schools.id] }),
  assignedStaff: one(users, { fields: [assetRegister.assignedStaffId], references: [users.id] }),
}));

// ════════════════════════════════════════════════════════════════
// MILESTONE 31 — Data Portability & Self-Service Export
// ════════════════════════════════════════════════════════════════

// ── Table: data_exports ─────────────────────────────────────────
export const dataExports = pgTable(
  "data_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    format: varchar("format", { length: 20 }).notNull().default("csv"), // csv, excel, zip
    status: varchar("status", { length: 30 }).notNull().default("QUEUED"), // QUEUED, PROCESSING, COMPLETED, FAILED, EXPIRED
    progress: integer("progress").notNull().default(0), // 0 to 100
    fileReference: text("file_reference"), // local path or cloud key
    fileSize: integer("file_size").notNull().default(0), // bytes
    recordCount: integer("record_count").notNull().default(0),
    datasets: jsonb("datasets"), // ["students", "scores", "attendance", "finance", "staff"]
    errorMessage: text("error_message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolExportIdx: index("idx_export_school").on(table.schoolId),
    schoolStatusIdx: index("idx_export_school_status").on(table.schoolId, table.status),
    schoolCreatedIdx: index("idx_export_school_created").on(table.schoolId, table.createdAt),
  })
);

// ── Milestone 31 Relations ─────────────────────────────────────
export const dataExportsRelations = relations(dataExports, ({ one }) => ({
  school: one(schools, { fields: [dataExports.schoolId], references: [schools.id] }),
  requester: one(users, { fields: [dataExports.requestedBy], references: [users.id] }),
}));

// ════════════════════════════════════════════════════════════════
// MILESTONE 32 — Multi-Branch / School Group Support
// ════════════════════════════════════════════════════════════════

// ── Table: school_groups ────────────────────────────────────────
export const schoolGroups = pgTable(
  "school_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    subscriptionId: uuid("subscription_id").references(() => saasSchoolSubscriptions.id, { onDelete: "set null" }),
    maxBranchesLimit: integer("max_branches_limit").notNull().default(5),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupSlugIdx: uniqueIndex("idx_group_slug").on(table.slug),
  })
);

// ── Table: group_memberships ────────────────────────────────────
export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => schoolGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("group_admin"), // group_admin, group_auditor, group_finance_officer
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupMemberIdx: uniqueIndex("idx_group_member_user").on(table.groupId, table.userId),
  })
);

// ── Milestone 33: Data Privacy & NDPR Compliance ─────────────────────────────

// ── Table: privacy_consents ──────────────────────────────────────────────────
export const privacyConsents = pgTable(
  "privacy_consents",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    schoolId:       uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    dataSubjectId:  uuid("data_subject_id"),           // user_id or student_id (nullable)
    subjectType:    varchar("subject_type", { length: 50 }).notNull().default("student"), // 'student' | 'staff' | 'parent'
    dataCategory:   varchar("data_category", { length: 100 }).notNull(), // 'medical' | 'financial' | 'biometric' | 'academic'
    legalBasis:     varchar("legal_basis", { length: 100 }).notNull().default("consent"), // 'consent' | 'legitimate_interest' | 'legal_obligation'
    status:         varchar("status", { length: 50 }).notNull().default("active"), // 'active' | 'withdrawn' | 'expired'
    consentText:    text("consent_text"),
    grantedAt:      timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt:      timestamp("expires_at", { withTimezone: true }),
    withdrawnAt:    timestamp("withdrawn_at", { withTimezone: true }),
    ipAddress:      varchar("ip_address", { length: 100 }),
    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolIdx:    index("idx_privacy_consents_school").on(table.schoolId),
    subjectIdx:   index("idx_privacy_consents_subject").on(table.schoolId, table.dataSubjectId),
    categoryIdx:  index("idx_privacy_consents_category").on(table.schoolId, table.dataCategory),
  })
);

export const privacyConsentsRelations = relations(privacyConsents, ({ one }) => ({
  school: one(schools, { fields: [privacyConsents.schoolId], references: [schools.id] }),
}));

// ── Table: data_retention_policies ──────────────────────────────────────────
export const dataRetentionPolicies = pgTable(
  "data_retention_policies",
  {
    id:                  uuid("id").primaryKey().defaultRandom(),
    schoolId:            uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    dataCategory:        varchar("data_category", { length: 100 }).notNull(), // 'student_records' | 'attendance' | 'financial' | 'medical' | 'cbt_results'
    retentionYears:      integer("retention_years").notNull().default(7),
    autoFlagExpired:     boolean("auto_flag_expired").notNull().default(true),
    autoDeleteEnabled:   boolean("auto_delete_enabled").notNull().default(false), // never auto-delete without explicit admin action
    legalBasisNote:      text("legal_basis_note"),
    createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolCategoryUnique: uniqueIndex("idx_retention_school_category").on(table.schoolId, table.dataCategory),
    schoolIdx:            index("idx_retention_school").on(table.schoolId),
  })
);

export const dataRetentionPoliciesRelations = relations(dataRetentionPolicies, ({ one }) => ({
  school: one(schools, { fields: [dataRetentionPolicies.schoolId], references: [schools.id] }),
}));

// ── Table: data_subject_requests ─────────────────────────────────────────────
export const dataSubjectRequests = pgTable(
  "data_subject_requests",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    schoolId:         uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    requesterEmail:   varchar("requester_email", { length: 255 }).notNull(),
    requesterName:    varchar("requester_name", { length: 255 }),
    requestType:      varchar("request_type", { length: 50 }).notNull().default("access"), // 'access' | 'deletion' | 'portability' | 'correction'
    dataCategories:   text("data_categories").array(),
    subjectId:        uuid("subject_id"),              // optional: user_id or student_id if known
    status:           varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'under_review' | 'completed' | 'rejected'
    adminNotes:       text("admin_notes"),
    reviewedBy:       uuid("reviewed_by").references(() => users.id),
    reviewedAt:       timestamp("reviewed_at", { withTimezone: true }),
    responseSent:     boolean("response_sent").notNull().default(false),
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolIdx:  index("idx_dsr_school").on(table.schoolId),
    statusIdx:  index("idx_dsr_status").on(table.schoolId, table.status),
    emailIdx:   index("idx_dsr_email").on(table.schoolId, table.requesterEmail),
  })
);

export const dataSubjectRequestsRelations = relations(dataSubjectRequests, ({ one }) => ({
  school:     one(schools, { fields: [dataSubjectRequests.schoolId], references: [schools.id] }),
  reviewer:   one(users,   { fields: [dataSubjectRequests.reviewedBy], references: [users.id] }),
}));

// ── Milestone 32 Relations ─────────────────────────────────────
export const schoolGroupsRelations = relations(schoolGroups, ({ one, many }) => ({
  owner: one(users, { fields: [schoolGroups.ownerUserId], references: [users.id] }),
  subscription: one(saasSchoolSubscriptions, { fields: [schoolGroups.subscriptionId], references: [saasSchoolSubscriptions.id] }),
  branches: many(schools),
  memberships: many(groupMemberships),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(schoolGroups, { fields: [groupMemberships.groupId], references: [schoolGroups.id] }),
  user: one(users, { fields: [groupMemberships.userId], references: [users.id] }),
}));// ── Enums (New) ────────────────────────────────────────────────
export const guardianRelationshipEnum = pgEnum("guardian_relationship", ["father", "mother", "guardian", "other"]);

// ── Table: admission_applications ───────────────────────────────
export const admissionApplications = pgTable(
  "admission_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    applicationReference: varchar("application_reference", { length: 50 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }).notNull(),
    gender: genderEnum("gender").notNull(),
    nationality: varchar("nationality", { length: 100 }).default("Nigerian"),
    currentSchool: varchar("current_school", { length: 200 }),
    previousAcademicInfo: text("previous_academic_info"),
    desiredClassId: uuid("desired_class_id").references(() => classes.id, { onDelete: "set null" }),
    desiredSession: varchar("desired_session", { length: 50 }),
    desiredTermId: uuid("desired_term_id").references(() => terms.id, { onDelete: "set null" }),
    guardianName: varchar("guardian_name", { length: 200 }).notNull(),
    guardianRelationship: guardianRelationshipEnum("guardian_relationship").notNull().default("guardian"),
    guardianEmail: varchar("guardian_email", { length: 255 }).notNull(),
    guardianPhone: varchar("guardian_phone", { length: 50 }).notNull(),
    guardianAddress: text("guardian_address"),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    source: varchar("source", { length: 100 }).default("online"),
    rejectionReason: text("rejection_reason"),
    waitlistReason: text("waitlist_reason"),
    internalNotes: text("internal_notes"),
    consentRecorded: boolean("consent_recorded").notNull().default(false),
    paymentRequired: boolean("payment_required").notNull().default(false),
    paymentVerified: boolean("payment_verified").notNull().default(false),
    paymentReference: varchar("payment_reference", { length: 200 }),
    applicationFeeAmount: integer("application_fee_amount").default(0),
    acceptanceFeeRequired: boolean("acceptance_fee_required").notNull().default(false),
    acceptanceFeeVerified: boolean("acceptance_fee_verified").notNull().default(false),
    acceptanceFeeReference: varchar("acceptance_fee_reference", { length: 200 }),
    acceptanceFeeAmount: integer("acceptance_fee_amount").default(0),
    interviewDate: timestamp("interview_date", { withTimezone: true }),
    interviewLocation: varchar("interview_location", { length: 255 }),
    interviewNotes: text("interview_notes"),
    interviewScore: integer("interview_score"),
    entranceExamScore: integer("entrance_exam_score"),
    cbtExamId: uuid("cbt_exam_id").references(() => cbtExams.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    decisionAt: timestamp("decision_at", { withTimezone: true }),
    decisionBy: uuid("decision_by").references(() => users.id, { onDelete: "set null" }),
    convertedStudentId: uuid("converted_student_id").references(() => students.id, { onDelete: "set null" }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    convertedBy: uuid("converted_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schoolIdx: index("idx_admission_school").on(table.schoolId),
    referenceIdx: uniqueIndex("idx_admission_reference_school").on(table.schoolId, table.applicationReference),
    globalReferenceIdx: uniqueIndex("idx_admission_reference_global").on(table.applicationReference),
    statusIdx: index("idx_admission_status").on(table.schoolId, table.status),
    guardianEmailIdx: index("idx_admission_guardian_email").on(table.schoolId, table.guardianEmail),
    nameDobIdx: index("idx_admission_name_dob").on(table.schoolId, table.firstName, table.lastName, table.dateOfBirth),
  })
);

export const admissionApplicationsRelations = relations(admissionApplications, ({ one, many }) => ({
  school: one(schools, { fields: [admissionApplications.schoolId], references: [schools.id] }),
  desiredClass: one(classes, { fields: [admissionApplications.desiredClassId], references: [classes.id] }),
  desiredTerm: one(terms, { fields: [admissionApplications.desiredTermId], references: [terms.id] }),
  reviewedBy: one(users, { fields: [admissionApplications.reviewedBy], references: [users.id] }),
  decisionBy: one(users, { fields: [admissionApplications.decisionBy], references: [users.id] }),
  convertedStudent: one(students, { fields: [admissionApplications.convertedStudentId], references: [students.id] }),
  convertedBy: one(users, { fields: [admissionApplications.convertedBy], references: [users.id] }),
  documents: many(admissionDocuments),
}));

// ── Table: admission_documents ────────────────────────────────
export const admissionDocuments = pgTable(
  "admission_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 100 }).notNull(),
    fileName: varchar("file_name", { length: 500 }).notNull(),
    storagePath: varchar("storage_path", { length: 1000 }).notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: varchar("mime_type", { length: 100 }),
    verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("pending"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    applicationIdx: index("idx_adoc_application").on(table.applicationId),
    schoolIdx: index("idx_adoc_school").on(table.schoolId),
  })
);

export const admissionDocumentsRelations = relations(admissionDocuments, ({ one }) => ({
  application: one(admissionApplications, { fields: [admissionDocuments.applicationId], references: [admissionApplications.id] }),
  school: one(schools, { fields: [admissionDocuments.schoolId], references: [schools.id] }),
  verifiedBy: one(users, { fields: [admissionDocuments.verifiedBy], references: [users.id] }),
}));

// ── Table: saas_platform_operators ────────────────────────────
// Platform Operators — separate from school tenancies
export const saasPlatformOperators = pgTable(
  "saas_platform_operators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: varchar("role", { length: 50 }).notNull().default("platform_operator"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operatorUserIdx: index("idx_saas_operator_user").on(table.userId),
    operatorEmailIdx: index("idx_saas_operator_email").on(table.email),
  })
);

