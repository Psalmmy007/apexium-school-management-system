import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, classes, students, studentAttendance } from "@apexium/db";
import { eq, and, sql, desc, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Total Enrolled Active Students
    const [enrolledRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.schoolId, user.schoolId), eq(students.status, "active")));

    const totalEnrolled = enrolledRes?.count ?? 0;

    // 2. Today's Attendance Counts
    const todayRecords = await db
      .select({
        status: studentAttendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(studentAttendance)
      .where(and(eq(studentAttendance.schoolId, user.schoolId), eq(studentAttendance.date, todayStr)))
      .groupBy(studentAttendance.status);

    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let excusedToday = 0;
    let totalMarkedToday = 0;

    for (const r of todayRecords) {
      totalMarkedToday += r.count;
      if (r.status === "present") presentToday = r.count;
      else if (r.status === "absent") absentToday = r.count;
      else if (r.status === "late") lateToday = r.count;
      else if (r.status === "excused") excusedToday = r.count;
    }

    const todayRate =
      totalMarkedToday > 0 ? Math.round(((presentToday + lateToday) / totalMarkedToday) * 100) : 0;

    // 3. Class-by-Class Attendance Summary for Today
    const allClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
      })
      .from(classes)
      .where(eq(classes.schoolId, user.schoolId))
      .orderBy(classes.name);

    const classSummaries = await Promise.all(
      allClasses.map(async (cls) => {
        const [studentCountRes] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(students)
          .where(
            and(
              eq(students.schoolId, user.schoolId),
              eq(students.classId, cls.id),
              eq(students.status, "active")
            )
          );

        const classAttendance = await db
          .select({
            status: studentAttendance.status,
            count: sql<number>`count(*)::int`,
          })
          .from(studentAttendance)
          .where(
            and(
              eq(studentAttendance.schoolId, user.schoolId),
              eq(studentAttendance.classId, cls.id),
              eq(studentAttendance.date, todayStr)
            )
          )
          .groupBy(studentAttendance.status);

        let clsPresent = 0;
        let clsAbsent = 0;
        let clsLate = 0;
        let clsExcused = 0;
        let clsTotalMarked = 0;

        for (const ca of classAttendance) {
          clsTotalMarked += ca.count;
          if (ca.status === "present") clsPresent = ca.count;
          else if (ca.status === "absent") clsAbsent = ca.count;
          else if (ca.status === "late") clsLate = ca.count;
          else if (ca.status === "excused") clsExcused = ca.count;
        }

        const totalClassStudents = studentCountRes?.count ?? 0;
        const rate =
          clsTotalMarked > 0
            ? Math.round(((clsPresent + clsLate) / clsTotalMarked) * 100)
            : 0;

        return {
          id: cls.id,
          name: cls.name,
          totalStudents: totalClassStudents,
          presentToday: clsPresent,
          absentToday: clsAbsent,
          lateToday: clsLate,
          excusedToday: clsExcused,
          markedToday: clsTotalMarked,
          rate,
        };
      })
    );

    // 4. Past 7-Day Trend
    const past7Days: Array<{ date: string; dayName: string; present: number; absent: number; rate: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

      const dayRecords = await db
        .select({
          status: studentAttendance.status,
          count: sql<number>`count(*)::int`,
        })
        .from(studentAttendance)
        .where(and(eq(studentAttendance.schoolId, user.schoolId), eq(studentAttendance.date, dateStr)))
        .groupBy(studentAttendance.status);

      let dayPresent = 0;
      let dayAbsent = 0;
      let dayLate = 0;
      let dayTotal = 0;

      for (const dr of dayRecords) {
        dayTotal += dr.count;
        if (dr.status === "present") dayPresent = dr.count;
        else if (dr.status === "absent") dayAbsent = dr.count;
        else if (dr.status === "late") dayLate = dr.count;
      }

      past7Days.push({
        date: dateStr,
        dayName,
        present: dayPresent + dayLate,
        absent: dayAbsent,
        rate: dayTotal > 0 ? Math.round(((dayPresent + dayLate) / dayTotal) * 100) : 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalEnrolled,
        today: {
          date: todayStr,
          totalMarked: totalMarkedToday,
          present: presentToday,
          absent: absentToday,
          late: lateToday,
          excused: excusedToday,
          rate: todayRate,
        },
        classSummaries,
        past7Days,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attendance summary" },
      { status: 500 }
    );
  }
}
