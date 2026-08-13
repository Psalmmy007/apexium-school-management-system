import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import {
  configureAcademicSessionAndTerms,
  configureClassesAndDepartments,
  provisionTeachersAndStaff,
  provisionStudentsAndClassAssignments,
  assignDefaultRolesAndPermissions,
} from "@apexium/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    return NextResponse.json(
      { error: "No active school tenant context found to configure." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { sessionName, classNames, departmentNames, teachers, students } = body;

    const { session, terms } = await configureAcademicSessionAndTerms(
      schoolId,
      sessionName || "2025/2026"
    );

    const { classes, departments } = await configureClassesAndDepartments(
      schoolId,
      classNames,
      departmentNames
    );

    // Default or user-provided teachers
    const staffToProvision = teachers || [
      { name: "John Doe", email: `teacher1-${Date.now()}@apexium.edu`, subject: "Mathematics" },
      { name: "Jane Smith", email: `teacher2-${Date.now()}@apexium.edu`, subject: "English Language" },
    ];

    const provisionedStaff = await provisionTeachersAndStaff(
      schoolId,
      staffToProvision
    );

    // Default or user-provided students
    const studentsToProvision = students || [
      { firstName: "Emmanuel", lastName: "Adeyemi", admissionNumber: `ADM-${Date.now()}-01`, gender: "male" as const },
      { firstName: "Fatima", lastName: "Bello", admissionNumber: `ADM-${Date.now()}-02`, gender: "female" as const },
    ];

    const provisionedStudents = await provisionStudentsAndClassAssignments(
      schoolId,
      studentsToProvision
    );

    const rolesSummary = await assignDefaultRolesAndPermissions(schoolId);

    return NextResponse.json({
      success: true,
      message: "Setup Wizard execution completed successfully.",
      summary: {
        session,
        termsCount: terms.length,
        classesCount: classes.length,
        departmentsCount: departments.length,
        teachersCount: provisionedStaff.length,
        studentsCount: provisionedStudents.length,
        rolesAssigned: rolesSummary.length,
      },
    });
  } catch (error: any) {
    console.error("Setup wizard error:", error);
    return NextResponse.json({ error: error.message || "Setup wizard failed" }, { status: 500 });
  }
}
