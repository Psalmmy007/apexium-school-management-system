import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createAttachmentMetadata, getAttachmentMetadata } from "@apexium/db";

// ── POST /api/lms/attachments — Create attachment metadata ──────────────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { originalFileName, mimeType, fileSize, storageProvider, storageKey } = body;

    if (!originalFileName || !mimeType || !fileSize || !storageKey) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: originalFileName, mimeType, fileSize, storageKey" },
        { status: 400 }
      );
    }

    const attachment = await createAttachmentMetadata({
      schoolId: user.schoolId,
      originalFileName,
      mimeType,
      fileSize: Number(fileSize),
      storageProvider: storageProvider || "local",
      storageKey,
      uploadedBy: user.id,
    });

    return NextResponse.json({ success: true, data: attachment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create attachment metadata" },
      { status: 500 }
    );
  }
}

// ── GET /api/lms/attachments?id=... — Fetch attachment metadata ─────────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Attachment ID is required" }, { status: 400 });
  }

  try {
    const attachment = await getAttachmentMetadata(user.schoolId, id);
    if (!attachment) {
      return NextResponse.json({ success: false, error: "Attachment not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: attachment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attachment" },
      { status: 500 }
    );
  }
}
