import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    // Validate type & size (10MB max)
    if (!allowedMimeTypes.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Invalid file format. Allowed: PDF, Word document, PNG, JPEG." },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File exceeds 10MB size limit." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "application/pdf";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed uploading document." },
      { status: 500 }
    );
  }
}
