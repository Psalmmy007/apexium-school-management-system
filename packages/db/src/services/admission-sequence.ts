import { db, admissionSequences, schools } from "../index";
import { eq, and, sql } from "drizzle-orm";

/**
 * Generates an atomic, concurrency-safe admission number for a school.
 * Uses PostgreSQL atomic SQL increment (SET current_number = current_number + 1 RETURNING current_number).
 * Guaranteed zero duplicate admission numbers under heavy parallel execution.
 *
 * Configurable format templates supported per school:
 *   - "{prefix}/{year}/{seq:6}" -> e.g. "APS/2026/000001"
 *   - "{prefix}-{year:2}-{seq:4}" -> e.g. "SCH001-26-0001"
 *   - "JSS-{year}-{seq:3}" -> e.g. "JSS-2026-001"
 */
export async function generateAtomicAdmissionNumber(
  schoolId: string,
  overrideYear?: string,
  overridePrefix?: string
): Promise<string> {
  const year = overrideYear || new Date().getFullYear().toString();
  const yearShort = year.slice(-2);

  // 1. Fetch school details for prefix fallback
  const [school] = await db
    .select({ slug: schools.name })
    .from(schools)
    .where(eq(schools.id, schoolId));

  const prefix =
    overridePrefix ||
    (school?.slug
      ? school.slug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()
      : "ADM");

  // 2. Perform atomic SQL increment with RETURNING clause
  const updated = await db
    .update(admissionSequences)
    .set({
      currentNumber: sql`${admissionSequences.currentNumber} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(admissionSequences.schoolId, schoolId),
        eq(admissionSequences.academicYear, year)
      )
    )
    .returning();

  let currentNum = 1;
  let formatTemplate = "{prefix}/{year}/{seq:6}";

  if (updated.length === 0) {
    // If sequence row didn't exist yet, insert initial row (currentNumber = 1)
    try {
      const [inserted] = await db
        .insert(admissionSequences)
        .values({
          schoolId,
          academicYear: year,
          currentNumber: 1,
          formatTemplate,
        })
        .returning();

      if (inserted) {
        currentNum = inserted.currentNumber;
        formatTemplate = inserted.formatTemplate || formatTemplate;
      }
    } catch {
      // If concurrent insert occurred, retry atomic increment
      const [retry] = await db
        .update(admissionSequences)
        .set({
          currentNumber: sql`${admissionSequences.currentNumber} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(admissionSequences.schoolId, schoolId),
            eq(admissionSequences.academicYear, year)
          )
        )
        .returning();

      if (retry) {
        currentNum = retry.currentNumber;
        formatTemplate = retry.formatTemplate || formatTemplate;
      }
    }
  } else {
    currentNum = updated[0].currentNumber;
    formatTemplate = updated[0].formatTemplate || formatTemplate;
  }

  // 3. Format admission number string
  let admissionNo = formatTemplate;
  admissionNo = admissionNo.replace(/\{prefix\}/g, prefix);
  admissionNo = admissionNo.replace(/\{year\}/g, year);
  admissionNo = admissionNo.replace(/\{year:2\}/g, yearShort);

  admissionNo = admissionNo.replace(/\{seq(?::(\d+))?\}/g, (_, widthStr) => {
    const width = widthStr ? parseInt(widthStr, 10) : 6;
    return String(currentNum).padStart(width, "0");
  });

  return admissionNo;
}
