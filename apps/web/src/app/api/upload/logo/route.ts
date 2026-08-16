import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { validateUploadBuffer } from "@/lib/security/upload-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "platform_operator")) {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No image file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Hardened upload validation: JPEG, PNG, WEBP, SVG, max 5MB
    const validation = validateUploadBuffer(
      buffer,
      file.name,
      file.type || "image/png",
      5 * 1024 * 1024
    );

    if (!validation.isValid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const mimeType = validation.mimeType;
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json(
      {
        success: true,
        url: dataUrl,
        fileHash: validation.fileHash,
        fileName: validation.sanitizedFileName,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed uploading school logo." },
      { status: 500 }
    );
  }
}
