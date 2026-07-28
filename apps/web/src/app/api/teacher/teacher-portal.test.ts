import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  students,
  studentGuardians,
  createMessageThread,
  getThreadMessages,
  getTeacherHomeOverview,
} from "@apexium/db";

describe("Milestone 11: Teacher Portal API & Guardian Authorization Tests", () => {
  let schoolId: string;
  let teacherId: string;
  let parentId: string;
  let studentId: string;
  let unrelatedParentId: string;

  beforeAll(async () => {
    const [sch] = await db.insert(schools).values({ name: "TP Web API Academy", slug: `tp-api-${Date.now()}` }).returning();
    schoolId = sch.id;

    const [tcher] = await db.insert(users).values({
      id: crypto.randomUUID(),
      schoolId,
      email: `tcher-${Date.now()}@tp.edu`,
      role: "teacher",
      firstName: "Ada",
      lastName: "Lovelace",
    }).returning();
    teacherId = tcher.id;

    const [st] = await db.insert(students).values({
      schoolId,
      admissionNumber: `TP-API-STU-${Date.now()}`,
      firstName: "James",
      lastName: "Gosling",
    }).returning();
    studentId = st.id;

    const [prnt] = await db.insert(users).values({
      id: crypto.randomUUID(),
      schoolId,
      email: `prnt-${Date.now()}@tp.edu`,
      role: "parent",
      firstName: "Father",
      lastName: "Gosling",
    }).returning();
    parentId = prnt.id;

    await db.insert(studentGuardians).values({
      schoolId,
      studentId,
      parentId,
      relationship: "Father",
    });

    const [unrel] = await db.insert(users).values({
      id: crypto.randomUUID(),
      schoolId,
      email: `unrel-${Date.now()}@tp.edu`,
      role: "parent",
      firstName: "Unrelated",
      lastName: "Parent",
    }).returning();
    unrelatedParentId = unrel.id;
  }, 30000);

  it("verifies unified teacher home overview metrics and parent relationship messaging authorization", async () => {
    // 1. Fetch Overview
    const overview = await getTeacherHomeOverview(schoolId, teacherId);
    expect(overview).toBeDefined();
    expect(overview.unreadMessagesCount).toBe(0);

    // 2. Creating thread with linked parent succeeds
    const thread = await createMessageThread({
      schoolId,
      teacherId,
      parentId,
      studentId,
      subject: "Academic Update",
      initialMessage: "James is excelling in Java programming.",
    });
    expect(thread.id).toBeDefined();

    // 3. Verifies authorized parent can access messages
    const threadData = await getThreadMessages(schoolId, thread.id, parentId);
    expect(threadData.messages.length).toBe(1);

    // 4. Verifies unauthorized parent cannot access message thread
    await expect(getThreadMessages(schoolId, thread.id, unrelatedParentId)).rejects.toThrow("Unauthorized");
  });
});
