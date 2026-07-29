import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    // Validate image format & size (5MB max)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Invalid file type. Only images allowed." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File exceeds 5MB size limit." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ success: true, url: dataUrl }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed uploading passport image." },
      { status: 500 }
    );
  }
}
