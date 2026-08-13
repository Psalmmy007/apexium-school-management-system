import { db } from "../client";
import { admissionApplications, admissionDocuments, students, guardians, studentGuardians, users, schools } from "../schema";
import { eq, and, or, like, ilike, lt, gte, gt, desc, count } from "drizzle-orm";
import { logSecurityAudit } from "./security";
import { sendNotification } from "./communication";
import { recordConsent } from "./privacy";
import { createGuardian, linkStudentGuardian } from "./guardians";
import { generateAtomicAdmissionNumber } from "./admission-sequence";

export async function createAdmissionApplication(params: {
  schoolId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  nationality?: string;
  currentSchool?: string;
  previousAcademicInfo?: string;
  desiredClassId?: string;
  desiredSession?: string;
  desiredTermId?: string;
  guardianName: string;
  guardianRelationship: 'father' | 'mother' | 'guardian' | 'other';
  guardianEmail: string;
  guardianPhone: string;
  guardianAddress?: string;
  source?: string;
}) {
  const currentYear = new Date().getFullYear().toString();
  const schoolPrefix = params.schoolId.replace(/-/g, '').slice(0, 4).toUpperCase();
  const rawReference = await generateAtomicAdmissionNumber(params.schoolId, currentYear, `APP-${schoolPrefix}`);
  const applicationReference = rawReference.replace(/\//g, '-');

  const [application] = await db.insert(admissionApplications).values({
    schoolId: params.schoolId,
    applicationReference,
    firstName: params.firstName,
    middleName: params.middleName,
    lastName: params.lastName,
    dateOfBirth: params.dateOfBirth,
    gender: params.gender,
    nationality: params.nationality,
    currentSchool: params.currentSchool,
    previousAcademicInfo: params.previousAcademicInfo,
    desiredClassId: params.desiredClassId,
    desiredSession: params.desiredSession,
    desiredTermId: params.desiredTermId,
    guardianName: params.guardianName,
    guardianRelationship: params.guardianRelationship,
    guardianEmail: params.guardianEmail,
    guardianPhone: params.guardianPhone,
    guardianAddress: params.guardianAddress,
    source: params.source,
    status: 'draft',
  }).returning();

  return application;
}

export async function getAdmissionApplication(id: string, schoolId: string) {
  const [app] = await db.select().from(admissionApplications)
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    ));
  return app || null;
}

export async function getAdmissionApplicationByReference(reference: string, schoolId: string) {
  const [app] = await db.select().from(admissionApplications)
    .where(and(
      eq(admissionApplications.applicationReference, reference),
      eq(admissionApplications.schoolId, schoolId)
    ));
  return app || null;
}

export async function listAdmissionApplications(params: {
  schoolId: string;
  status?: string;
  desiredSession?: string;
  desiredClassId?: string;
  cursor?: string;
  limit?: number;
  search?: string;
}) {
  const limit = params.limit || 50;
  
  const conditions = [eq(admissionApplications.schoolId, params.schoolId)];
  if (params.status) conditions.push(eq(admissionApplications.status, params.status));
  if (params.desiredSession) conditions.push(eq(admissionApplications.desiredSession, params.desiredSession));
  if (params.desiredClassId) conditions.push(eq(admissionApplications.desiredClassId, params.desiredClassId));
  if (params.cursor) conditions.push(gt(admissionApplications.id, params.cursor));
  
  if (params.search) {
    conditions.push(
      or(
        ilike(admissionApplications.firstName, `%${params.search}%`),
        ilike(admissionApplications.lastName, `%${params.search}%`),
        ilike(admissionApplications.guardianEmail, `%${params.search}%`)
      )!
    );
  }

  const data = await db.select().from(admissionApplications)
    .where(and(...conditions))
    .limit(limit + 1)
    .orderBy(admissionApplications.id);
    
  let nextCursor = null;
  if (data.length > limit) {
    const nextItem = data.pop();
    nextCursor = nextItem?.id || null;
  }
  
  return { data, nextCursor };
}

export async function submitAdmissionApplication(id: string, schoolId: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'submitted', submittedAt: new Date() })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function reviewAdmissionApplication(id: string, schoolId: string, adminId: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'under_review', reviewedAt: new Date(), reviewedBy: adminId })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function shortlistApplicant(id: string, schoolId: string, adminId: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'shortlisted', decisionAt: new Date(), decisionBy: adminId })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function waitlistApplicant(id: string, schoolId: string, adminId: string, reason: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'waitlisted', decisionAt: new Date(), decisionBy: adminId, waitlistReason: reason })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function acceptApplicant(id: string, schoolId: string, adminId: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'accepted', decisionAt: new Date(), decisionBy: adminId })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function rejectApplicant(id: string, schoolId: string, adminId: string, reason: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'rejected', decisionAt: new Date(), decisionBy: adminId, rejectionReason: reason })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function withdrawApplication(id: string, schoolId: string) {
  const [updated] = await db.update(admissionApplications)
    .set({ status: 'withdrawn' })
    .where(and(
      eq(admissionApplications.id, id),
      eq(admissionApplications.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function uploadAdmissionDocument(params: {
  applicationId: string;
  schoolId: string;
  documentType: string;
  fileName: string;
  storagePath: string;
  fileSizeBytes?: number;
  mimeType?: string;
}) {
  const [doc] = await db.insert(admissionDocuments).values(params).returning();
  return doc;
}

export async function verifyAdmissionDocument(docId: string, schoolId: string, verifiedBy: string) {
  const [updated] = await db.update(admissionDocuments)
    .set({ verificationStatus: 'verified', verifiedAt: new Date(), verifiedBy })
    .where(and(
      eq(admissionDocuments.id, docId),
      eq(admissionDocuments.schoolId, schoolId)
    )).returning();
  return updated;
}

export async function convertApplicantToStudent(params: {
  applicationId: string;
  schoolId: string;
  adminId: string;
  admissionNumber?: string;
  classId?: string;
}) {
  return await db.transaction(async (tx) => {
    const [app] = await tx.select().from(admissionApplications)
      .where(and(
        eq(admissionApplications.id, params.applicationId),
        eq(admissionApplications.schoolId, params.schoolId)
      ));
      
    if (!app) throw new Error("Application not found");
    if (app.status !== 'accepted') throw new Error("Application must be in accepted status");
    if (app.convertedStudentId) throw new Error("Applicant already enrolled");
    
    // Create Student
    const admissionNumber = params.admissionNumber || await generateAtomicAdmissionNumber(params.schoolId, new Date().getFullYear().toString(), 'ADM');
    
    const [student] = await tx.insert(students).values({
      schoolId: params.schoolId,
      admissionNumber,
      firstName: app.firstName,
      middleName: app.middleName,
      lastName: app.lastName,
      dateOfBirth: app.dateOfBirth && !isNaN(new Date(app.dateOfBirth).getTime()) ? new Date(app.dateOfBirth) : undefined,
      gender: app.gender,
      nationality: app.nationality,
      classId: params.classId || app.desiredClassId,
      status: 'active'
    }).returning();
    
    // Create or find Guardian within transaction
    const guardianNames = app.guardianName.split(' ');
    const guardianFirstName = guardianNames[0];
    const guardianLastName = guardianNames.slice(1).join(' ') || 'Unknown';
    const cleanPhone = app.guardianPhone.trim();

    let guardian;
    const [existingGuardian] = await tx.select().from(guardians)
      .where(and(eq(guardians.schoolId, params.schoolId), eq(guardians.phone, cleanPhone)));

    if (existingGuardian) {
      guardian = existingGuardian;
    } else {
      const [newGuardian] = await tx.insert(guardians).values({
        schoolId: params.schoolId,
        firstName: guardianFirstName.trim(),
        lastName: guardianLastName.trim(),
        phone: cleanPhone,
        email: app.guardianEmail ? app.guardianEmail.trim() : null,
        address: app.guardianAddress ? app.guardianAddress.trim() : null,
      }).returning();
      guardian = newGuardian;
    }

    // Link Student & Guardian within transaction
    const [existingLink] = await tx.select().from(studentGuardians)
      .where(and(
        eq(studentGuardians.schoolId, params.schoolId),
        eq(studentGuardians.studentId, student.id),
        eq(studentGuardians.guardianId, guardian.id)
      ));

    if (!existingLink) {
      await tx.insert(studentGuardians).values({
        schoolId: params.schoolId,
        studentId: student.id,
        guardianId: guardian.id,
        relationship: app.guardianRelationship || "guardian",
        isPrimary: true,
      });
    }
    
    const [updatedApp] = await tx.update(admissionApplications)
      .set({ 
        status: 'enrolled', 
        convertedStudentId: student.id,
        convertedAt: new Date(),
        convertedBy: params.adminId
      })
      .where(eq(admissionApplications.id, app.id))
      .returning();
      
    await logSecurityAudit({
      schoolId: params.schoolId,
      performedById: params.adminId,
      action: 'applicant_enrolled',
      details: `Applicant ${app.id} enrolled as student ${student.id}`,
      metadata: { applicationId: app.id, studentId: student.id }
    });
    
    if (app.guardianEmail) {
      await sendNotification({
        schoolId: params.schoolId,
        recipientId: guardian.userId || guardian.id,
        title: 'Enrollment Successful',
        message: `Your ward ${student.firstName} has been successfully enrolled with admission number ${student.admissionNumber}.`
      });
    }
    
    if (app.consentRecorded) {
      await recordConsent({
        schoolId: params.schoolId,
        dataSubjectId: student.id,
        subjectType: 'student',
        dataCategory: 'academic',
        legalBasis: 'consent'
      });
    }
    
    return { student, guardian, application: updatedApp };
  });
}

export async function detectDuplicateApplication(params: {
  schoolId: string;
  guardianEmail?: string;
  guardianPhone?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
}) {
  const conditions = [eq(admissionApplications.schoolId, params.schoolId)];
  const orConditions = [];
  
  if (params.guardianEmail) orConditions.push(eq(admissionApplications.guardianEmail, params.guardianEmail));
  if (params.guardianPhone) orConditions.push(eq(admissionApplications.guardianPhone, params.guardianPhone));
  if (params.firstName && params.lastName && params.dateOfBirth) {
    orConditions.push(and(
      ilike(admissionApplications.firstName, params.firstName),
      ilike(admissionApplications.lastName, params.lastName),
      eq(admissionApplications.dateOfBirth, params.dateOfBirth)
    ));
  }
  
  if (orConditions.length === 0) return [];
  
  conditions.push(or(...orConditions)!);
  
  const matches = await db.select().from(admissionApplications)
    .where(and(...conditions));
    
  return matches.map(match => {
    const reasons = [];
    if (params.guardianEmail && match.guardianEmail === params.guardianEmail) reasons.push('email');
    if (params.guardianPhone && match.guardianPhone === params.guardianPhone) reasons.push('phone');
    if (params.firstName && match.firstName.toLowerCase() === params.firstName.toLowerCase()) reasons.push('name_dob');
    return { application: match, matchReasons: reasons };
  });
}

export async function getAdmissionStatistics(schoolId: string) {
  const allApps = await db.select({
    id: admissionApplications.id,
    status: admissionApplications.status,
    desiredClassId: admissionApplications.desiredClassId,
    desiredSession: admissionApplications.desiredSession,
    createdAt: admissionApplications.createdAt
  }).from(admissionApplications).where(eq(admissionApplications.schoolId, schoolId));
  
  const total = allApps.length;
  const byStatus: Record<string, number> = {};
  const classCount: Record<string, number> = {};
  const sessionCount: Record<string, number> = {};
  
  let recentApplications = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  for (const app of allApps) {
    byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    
    if (app.desiredClassId) {
      classCount[app.desiredClassId] = (classCount[app.desiredClassId] || 0) + 1;
    }
    
    if (app.desiredSession) {
      sessionCount[app.desiredSession] = (sessionCount[app.desiredSession] || 0) + 1;
    }
    
    if (new Date(app.createdAt) >= thirtyDaysAgo) {
      recentApplications++;
    }
  }
  
  const enrolledCount = byStatus['enrolled'] || 0;
  const conversionRate = total > 0 ? (enrolledCount / total) * 100 : 0;
  
  const byClass = Object.entries(classCount).map(([id, count]) => ({ className: id, count }));
  const bySession = Object.entries(sessionCount).map(([session, count]) => ({ sessionName: session, count }));
  
  return {
    total,
    byStatus,
    conversionRate,
    byClass,
    bySession,
    recentApplications
  };
}
