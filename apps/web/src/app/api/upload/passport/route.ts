import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { validateUploadBuffer } from "@/lib/security/upload-security";
import { canPerformAction } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "upload_document")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Hardened security validation (magic bytes, extension blocklist, max 5MB)
    const validation = validateUploadBuffer(
      buffer,
      file.name,
      file.type || "image/jpeg",
      5 * 1024 * 1024
    );

    if (!validation.isValid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const mimeType = validation.mimeType;
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileHash: validation.fileHash,
      fileName: validation.sanitizedFileName,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed uploading passport image." },
      { status: 500 }
    );
  }
}
