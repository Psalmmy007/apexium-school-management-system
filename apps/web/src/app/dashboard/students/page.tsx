import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db, students, classes, sections } from "@apexium/db";
import { eq, and, desc } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Students Roster",
};

export default async function StudentsListPage() {
  const user = await getSessionUser();
  if (user?.role === "student") {
    redirect("/dashboard/student");
  }
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    redirect("/dashboard");
  }

  // Fetch all students for the user's school
  const studentList = await db
    .select({
      id: students.id,
      admissionNumber: students.admissionNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      middleName: students.middleName,
      gender: students.gender,
      photoUrl: students.photoUrl,
      status: students.status,
      className: classes.name,
      sectionName: sections.name,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .leftJoin(sections, eq(students.sectionId, sections.id))
    .where(eq(students.schoolId, user.schoolId))
    .orderBy(desc(students.createdAt));

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Information System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage student biodata, class assignments, and guardian links.
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

      {/* Roster Table / Empty state */}
      {studentList.length === 0 ? (
        <div
          id="empty-roster-state"
          className="card flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800">
            No students registered yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            Get started by adding your first student manually or importing a class roster.
          </p>
          {user.role === "admin" && (
            <Link href="/dashboard/students/new" className="btn-primary">
              Add First Student
            </Link>
          )}
        </div>
      ) : (
        <div id="students-table-container" className="table-container">
          <table id="students-table" className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class / Section</th>
                <th>Gender</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentList.map((student) => (
                <tr key={student.id} id={`student-row-${student.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm flex-shrink-0">
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 leading-none">
                          {student.lastName}, {student.firstName}{" "}
                          {student.middleName ? `${student.middleName.charAt(0)}.` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-600">
                    {student.admissionNumber}
                  </td>
                  <td>
                    {student.className ? (
                      <span className="text-slate-700 font-medium">
                        {student.className}
                        {student.sectionName ? ` — ${student.sectionName}` : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="capitalize text-slate-600">
                    {student.gender || "—"}
                  </td>
                  <td>
                    <span
                      className={
                        student.status === "active"
                          ? "badge-success"
                          : student.status === "inactive"
                          ? "badge-danger"
                          : "badge-neutral"
                      }
                    >
                      {student.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        id={`view-student-${student.id}`}
                        className="btn-ghost btn-sm"
                      >
                        View
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href={`/dashboard/students/${student.id}/edit`}
                          id={`edit-student-${student.id}`}
                          className="btn-secondary btn-sm"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
