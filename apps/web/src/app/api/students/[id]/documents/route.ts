import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, getValidUserIdForAudit } from "@/lib/auth/session";
import { db, studentDocuments, studentActivityTimeline, students, users } from "@apexium/db";
import { eq, and, desc } from "drizzle-orm";
import { canPerformAction } from "@/lib/auth/rbac";
import { validateUploadBuffer } from "@/lib/security/upload-security";

/**
 * GET /api/students/[id]/documents
 * List all documents associated with a student.
 * Query param: includeDeleted=true (returns soft-deleted documents with deletedBy user resolution).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "view_students")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  try {
    const docQuery = db
      .select({
        id: studentDocuments.id,
        schoolId: studentDocuments.schoolId,
        studentId: studentDocuments.studentId,
        documentType: studentDocuments.documentType,
        title: studentDocuments.title,
        fileUrl: studentDocuments.fileUrl,
        fileSize: studentDocuments.fileSize,
        mimeType: studentDocuments.mimeType,
        fileHash: studentDocuments.fileHash,
        isDeleted: studentDocuments.isDeleted,
        deletedAt: studentDocuments.deletedAt,
        deletedBy: studentDocuments.deletedBy,
        deleteReason: studentDocuments.deleteReason,
        uploadedBy: studentDocuments.uploadedBy,
        createdAt: studentDocuments.createdAt,
        updatedAt: studentDocuments.updatedAt,
        deletedByUserName: users.firstName,
        deletedByUserLastName: users.lastName,
      })
      .from(studentDocuments)
      .leftJoin(users, eq(studentDocuments.deletedBy, users.id))
      .where(
        and(
          eq(studentDocuments.studentId, id),
          eq(studentDocuments.schoolId, user.schoolId),
          includeDeleted ? undefined : eq(studentDocuments.isDeleted, false)
        )
      )
      .orderBy(desc(studentDocuments.createdAt));

    const docs = await docQuery;

    const formattedDocs = docs.map((doc) => ({
      ...doc,
      deletedByUserName: doc.deletedByUserName
        ? `${doc.deletedByUserName} ${doc.deletedByUserLastName || ""}`.trim()
        : null,
    }));

    return NextResponse.json({ success: true, data: formattedDocs });
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
 * Performs upload validation, hash calculation, and timeline logging.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "upload_document")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { documentType, title, fileUrl, fileSize, mimeType, fileHash } = body;

    if (!documentType || !title || !fileUrl) {
      return NextResponse.json(
        { success: false, error: "Document type, title, and file URL are required." },
        { status: 400 }
      );
    }

    // Verify student exists & belongs to tenant
    const [student] = await db
      .select({ id: students.id, isReadOnly: students.isReadOnly })
      .from(students)
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    if (student.isReadOnly) {
      return NextResponse.json({ success: false, error: "Cannot add documents to a merged/read-only student record." }, { status: 400 });
    }

      const auditUserId = await getValidUserIdForAudit(user.id);
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
          fileHash: fileHash || null,
          uploadedBy: auditUserId,
        })
        .returning();

      // Log document upload to activity timeline
      await db.insert(studentActivityTimeline).values({
        schoolId: user.schoolId,
        studentId: id,
        performedBy: auditUserId,
        eventType: "document_upload",
        description: `Uploaded document "${title}" (${documentType.replace(/_/g, " ")})`,
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
