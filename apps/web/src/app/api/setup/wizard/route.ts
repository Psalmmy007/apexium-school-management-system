import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import {
  db,
  schools,
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

  let schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    const [firstSchool] = await db.select().from(schools).limit(1);
    if (firstSchool && isValidUUID(firstSchool.id)) {
      schoolId = firstSchool.id;
    } else {
      return NextResponse.json({ error: "No active school institution found to configure." }, { status: 400 });
    }
  }

  try {
    const body = await req.json();
    const { sessionName, classNames, departmentNames, teachers, students } = body;

    const { session, terms } = await configureAcademicSessionAndTerms(
      schoolId,
      sessionName || "2025/2026"
    );

    const { classes, departments } = await configureClassesAndDepartments(
      user.schoolId,
      classNames,
      departmentNames
    );

    // Default or user-provided teachers
    const staffToProvision = teachers || [
      { firstName: "Grace", lastName: "Okonkwo", email: `teacher.grace.${Date.now()}@school.edu.ng` },
      { firstName: "David", lastName: "Adeyemi", email: `teacher.david.${Date.now()}@school.edu.ng` },
    ];
    const createdTeachers = await provisionTeachersAndStaff(user.schoolId, staffToProvision);

    // Default or user-provided students assigned to created classes
    const defaultClassId = classes[0]?.id;
    const studentsToProvision = students || [
      { firstName: "Emmanuel", lastName: "Bello", classId: defaultClassId },
      { firstName: "Chiamaka", lastName: "Eze", classId: defaultClassId },
    ];
    const createdStudents = await provisionStudentsAndClassAssignments(user.schoolId, studentsToProvision);

    const rolesList = await assignDefaultRolesAndPermissions(user.schoolId);

    return NextResponse.json({
      success: true,
      message: "Academic structure, classes, teachers, and students configured successfully",
      session,
      terms,
      classes,
      departments,
      teachers: createdTeachers,
      students: createdStudents,
      roles: rolesList,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
