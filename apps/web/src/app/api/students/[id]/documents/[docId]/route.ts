import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, studentDocuments, studentActivityTimeline, students } from "@apexium/db";
import { eq, and } from "drizzle-orm";
import { canPerformAction } from "@/lib/auth/rbac";

/**
 * DELETE /api/students/[id]/documents/[docId]
 * Soft-deletes a student document (isDeleted=true, deletedAt=NOW(), deletedBy=user.id, deleteReason).
 * Never permanently deletes files. Records document_deletion event to timeline.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "delete_document")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { id: studentId, docId } = params;

  try {
    const body = await request.json().catch(() => ({}));
    const deleteReason = body.deleteReason || body.reason;

    if (!deleteReason || deleteReason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "A delete reason (minimum 3 characters) is required to soft-delete a document." },
        { status: 400 }
      );
    }

    // Verify document exists under school & student
    const [doc] = await db
      .select()
      .from(studentDocuments)
      .where(
        and(
          eq(studentDocuments.id, docId),
          eq(studentDocuments.studentId, studentId),
          eq(studentDocuments.schoolId, user.schoolId)
        )
      );

    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found." }, { status: 404 });
    }

    if (doc.isDeleted) {
      return NextResponse.json({ success: false, error: "Document is already deleted." }, { status: 400 });
    }

    // Perform soft delete
    const [updated] = await db
      .update(studentDocuments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        deleteReason: deleteReason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(studentDocuments.id, docId))
      .returning();

    // Log document_deletion event to timeline
    await db.insert(studentActivityTimeline).values({
      schoolId: user.schoolId,
      studentId,
      performedBy: user.id,
      eventType: "document_deletion",
      description: `Soft-deleted document "${doc.title}" (${doc.documentType.replace(/_/g, " ")}). Reason: ${deleteReason.trim()}`,
      metadata: {
        documentId: docId,
        title: doc.title,
        documentType: doc.documentType,
        deleteReason: deleteReason.trim(),
        deletedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Document "${doc.title}" soft-deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to soft-delete document" },
      { status: 500 }
    );
  }
}
