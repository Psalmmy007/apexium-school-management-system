import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createMessageThread, sendMessage, listUserThreads, getThreadMessages } from "@apexium/db";

// ── GET /api/teacher/messages — Fetch user threads or thread messages ───────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");

  try {
    if (threadId) {
      const data = await getThreadMessages(user.schoolId, threadId, user.id);
      return NextResponse.json({ success: true, data });
    }

    const threads = await listUserThreads(user.schoolId, user.id);
    return NextResponse.json({ success: true, data: threads });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch messages" },
      { status }
    );
  }
}

// ── POST /api/teacher/messages — Create Thread or Send Message ──────────────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, studentId, parentId, subject, initialMessage, threadId, content } = body;

    if (action === "create-thread") {
      if (!subject || !initialMessage) {
        return NextResponse.json(
          { success: false, error: "Subject and initialMessage are required" },
          { status: 400 }
        );
      }

      const thread = await createMessageThread({
        schoolId: user.schoolId,
        studentId,
        parentId,
        teacherId: user.id,
        subject,
        initialMessage,
      });

      return NextResponse.json({ success: true, data: thread });
    }

    if (action === "send-message") {
      if (!threadId || !content) {
        return NextResponse.json(
          { success: false, error: "threadId and content are required" },
          { status: 400 }
        );
      }

      const msg = await sendMessage({
        schoolId: user.schoolId,
        threadId,
        senderId: user.id,
        content,
      });

      return NextResponse.json({ success: true, data: msg });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Must be 'create-thread' or 'send-message'" },
      { status: 400 }
    );
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process message request" },
      { status }
    );
  }
}
