import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db, students, classes, sections } from "@apexium/db";
import { eq, desc } from "drizzle-orm";
import { Metadata } from "next";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { StudentRosterClient } from "./StudentRosterClient";

export const metadata: Metadata = {
  title: "Students Roster — SIS",
};

export default async function StudentsListPage() {
  const user = await getSessionUser();
  if (user?.role === "student") {
    redirect("/dashboard/student");
  }
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    redirect("/dashboard");
  }

  let studentList: any[] = [];
  let classList: Array<{ id: string; name: string }> = [];

  try {
    if (user.schoolId && user.schoolId.trim() !== "") {
      const [fetchedStudents, fetchedClasses] = await Promise.all([
        db
          .select({
            id: students.id,
            admissionNumber: students.admissionNumber,
            firstName: students.firstName,
            lastName: students.lastName,
            middleName: students.middleName,
            gender: students.gender,
            photoUrl: students.photoUrl,
            passportUrl: students.passportUrl,
            status: students.status,
            isReadOnly: students.isReadOnly,
            dateOfBirth: students.dateOfBirth,
            createdAt: students.createdAt,
            className: classes.name,
            sectionName: sections.name,
          })
          .from(students)
          .leftJoin(classes, eq(students.classId, classes.id))
          .leftJoin(sections, eq(students.sectionId, sections.id))
          .where(eq(students.schoolId, user.schoolId))
          .orderBy(desc(students.createdAt)),
        db
          .select({ id: classes.id, name: classes.name })
          .from(classes)
          .where(eq(classes.schoolId, user.schoolId)),
      ]);

      studentList = fetchedStudents.map((s) => ({
        ...s,
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString() : null,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
      }));
      classList = fetchedClasses;
    }
  } catch (error) {
    console.error("Failed fetching students roster:", error);
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Student Information System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student records, bulk operations, document attachments, and ID cards.
          </p>
        </div>

        {user.role === "admin" && (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/students/import"
              id="import-csv-btn"
              className="btn-secondary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>Import CSV</span>
            </Link>
            <Link
              href="/dashboard/students/new"
              id="add-student-btn"
              className="btn-primary"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span>Add Student</span>
            </Link>
          </div>
        )}
      </div>

      {/* Student Roster Client UI */}
      <StudentRosterClient
        initialStudents={studentList}
        userRole={user.role}
        classList={classList}
      />
    </div>
  );
}
