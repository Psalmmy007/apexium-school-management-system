import {
  db,
  students,
  users,
  classes,
  libraryBooks,
  hostelRooms,
  transportRoutes,
  feeInvoices,
  feeStructures,
  cbtExams,
  lmsLessons,
  commNotifications,
} from "../index";
import { eq, and, ilike, inArray, or } from "drizzle-orm";

export interface GlobalSearchResult {
  id: string;
  type: "Student" | "Teacher" | "Class" | "Book" | "Hostel Room" | "Transport Route" | "Invoice";
  title: string;
  subtitle?: string;
  url: string;
}

// ── 1. Multi-Entity Global Search Engine ─────────────────────
export async function globalSearchEntities(schoolId: string, query: string): Promise<GlobalSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const searchPattern = `%${query.trim()}%`;
  const results: GlobalSearchResult[] = [];

  // Search Students
  const matchedStudents = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.schoolId, schoolId),
        or(
          ilike(students.firstName, searchPattern),
          ilike(students.lastName, searchPattern),
          ilike(students.admissionNumber, searchPattern)
        )
      )
    )
    .limit(5);

  for (const s of matchedStudents) {
    results.push({
      id: s.id,
      type: "Student",
      title: `${s.firstName} ${s.lastName}`,
      subtitle: `Admission: ${s.admissionNumber}`,
      url: `/dashboard/students/${s.id}`,
    });
  }

  // Search Teachers / Staff
  const matchedUsers = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.schoolId, schoolId),
        or(
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern),
          ilike(users.email, searchPattern)
        )
      )
    )
    .limit(5);

  for (const u of matchedUsers) {
    results.push({
      id: u.id,
      type: "Teacher",
      title: `${u.firstName} ${u.lastName}`,
      subtitle: `${u.role.toUpperCase()} — ${u.email}`,
      url: `/dashboard/hr`,
    });
  }

  // Search Classes
  const matchedClasses = await db
    .select()
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), ilike(classes.name, searchPattern)))
    .limit(5);

  for (const c of matchedClasses) {
    results.push({
      id: c.id,
      type: "Class",
      title: c.name,
      subtitle: `Code: ${c.code || "N/A"}`,
      url: `/dashboard/academics/structure`,
    });
  }

  // Search Library Books
  const matchedBooks = await db
    .select()
    .from(libraryBooks)
    .where(
      and(
        eq(libraryBooks.schoolId, schoolId),
        or(ilike(libraryBooks.title, searchPattern), ilike(libraryBooks.author, searchPattern))
      )
    )
    .limit(5);

  for (const b of matchedBooks) {
    results.push({
      id: b.id,
      type: "Book",
      title: b.title,
      subtitle: `Author: ${b.author}`,
      url: `/dashboard/library`,
    });
  }

  // Search Transport Routes
  const matchedRoutes = await db
    .select()
    .from(transportRoutes)
    .where(and(eq(transportRoutes.schoolId, schoolId), ilike(transportRoutes.routeName, searchPattern)))
    .limit(5);

  for (const r of matchedRoutes) {
    results.push({
      id: r.id,
      type: "Transport Route",
      title: r.routeName,
      subtitle: `Fare: ₦${r.transportFee}`,
      url: `/dashboard/transport`,
    });
  }

  return results;
}

// ── 2. Bulk Student Actions Handler ───────────────────────────
export async function executeBulkStudentActions(
  schoolId: string,
  studentIds: string[],
  action: "status_update" | "class_reassign" | "department_reassign",
  payload: { status?: "active" | "inactive" | "graduated" | "transferred" | "suspended" | "withdrawn" | "expelled" | "alumni"; classId?: string; departmentId?: string }
) {
  if (!studentIds || studentIds.length === 0) return { updatedCount: 0 };

  if (action === "status_update" && payload.status) {
    const updated = await db
      .update(students)
      .set({ status: payload.status })
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)))
      .returning();
    return { updatedCount: updated.length, updated };
  }

  if (action === "class_reassign" && payload.classId) {
    const updated = await db
      .update(students)
      .set({ classId: payload.classId })
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)))
      .returning();
    return { updatedCount: updated.length, updated };
  }

  return { updatedCount: 0 };
}

// ── 3. Module Workflow Readiness Audit ───────────────────────
export async function getModuleWorkflowStatus(schoolId: string) {
  const [studentCount] = await db.select().from(students).where(eq(students.schoolId, schoolId));
  const [classCount] = await db.select().from(classes).where(eq(classes.schoolId, schoolId));
  const [feeCount] = await db.select().from(feeStructures).where(eq(feeStructures.schoolId, schoolId));
  const [bookCount] = await db.select().from(libraryBooks).where(eq(libraryBooks.schoolId, schoolId));
  const [roomCount] = await db.select().from(hostelRooms).where(eq(hostelRooms.schoolId, schoolId));
  const [routeCount] = await db.select().from(transportRoutes).where(eq(transportRoutes.schoolId, schoolId));
  const [cbtCount] = await db.select().from(cbtExams).where(eq(cbtExams.schoolId, schoolId));
  const [lmsCount] = await db.select().from(lmsLessons).where(eq(lmsLessons.schoolId, schoolId));

  return {
    isFullyConfigured: true,
    modules: {
      students: !!studentCount,
      academics: !!classCount,
      finance: !!feeCount,
      library: !!bookCount,
      hostel: !!roomCount,
      transport: !!routeCount,
      cbt: !!cbtCount,
      lms: !!lmsCount,
    },
  };
}
