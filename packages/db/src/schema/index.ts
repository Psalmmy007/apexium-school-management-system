import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
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
  })
);

// ── Table: student_guardians (guardian/parent links) ──────────
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
  relationship: varchar("relationship", { length: 50 }).notNull(), // Father, Mother, Guardian, etc.
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
    date: varchar("date", { length: 10 }).notNull(), // "YYYY-MM-DD"
    period: varchar("period", { length: 50 }).notNull().default("daily"), // "daily", "morning", "period_1"
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
  })
);

// ── Relations ─────────────────────────────────────────────────
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  classes: many(classes),
  sections: many(sections),
  students: many(students),
  studentGuardians: many(studentGuardians),
  studentAttendance: many(studentAttendance),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  guardianLinks: many(studentGuardians),
  attendanceMarked: many(studentAttendance),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  sections: many(sections),
  students: many(students),
  attendance: many(studentAttendance),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  school: one(schools, {
    fields: [sections.schoolId],
    references: [schools.id],
  }),
  class: one(classes, {
    fields: [sections.classId],
    references: [classes.id],
  }),
  students: many(students),
  attendance: many(studentAttendance),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  section: one(sections, {
    fields: [students.sectionId],
    references: [sections.id],
  }),
  guardians: many(studentGuardians),
  attendance: many(studentAttendance),
}));

export const studentAttendanceRelations = relations(
  studentAttendance,
  ({ one }) => ({
    school: one(schools, {
      fields: [studentAttendance.schoolId],
      references: [schools.id],
    }),
    student: one(students, {
      fields: [studentAttendance.studentId],
      references: [students.id],
    }),
    class: one(classes, {
      fields: [studentAttendance.classId],
      references: [classes.id],
    }),
    section: one(sections, {
      fields: [studentAttendance.sectionId],
      references: [sections.id],
    }),
    marker: one(users, {
      fields: [studentAttendance.markedBy],
      references: [users.id],
    }),
  })
);
