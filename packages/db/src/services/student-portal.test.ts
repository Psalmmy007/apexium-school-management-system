import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  students,
  classes,
  terms,
  subjects,
  studentScores,
  studentAttendance,
  lmsLessons,
  cbtExams,
  announcements,
  studentNotifications,
  getStudentDashboardOverview,
  getStudentAcademicResults,
  getStudentAttendanceHistory,
  getStudentCbtOverview,
  getStudentLmsOverview,
  getStudentProfileByUserId,
  updateStudentProfile,
} from "../index";

describe("Milestone 13: Student Portal — Multi-School Tenant Isolation & Student Resource Tests", () => {
  let schoolAId: string;
  let schoolBId: string;

  let studentA1Id: string;
  let studentA1UserId: string;

  let studentA2Id: string;

  let studentB1Id: string;

  let classAId: string;
  let classBId: string;

  beforeAll(async () => {
    // 1. Create School A & School B
    const [schA] = await db
      .insert(schools)
      .values({ name: "Student Portal Academy A", slug: `sp-sch-a-${Date.now()}` })
      .returning();
    schoolAId = schA.id;

    const [schB] = await db
      .insert(schools)
      .values({ name: "Student Portal Academy B", slug: `sp-sch-b-${Date.now()}` })
      .returning();
    schoolBId = schB.id;

    // 2. Create Classes in each school
    const [clsA] = await db
      .insert(classes)
      .values({ schoolId: schoolAId, name: "SS 1 Gold" })
      .returning();
    classAId = clsA.id;

    const [clsB] = await db
      .insert(classes)
      .values({ schoolId: schoolBId, name: "Grade 10 Blue" })
      .returning();
    classBId = clsB.id;

    // 3. Create Users for Students
    studentA1UserId = crypto.randomUUID();
    await db.insert(users).values({
      id: studentA1UserId,
      schoolId: schoolAId,
      email: `stA1-${Date.now()}@test.edu`,
      role: "student",
      firstName: "Alex",
      lastName: "Smith",
    });

    const studentB1UserId = crypto.randomUUID();
    await db.insert(users).values({
      id: studentB1UserId,
      schoolId: schoolBId,
      email: `stB1-${Date.now()}@test.edu`,
      role: "student",
      firstName: "Bob",
      lastName: "Jones",
    });

    // 4. Create Students
    const [stA1] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        userId: studentA1UserId,
        admissionNumber: `ADM-A1-${Date.now()}`,
        firstName: "Alex",
        lastName: "Smith",
        classId: classAId,
      })
      .returning();
    studentA1Id = stA1.id;

    const [stA2] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `ADM-A2-${Date.now()}`,
        firstName: "Alice",
        lastName: "Smith",
        classId: classAId,
      })
      .returning();
    studentA2Id = stA2.id;

    const [stB1] = await db
      .insert(students)
      .values({
        schoolId: schoolBId,
        userId: studentB1UserId,
        admissionNumber: `ADM-B1-${Date.now()}`,
        firstName: "Bob",
        lastName: "Jones",
        classId: classBId,
      })
      .returning();
    studentB1Id = stB1.id;

    // 5. Populate Data for School A
    const [subA] = await db
      .insert(subjects)
      .values({ schoolId: schoolAId, name: "Mathematics" })
      .returning();

    const [termA] = await db
      .insert(terms)
      .values({ schoolId: schoolAId, name: "First Term", session: "2026/2027" })
      .returning();

    await db.insert(studentScores).values([
      {
        schoolId: schoolAId,
        classId: classAId,
        studentId: studentA1Id,
        subjectId: subA.id,
        termId: termA.id,
        caScore: 35,
        examScore: 55,
        totalScore: 90,
        grade: "A1",
      },
      {
        schoolId: schoolAId,
        classId: classAId,
        studentId: studentA2Id,
        subjectId: subA.id,
        termId: termA.id,
        caScore: 20,
        examScore: 40,
        totalScore: 60,
        grade: "B3",
      },
    ]);

    await db.insert(studentAttendance).values({
      schoolId: schoolAId,
      studentId: studentA1Id,
      classId: classAId,
      date: "2026-09-10",
      status: "present",
    });

    await db.insert(lmsLessons).values({
      schoolId: schoolAId,
      classId: classAId,
      subjectId: subA.id,
      termId: termA.id,
      title: "Algebraic Operations",
      contentBody: "Detailed algebra notes...",
    });

    await db.insert(cbtExams).values({
      schoolId: schoolAId,
      classId: classAId,
      subjectId: subA.id,
      termId: termA.id,
      title: "Mathematics Mid-Term Test",
      status: "published",
      durationMinutes: 45,
    });

    await db.insert(announcements).values({
      schoolId: schoolAId,
      title: "Inter-House Sports Competition",
      body: "Sports event taking place next Friday.",
      publishedAt: new Date(Date.now() - 1000),
    });

    await db.insert(studentNotifications).values({
      schoolId: schoolAId,
      studentId: studentA1Id,
      title: "New Assignment Posted",
      message: "Please complete Algebra Ex 4.",
      type: "assignment",
    });

    // 6. Populate Data for School B
    const [subB] = await db
      .insert(subjects)
      .values({ schoolId: schoolBId, name: "Physics" })
      .returning();

    const [termB] = await db
      .insert(terms)
      .values({ schoolId: schoolBId, name: "First Term", session: "2026/2027" })
      .returning();

    await db.insert(studentScores).values({
      schoolId: schoolBId,
      classId: classBId,
      studentId: studentB1Id,
      subjectId: subB.id,
      termId: termB.id,
      caScore: 28,
      examScore: 42,
      totalScore: 70,
      grade: "B2",
    });
  }, 30000);

  it("resolves student profile by userId with strict tenant scoping", async () => {
    const profile = await getStudentProfileByUserId(schoolAId, studentA1UserId);
    expect(profile).not.toBeNull();
    expect(profile?.id).toBe(studentA1Id);
    expect(profile?.firstName).toBe("Alex");

    // Re-querying with wrong schoolId must return null (strict isolation)
    const wrongSchoolProfile = await getStudentProfileByUserId(schoolBId, studentA1UserId);
    expect(wrongSchoolProfile).toBeNull();
  });

  it("fetches dashboard overview for student A1 with correct resource counts", async () => {
    const overview = await getStudentDashboardOverview(schoolAId, studentA1Id);
    expect(overview.student.id).toBe(studentA1Id);
    expect(overview.attendanceSummary.total).toBe(1);
    expect(overview.attendanceSummary.present).toBe(1);
    expect(overview.cbtExamsCount).toBe(1);
    expect(overview.announcements.length).toBeGreaterThan(0);
    expect(overview.unreadNotificationsCount).toBe(1);
    expect(overview.recentScores.length).toBe(1);
    expect(overview.recentScores[0].totalScore).toBe(90);
  });

  it("proves complete tenant isolation: student A1 cannot query student B1 resources", async () => {
    // Student B1's results when queried under School A returns empty or throws error
    const schoolAQueryForB1 = await getStudentAcademicResults(schoolAId, studentB1Id).catch(() => null);
    expect(schoolAQueryForB1).toBeNull();

    // Student A1 query under School B throws error
    const schoolBQueryForA1 = await getStudentAcademicResults(schoolBId, studentA1Id).catch(() => null);
    expect(schoolBQueryForA1).toBeNull();
  });

  it("proves student isolation within same school: student A1 scores do not leak to student A2", async () => {
    const resultsA1 = await getStudentAcademicResults(schoolAId, studentA1Id);
    const resultsA2 = await getStudentAcademicResults(schoolAId, studentA2Id);

    expect(resultsA1.scores[0].totalScore).toBe(90);
    expect(resultsA2.scores[0].totalScore).toBe(60);
    expect(resultsA1.scores[0].studentId).not.toBe(resultsA2.scores[0].studentId);
  });

  it("allows student to update non-sensitive profile settings without corrupting SIS records", async () => {
    const updated = await updateStudentProfile(schoolAId, studentA1Id, {
      photoUrl: "https://cdn.example.com/photos/alex.jpg",
      address: "123 School Lane, Lagos",
      notificationPreferences: { email: true, sms: false },
    });

    expect(updated).not.toBeNull();
    expect(updated?.photoUrl).toBe("https://cdn.example.com/photos/alex.jpg");
    expect(updated?.admissionNumber).toBeDefined(); // SIS field untouched
  });
});
