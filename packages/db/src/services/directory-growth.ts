import { db } from "../client";
import { schools, schoolDirectoryViews } from "../schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateWeeklyInterestReport } from "./directory";

export interface InterestReportEmailPayload {
  toEmail: string;
  schoolName: string;
  schoolSlug: string;
  totalViews: number;
  searchImpressions: number;
  profileViews: number;
  claimUrl: string;
  subject: string;
  messageText: string;
}

export type EmailDispatcher = (payload: InterestReportEmailPayload) => Promise<boolean>;

export async function dispatchWeeklyDirectoryInterestReports(
  customDispatcher?: EmailDispatcher
): Promise<{
  processed: number;
  sent: number;
  skippedZeroActivity: number;
  reports: InterestReportEmailPayload[];
}> {
  // Query all verified unconverted listings
  const unconvertedSchools = await db
    .select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug,
      email: schools.email,
    })
    .from(schools)
    .where(
      and(
        eq(schools.listingStatus, "listed_unconverted"),
        eq(schools.listingVerified, true),
        eq(schools.isActive, true)
      )
    );

  let sent = 0;
  let skippedZeroActivity = 0;
  const reports: InterestReportEmailPayload[] = [];

  for (const s of unconvertedSchools) {
    if (!s.email) continue;

    const report = await generateWeeklyInterestReport(s.id);

    // Strict growth loop rule: DO NOT send email if activity is zero
    if (!report.shouldSend || report.totalViews === 0) {
      skippedZeroActivity++;
      continue;
    }

    const claimUrl = `https://apexium.app/register?claimSlug=${s.slug}`;
    const payload: InterestReportEmailPayload = {
      toEmail: s.email,
      schoolName: s.name,
      schoolSlug: s.slug,
      totalViews: report.totalViews,
      searchImpressions: report.searchImpressions,
      profileViews: report.profileViews,
      claimUrl,
      subject: `Weekly Parent Interest: ${report.totalViews} prospective parents viewed ${s.name}`,
      messageText: `Hello Administrator,

In the past 7 days, ${report.totalViews} prospective parents discovered ${s.name} on the Apexium School Directory:
- ${report.searchImpressions} parents searched for schools in your city/state and saw your listing.
- ${report.profileViews} parents opened your direct school profile.

Parents are looking to submit applications to your school. You can activate full online admissions, fee collections, and student record automation by claiming your portal:
${claimUrl}

Warm regards,
Apexium Growth Team`,
    };

    if (customDispatcher) {
      await customDispatcher(payload);
    }

    // Mark tracked views as reported
    await db
      .update(schoolDirectoryViews)
      .set({ periodReported: true })
      .where(eq(schoolDirectoryViews.schoolId, s.id));

    reports.push(payload);
    sent++;
  }

  return {
    processed: unconvertedSchools.length,
    sent,
    skippedZeroActivity,
    reports,
  };
}
