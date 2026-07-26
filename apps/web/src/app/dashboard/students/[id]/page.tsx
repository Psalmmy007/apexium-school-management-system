import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { db, students, classes, sections, studentGuardians, users } from "@apexium/db";
import { eq, and } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Details",
};

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    redirect("/dashboard");
  }

  const [student] = await db
    .select({
      id: students.id,
      admissionNumber: students.admissionNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      middleName: students.middleName,
      gender: students.gender,
      dateOfBirth: students.dateOfBirth,
      address: students.address,
      photoUrl: students.photoUrl,
      status: students.status,
      createdAt: students.createdAt,
      className: classes.name,
      sectionName: sections.name,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .leftJoin(sections, eq(students.sectionId, sections.id))
    .where(and(eq(students.id, params.id), eq(students.schoolId, user.schoolId)));

  if (!student) {
    notFound();
  }

  // Fetch guardians
  const guardianList = await db
    .select({
      id: studentGuardians.id,
      relationship: studentGuardians.relationship,
      isPrimary: studentGuardians.isPrimary,
      parentFirstName: users.firstName,
      parentLastName: users.lastName,
      parentEmail: users.email,
    })
    .from(studentGuardians)
    .leftJoin(users, eq(studentGuardians.parentId, users.id))
    .where(
      and(
        eq(studentGuardians.studentId, student.id),
        eq(studentGuardians.schoolId, user.schoolId)
      )
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back button & Action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/students"
          className="btn-ghost btn-sm text-slate-500"
        >
          ← Back to Students
        </Link>
        {user.role === "admin" && (
          <Link
            href={`/dashboard/students/${student.id}/edit`}
            className="btn-secondary btn-sm"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="card flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-2xl bg-indigo-100 flex items-center justify-center font-bold text-2xl text-indigo-700 shadow-sm flex-shrink-0">
          {student.firstName.charAt(0)}
          {student.lastName.charAt(0)}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h1 id="student-name-title" className="text-2xl font-bold text-slate-900">
              {student.firstName} {student.middleName || ""} {student.lastName}
            </h1>
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
          </div>

          <p className="text-sm font-mono text-slate-500">
            Admission No: {student.admissionNumber}
          </p>

          <p className="text-sm text-slate-600 font-medium pt-1">
            {student.className ? (
              <span>
                Class: {student.className}
                {student.sectionName ? ` (${student.sectionName})` : ""}
              </span>
            ) : (
              <span className="text-slate-400 italic">No class assigned</span>
            )}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biodata */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Personal Biodata
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Gender</span>
              <span className="font-medium text-slate-800 capitalize">
                {student.gender || "Not specified"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Date of Birth</span>
              <span className="font-medium text-slate-800">
                {student.dateOfBirth
                  ? new Date(student.dateOfBirth).toLocaleDateString("en-GB")
                  : "Not specified"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Residential Address</span>
              <span className="font-medium text-slate-800">
                {student.address || "Not specified"}
              </span>
            </div>
          </div>
        </div>

        {/* Guardians */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Linked Parent / Guardian
          </h3>

          {guardianList.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">
              No parent/guardian accounts linked to this student yet.
            </p>
          ) : (
            <div className="space-y-3">
              {guardianList.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {g.parentFirstName} {g.parentLastName}
                    </p>
                    <p className="text-xs text-slate-500">{g.parentEmail}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      {g.relationship}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
