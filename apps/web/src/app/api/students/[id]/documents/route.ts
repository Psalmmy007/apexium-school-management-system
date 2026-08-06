import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, studentDocuments, studentActivityTimeline, students } from "@apexium/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/students/[id]/documents
 * List all documents associated with a student.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher" && user.role !== "parent" && user.role !== "student")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const docs = await db
      .select()
      .from(studentDocuments)
      .where(
        and(
          eq(studentDocuments.studentId, id),
          eq(studentDocuments.schoolId, user.schoolId)
        )
      )
      .orderBy(desc(studentDocuments.createdAt));

    return NextResponse.json({ success: true, data: docs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch student documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/students/[id]/documents
 * Upload & attach a document to a student profile.
 * Body: { documentType: string, title: string, fileUrl: string, fileSize?: number, mimeType?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { documentType, title, fileUrl, fileSize, mimeType } = body;

    if (!documentType || !title || !fileUrl) {
      return NextResponse.json(
        { success: false, error: "Document type, title, and file URL are required." },
        { status: 400 }
      );
    }

    // Verify student exists & belongs to tenant
    const [student] = await db
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    const [doc] = await db
      .insert(studentDocuments)
      .values({
        schoolId: user.schoolId,
        studentId: id,
        documentType: documentType.trim(),
        title: title.trim(),
        fileUrl,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        uploadedBy: user.id,
      })
      .returning();

    // Log document upload to activity timeline
    await db.insert(studentActivityTimeline).values({
      schoolId: user.schoolId,
      studentId: id,
      performedBy: user.id,
      eventType: "document_upload",
      description: `Uploaded document: "${title}" (${documentType.replace(/_/g, " ")})`,
      metadata: {
        documentId: doc.id,
        documentType: doc.documentType,
        title: doc.title,
      },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save student document" },
      { status: 500 }
    );
  }
}
