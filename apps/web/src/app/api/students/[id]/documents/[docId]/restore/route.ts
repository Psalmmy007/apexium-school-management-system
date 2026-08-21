import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, getValidUserIdForAudit } from "@/lib/auth/session";
import { db, studentDocuments, studentActivityTimeline } from "@apexium/db";
import { eq, and } from "drizzle-orm";
import { canPerformAction } from "@/lib/auth/rbac";

/**
 * POST /api/students/[id]/documents/[docId]/restore
 * Restores a soft-deleted student document (isDeleted=false).
 * Logs document_restoration event to timeline.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "restore_document")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { id: studentId, docId } = params;

  try {
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

    if (!doc.isDeleted) {
      return NextResponse.json({ success: false, error: "Document is active and not deleted." }, { status: 400 });
    }

    const auditUserId = await getValidUserIdForAudit(user.id);

    // Restore document
    const [restored] = await db
      .update(studentDocuments)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        updatedAt: new Date(),
      })
      .where(eq(studentDocuments.id, docId))
      .returning();

    // Log document_restoration event to timeline
    await db.insert(studentActivityTimeline).values({
      schoolId: user.schoolId,
      studentId,
      performedBy: auditUserId,
      eventType: "document_restoration",
      description: `Restored soft-deleted document "${doc.title}" (${doc.documentType.replace(/_/g, " ")})`,
      metadata: {
        documentId: docId,
        title: doc.title,
        documentType: doc.documentType,
        restoredBy: auditUserId,
      },
    });

    return NextResponse.json({
      success: true,
      data: restored,
      message: `Document "${doc.title}" restored successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to restore document" },
      { status: 500 }
    );
  }
}
