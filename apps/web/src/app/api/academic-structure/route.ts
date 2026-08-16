import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getClassesWithHierarchy,
  createAcademicSection,
  updateAcademicSection,
  createClass,
  updateClass,
  createStream,
  updateStream,
} from "@apexium/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const hierarchy = await getClassesWithHierarchy(user.schoolId);
    return NextResponse.json({ success: true, data: hierarchy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.schoolId || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === "section") {
      if (!data.name) {
        return NextResponse.json({ success: false, error: "Section name required" }, { status: 400 });
      }
      const section = await createAcademicSection(user.schoolId, data);
      return NextResponse.json({ success: true, data: section }, { status: 201 });
    }

    if (type === "class") {
      if (!data.name) {
        return NextResponse.json({ success: false, error: "Class name required" }, { status: 400 });
      }
      const cls = await createClass(user.schoolId, data);
      return NextResponse.json({ success: true, data: cls }, { status: 201 });
    }

    if (type === "stream") {
      if (!data.classId || !data.name) {
        return NextResponse.json({ success: false, error: "Class ID and Stream name required" }, { status: 400 });
      }
      const stream = await createStream(user.schoolId, data);
      return NextResponse.json({ success: true, data: stream }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: "Invalid entity type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, id, ...updates } = body;

    if (!id || !type) {
      return NextResponse.json({ success: false, error: "ID and type are required" }, { status: 400 });
    }

    if (type === "section") {
      const updated = await updateAcademicSection(user.schoolId, id, updates);
      return NextResponse.json({ success: true, data: updated });
    }

    if (type === "class") {
      const updated = await updateClass(user.schoolId, id, updates);
      return NextResponse.json({ success: true, data: updated });
    }

    if (type === "stream") {
      const updated = await updateStream(user.schoolId, id, updates);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
