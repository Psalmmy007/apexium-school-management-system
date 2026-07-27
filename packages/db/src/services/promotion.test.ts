import { describe, it, expect, beforeAll } from "vitest";
import { executeClassPromotion } from "./promotion.js";
import { computeClassRankings } from "./ranking.js";
import { db, schools, classes, students, terms, studentScores, studentAttendance, subjects, users } from "../index.js";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

describe("Milestone 6: Promotion & Session Rollover Integration Tests", () => {
  let schoolAId: string;
  let schoolBId: string;

  let classA1Id: string; // JSS 1
  let classA2Id: string; // JSS 2
  let classBId: string;  // School B Class

  let termAId: string; // Active Term for School A
  let termBId: string; // Active Term for School B

  let subjAId: string;

  let adminAId: string;

  beforeAll(async () => {
    // 1. Create fresh test schools
    const [schA] = await db.insert(schools).values({
      name: "School A - Promotion Test",
      slug: `school-a-promo-${Date.now()}`,
    }).returning();
    schoolAId = schA.id;

    const [schB] = await db.insert(schools).values({
      name: "School B - Promotion Test",
      slug: `school-b-promo-${Date.now()}`,
    }).returning();
    schoolBId = schB.id;

    // 2. Create admin user for audit reference
    const [userA] = await db.insert(users).values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `admin-promo-${Date.now()}@apexium.edu`,
      role: "admin",
      firstName: "Admin",
      lastName: "A",
    }).returning();
    adminAId = userA.id;

    // 3. Create classes
    const [clsA1] = await db.insert(classes).values({
      schoolId: schoolAId,
      name: "JSS 1",
    }).returning();
    classA1Id = clsA1.id;

    const [clsA2] = await db.insert(classes).values({
      schoolId: schoolAId,
      name: "JSS 2",
    }).returning();
    classA2Id = clsA2.id;

    const [clsB] = await db.insert(classes).values({
      schoolId: schoolBId,
      name: "JSS 1 (School B)",
    }).returning();
    classBId = clsB.id;

    // 4. Create terms
    const [tA] = await db.insert(terms).values({
      schoolId: schoolAId,
      name: "Third Term",
      session: "2025/2026",
      isCurrent: true,
      status: "active",
      startDate: new Date(),
      endDate: new Date(),
    }).returning();
    termAId = tA.id;

    const [tB] = await db.insert(terms).values({
      schoolId: schoolBId,
      name: "Third Term",
      session: "2025/2026",
      isCurrent: true,
      status: "active",
      startDate: new Date(),
      endDate: new Date(),
    }).returning();
    termBId = tB.id;

    // 5. Create subjects
    const [sub] = await db.insert(subjects).values({
      schoolId: schoolAId,
      name: "Mathematics",
      code: `MATH-${Date.now()}`,
    }).returning();
    subjAId = sub.id;
  }, 30000);

  it("enforces strict school-level tenant isolation", async () => {
    // Create School A students
    const [stuA1] = await db.insert(students).values({
      schoolId: schoolAId,
      classId: classA1Id,
      admissionNumber: `STU-A1-${Date.now()}`,
      firstName: "Alice",
      lastName: "Smith",
      status: "active",
    }).returning();

    // Snapshot School A student's starting state for comparison after rejection
    const stuA1SnapshotClassId = stuA1.classId;
    const stuA1SnapshotStatus  = stuA1.status;

    // Create School B student
    const [stuB] = await db.insert(students).values({
      schoolId: schoolBId,
      classId: classBId,
      admissionNumber: `STU-B1-${Date.now()}`,
      firstName: "Bob",
      lastName: "Jones",
      status: "active",
    }).returning();

    // Snapshot School B state before any promotion attempt
    const stuBSnapshotClassId = stuB.classId;
    const stuBSnapshotStatus  = stuB.status;
    const [termBBefore] = await db.select().from(terms).where(eq(terms.id, termBId));
    const termBSnapshotStatus = termBBefore.status;

    // ── Attempt 1: School A admin tries to promote class including a School B student ──
    await expect(
      executeClassPromotion({
        schoolId: schoolAId,
        currentClassId: classA1Id,
        targetClassId: classA2Id,
        newSession: "2026/2027",
        studentActions: [
          { studentId: stuA1.id, action: "promote", nextClassId: classA2Id },
          { studentId: stuB.id, action: "promote", nextClassId: classA2Id }, // Cross-tenant student
        ],
      })
    ).rejects.toThrow("Tenant isolation violation: Student");

    // Explicitly verify School A's student is completely unchanged — classId AND status
    const [verifyStuA1_attempt1] = await db.select().from(students).where(eq(students.id, stuA1.id));
    expect(verifyStuA1_attempt1.classId, "School A student classId must be unchanged after rejected attempt 1").toBe(stuA1SnapshotClassId);
    expect(verifyStuA1_attempt1.status, "School A student status must be unchanged after rejected attempt 1").toBe(stuA1SnapshotStatus);

    // Verify School B student is also completely untouched after the rejection
    const [verifyStuB_attempt1] = await db.select().from(students).where(eq(students.id, stuB.id));
    expect(verifyStuB_attempt1.classId, "School B student classId must be unchanged").toBe(stuBSnapshotClassId);
    expect(verifyStuB_attempt1.status, "School B student status must be unchanged").toBe(stuBSnapshotStatus);

    // Verify School B's active term is also completely untouched
    const [termBAfter1] = await db.select().from(terms).where(eq(terms.id, termBId));
    expect(termBAfter1.status, "School B term status must be unchanged").toBe(termBSnapshotStatus);

    // ── Attempt 2: School A admin tries to specify a target class owned by School B ──
    await expect(
      executeClassPromotion({
        schoolId: schoolAId,
        currentClassId: classA1Id,
        targetClassId: classBId, // Cross-tenant target class
        newSession: "2026/2027",
        studentActions: [
          { studentId: stuA1.id, action: "promote", nextClassId: classBId },
        ],
      })
    ).rejects.toThrow("Tenant isolation violation: Target class");

    // Explicitly verify School A's student is completely unchanged after attempt 2 as well
    const [verifyStuA1_attempt2] = await db.select().from(students).where(eq(students.id, stuA1.id));
    expect(verifyStuA1_attempt2.classId, "School A student classId must be unchanged after rejected attempt 2").toBe(stuA1SnapshotClassId);
    expect(verifyStuA1_attempt2.status, "School A student status must be unchanged after rejected attempt 2").toBe(stuA1SnapshotStatus);

    // Verify School B student and classes are still completely untouched after attempt 2
    const [verifyStuB_attempt2] = await db.select().from(students).where(eq(students.id, stuB.id));
    expect(verifyStuB_attempt2.classId, "School B student classId must still be unchanged").toBe(stuBSnapshotClassId);
    expect(verifyStuB_attempt2.status, "School B student status must still be unchanged").toBe(stuBSnapshotStatus);

    // Verify School B's active term remains untouched after both failed attempts
    const [termBAfter2] = await db.select().from(terms).where(eq(terms.id, termBId));
    expect(termBAfter2.status, "School B term status must still be unchanged").toBe(termBSnapshotStatus);
  });


  it("successfully promotes class, handles exception cases, transitions terms, and preserves historical integrity", async () => {
    // 1. Set up School A roster in JSS 1 (classA1Id)
    const [stuPromoted] = await db.insert(students).values({
      schoolId: schoolAId,
      classId: classA1Id,
      admissionNumber: `STU-PROM-${Date.now()}`,
      firstName: "Promoted",
      lastName: "Student",
      status: "active",
    }).returning();

    const [stuRepeated] = await db.insert(students).values({
      schoolId: schoolAId,
      classId: classA1Id,
      admissionNumber: `STU-REP-${Date.now()}`,
      firstName: "Repeated",
      lastName: "Student",
      status: "active",
    }).returning();

    const [stuGraduated] = await db.insert(students).values({
      schoolId: schoolAId,
      classId: classA1Id,
      admissionNumber: `STU-GRAD-${Date.now()}`,
      firstName: "Graduated",
      lastName: "Student",
      status: "active",
    }).returning();

    // 2. Insert prior-term score records for these students
    await db.insert(studentScores).values([
      {
        schoolId: schoolAId,
        studentId: stuPromoted.id,
        classId: classA1Id,
        subjectId: subjAId,
        termId: termAId,
        caScore: 30,
        examScore: 50,
        totalScore: 80, // A1
        enteredBy: adminAId,
      },
      {
        schoolId: schoolAId,
        studentId: stuRepeated.id,
        classId: classA1Id,
        subjectId: subjAId,
        termId: termAId,
        caScore: 20,
        examScore: 22,
        totalScore: 42, // E8
        enteredBy: adminAId,
      },
      {
        schoolId: schoolAId,
        studentId: stuGraduated.id,
        classId: classA1Id,
        subjectId: subjAId,
        termId: termAId,
        caScore: 38,
        examScore: 57,
        totalScore: 95, // A1
        enteredBy: adminAId,
      },
    ]);

    // 3. Insert attendance records for these students
    await db.insert(studentAttendance).values([
      {
        schoolId: schoolAId,
        studentId: stuPromoted.id,
        classId: classA1Id,
        date: "2026-06-01",
        status: "present",
        markedBy: adminAId,
      },
      {
        schoolId: schoolAId,
        studentId: stuRepeated.id,
        classId: classA1Id,
        date: "2026-06-01",
        status: "absent",
        markedBy: adminAId,
      },
      {
        schoolId: schoolAId,
        studentId: stuGraduated.id,
        classId: classA1Id,
        date: "2026-06-01",
        status: "present",
        markedBy: adminAId,
      },
    ]);

    // 4. Execute successful class promotion & rollover
    const results = await executeClassPromotion({
      schoolId: schoolAId,
      currentClassId: classA1Id,
      targetClassId: classA2Id,
      newSession: "2026/2027",
      studentActions: [
        { studentId: stuPromoted.id, action: "promote", nextClassId: classA2Id },
        { studentId: stuRepeated.id, action: "repeat", nextClassId: classA1Id },
        { studentId: stuGraduated.id, action: "graduate" },
      ],
    });

    expect(results.promotedCount).toBe(1);
    expect(results.repeatedCount).toBe(1);
    expect(results.graduatedCount).toBe(1);

    // 5. Verify Student Outcomes
    const [pStudent] = await db.select().from(students).where(eq(students.id, stuPromoted.id));
    expect(pStudent.classId).toBe(classA2Id);
    expect(pStudent.status).toBe("active");

    const [rStudent] = await db.select().from(students).where(eq(students.id, stuRepeated.id));
    expect(rStudent.classId).toBe(classA1Id);
    expect(rStudent.status).toBe("active");

    const [gStudent] = await db.select().from(students).where(eq(students.id, stuGraduated.id));
    expect(gStudent.classId).toBeNull();
    expect(gStudent.status).toBe("graduated");

    // 6. Verify Term Transition
    const [oldTerm] = await db.select().from(terms).where(eq(terms.id, termAId));
    expect(oldTerm.status).toBe("closed");
    expect(oldTerm.isCurrent).toBe(false);

    const [newTerm] = await db
      .select()
      .from(terms)
      .where(and(eq(terms.schoolId, schoolAId), eq(terms.session, "2026/2027"), eq(terms.name, "First Term")));
    expect(newTerm).toBeDefined();
    expect(newTerm.status).toBe("active");
    expect(newTerm.isCurrent).toBe(true);

    // 7. Verify Historical Rankings / Query Integrity (Gap 2)
    // Run class ranking service on the old closed term and original class
    const rankings = await computeClassRankings(schoolAId, classA1Id, termAId);

    expect(rankings.length).toBe(3);
    
    // Rank 1: Graduated Student (Total 95)
    const rank1 = rankings.find(r => r.studentId === stuGraduated.id);
    expect(rank1).toBeDefined();
    expect(rank1?.rank).toBe(1);
    expect(rank1?.averageScore).toBe(95);

    // Rank 2: Promoted Student (Total 80)
    const rank2 = rankings.find(r => r.studentId === stuPromoted.id);
    expect(rank2).toBeDefined();
    expect(rank2?.rank).toBe(2);
    expect(rank2?.averageScore).toBe(80);

    // Rank 3: Repeated Student (Total 42)
    const rank3 = rankings.find(r => r.studentId === stuRepeated.id);
    expect(rank3).toBeDefined();
    expect(rank3?.rank).toBe(3);
    expect(rank3?.averageScore).toBe(42);

    // Assert that original scores and attendance remain completely unaltered
    const scores = await db.select().from(studentScores).where(eq(studentScores.termId, termAId));
    expect(scores.length).toBe(3);
    expect(scores.find(s => s.studentId === stuPromoted.id)?.classId).toBe(classA1Id);
    expect(scores.find(s => s.studentId === stuRepeated.id)?.classId).toBe(classA1Id);
    expect(scores.find(s => s.studentId === stuGraduated.id)?.classId).toBe(classA1Id);

    const attendance = await db.select().from(studentAttendance).where(eq(studentAttendance.classId, classA1Id));
    expect(attendance.length).toBe(3);
  });
});
