import { describe, it, expect, beforeAll } from "vitest";
import {
  getTeacherHomeOverview,
  createMessageThread,
  sendMessage,
  listUserThreads,
  getThreadMessages,
  db,
  schools,
  users,
  students,
  studentGuardians,
} from "../index";

describe("Milestone 11: Teacher Portal & Scoped Messaging Tests", () => {
  let schoolId: string;
  let teacherId: string;
  let parentId: string;
  let studentId: string;
  let unrelatedParentId: string;

  beforeAll(async () => {
    // 1. Provision test tenant school
    const [sch] = await db
      .insert(schools)
      .values({ name: "Teacher Portal Academy", slug: `tp-sch-${Date.now()}` })
      .returning();
    schoolId = sch.id;

    // 2. Provision Teacher
    const [tcher] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `teacher-${Date.now()}@tp.edu`,
        role: "teacher",
        firstName: "Grace",
        lastName: "Hopper",
      })
      .returning();
    teacherId = tcher.id;

    // 3. Provision Student
    const [st] = await db
      .insert(students)
      .values({
        schoolId,
        admissionNumber: `TP-STU-${Date.now()}`,
        firstName: "Billy",
        lastName: "Elliot",
      })
      .returning();
    studentId = st.id;

    // 4. Provision Linked Parent & Guardian Link
    const [prnt] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `parent-${Date.now()}@tp.edu`,
        role: "parent",
        firstName: "Arthur",
        lastName: "Elliot",
      })
      .returning();
    parentId = prnt.id;

    await db.insert(studentGuardians).values({
      schoolId,
      studentId,
      parentId,
      relationship: "Father",
    });

    // 5. Provision Unrelated Parent (NOT linked as guardian to studentId)
    const [unrelPrnt] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId,
        email: `unrelated-${Date.now()}@tp.edu`,
        role: "parent",
        firstName: "Charles",
        lastName: "Stranger",
      })
      .returning();
    unrelatedParentId = unrelPrnt.id;
  }, 30000);

  it("fetches unified teacher home overview without errors", async () => {
    const overview = await getTeacherHomeOverview(schoolId, teacherId);

    expect(overview).toBeDefined();
    expect(overview.todayTimetableCount).toBeDefined();
    expect(overview.assignedClassesCount).toBeDefined();
    expect(overview.unreadMessagesCount).toBe(0);
  });

  it("verifies parent guardian relationship check when creating message thread", async () => {
    // Attempting to message an UNRELATED parent MUST throw an authorization error!
    await expect(
      createMessageThread({
        schoolId,
        teacherId,
        parentId: unrelatedParentId,
        studentId,
        subject: "Behavioral Inquiry",
        initialMessage: "Hello Mr. Stranger",
      })
    ).rejects.toThrow("Unauthorized: Parent is not linked as a guardian to this student.");

    // Messaging a LINKED parent succeeds!
    const validThread = await createMessageThread({
      schoolId,
      teacherId,
      parentId,
      studentId,
      subject: "Mathematics Progress",
      initialMessage: "Billy is doing great in algebra!",
    });

    expect(validThread.id).toBeDefined();
    expect(validThread.teacherId).toBe(teacherId);
    expect(validThread.parentId).toBe(parentId);
  });

  it("enforces thread access controls and updates read status on message retrieval", async () => {
    // 1. Create message thread
    const thread = await createMessageThread({
      schoolId,
      teacherId,
      parentId,
      studentId,
      subject: "Science Project",
      initialMessage: "Please check Billy's science project materials.",
    });

    // 2. Parent sends reply
    await sendMessage({
      schoolId,
      threadId: thread.id,
      senderId: parentId,
      content: "Thank you, I will buy the required materials today.",
    });

    // 3. Unrelated user attempting to read thread MUST be rejected!
    await expect(getThreadMessages(schoolId, thread.id, unrelatedParentId)).rejects.toThrow(
      "Unauthorized: You do not have access to this conversation thread."
    );

    // 4. Authorized teacher reads thread — verifies read receipt update
    const res = await getThreadMessages(schoolId, thread.id, teacherId);
    expect(res.messages.length).toBe(2);
    expect(res.messages[1].content).toBe("Thank you, I will buy the required materials today.");
    expect(res.messages[1].isRead).toBe(true); // Automatically updated to read
  });
});
