/**
 * Milestone 32 — Multi-Branch / School Group Support Service
 *
 * Manages school groups owning multiple branch campuses, single group subscription
 * extensions across branches, group-admin RBAC roles, and strict branch-level data isolation.
 *
 * VERIFICATION BOUNDARY:
 *   - Group Admin: Can access group dashboard, view aggregated cross-branch metrics, and list all campuses.
 *   - Branch Admin / Staff: Strictly confined to their assigned branch `schoolId`. Zero cross-branch leakage.
 */
import { db } from "../client";
import { eq, and, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  schoolGroups,
  groupMemberships,
  schools,
  users,
  students,
  saasInvoices,
  saasSchoolSubscriptions,
} from "../schema/index";
import { registerSchool, initializeSchoolTenant } from "./school-onboarding";
import { writeSaasAuditLog } from "./tenant";

export interface SchoolGroupData {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string | null;
  subscriptionId: string | null;
  maxBranchesLimit: number;
  isActive: boolean;
  createdAt: Date;
}

export interface BranchSchoolData {
  id: string;
  name: string;
  slug: string;
  branchName: string | null;
  isGroupHeadquarters: boolean;
  groupId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface GroupAggregatedMetrics {
  groupId: string;
  groupName: string;
  totalCampuses: number;
  totalGroupStudents: number;
  totalGroupStaff: number;
  totalGroupRevenue: number;
  campusBreakdown: Array<{
    schoolId: string;
    branchName: string;
    studentCount: number;
    staffCount: number;
    revenue: number;
  }>;
}

// ── 1. Create School Group ───────────────────────────────────────────────────
export async function createSchoolGroup(params: {
  name: string;
  slug: string;
  ownerUserId: string;
  maxBranchesLimit?: number;
}): Promise<SchoolGroupData> {
  const cleanSlug = params.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
  const groupId = randomUUID();

  // Create group-level subscription reference if applicable
  const [sub] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .limit(1);

  await db.insert(schoolGroups).values({
    id: groupId,
    name: params.name.trim(),
    slug: cleanSlug,
    ownerUserId: params.ownerUserId,
    subscriptionId: sub?.id ?? null,
    maxBranchesLimit: params.maxBranchesLimit ?? 5,
    isActive: true,
  });

  // Assign Group Admin role to owner
  await db.insert(groupMemberships).values({
    groupId,
    userId: params.ownerUserId,
    role: "group_admin",
  });

  const [group] = await db
    .select()
    .from(schoolGroups)
    .where(eq(schoolGroups.id, groupId))
    .limit(1);

  return group as unknown as SchoolGroupData;
}

// ── 2. Add Branch Campus to Group ──────────────────────────────────────────────
export async function addBranchToGroup(params: {
  groupId: string;
  branchName: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  isHeadquarters?: boolean;
}): Promise<BranchSchoolData> {
  const [group] = await db
    .select()
    .from(schoolGroups)
    .where(eq(schoolGroups.id, params.groupId))
    .limit(1);

  if (!group) throw new Error(`School group ${params.groupId} not found`);

  // Count existing branches
  const existingBranches = await db
    .select()
    .from(schools)
    .where(eq(schools.groupId, params.groupId));

  if (existingBranches.length >= group.maxBranchesLimit) {
    throw new Error(`Group branch limit reached (${group.maxBranchesLimit} campuses maximum)`);
  }

  const branchSlug = `${group.slug}-${params.branchName.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-")}`;
  const fullSchoolName = `${group.name} - ${params.branchName}`;

  // Register branch school tenant
  const regResult = await registerSchool({
    schoolName: fullSchoolName,
    adminFirstName: params.adminFirstName,
    adminLastName: params.adminLastName,
    adminEmail: params.adminEmail,
  });

  // Update school record with group fields
  await db
    .update(schools)
    .set({
      groupId: params.groupId,
      branchName: params.branchName,
      isGroupHeadquarters: params.isHeadquarters ?? false,
    })
    .where(eq(schools.id, regResult.schoolId));

  const [branch] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, regResult.schoolId))
    .limit(1);

  await writeSaasAuditLog({
    schoolId: regResult.schoolId,
    eventType: "group_branch_created",
    details: { groupId: params.groupId, branchName: params.branchName },
  });

  return branch as unknown as BranchSchoolData;
}

// ── 3. Get Group Branches ─────────────────────────────────────────────────────
export async function getGroupBranches(groupId: string): Promise<BranchSchoolData[]> {
  const branches = await db
    .select()
    .from(schools)
    .where(eq(schools.groupId, groupId));

  return branches as unknown as BranchSchoolData[];
}

// ── 4. Group Aggregated Metrics across Campuses ──────────────────────────────
export async function getGroupAggregatedMetrics(groupId: string): Promise<GroupAggregatedMetrics> {
  const [group] = await db
    .select()
    .from(schoolGroups)
    .where(eq(schoolGroups.id, groupId))
    .limit(1);

  if (!group) throw new Error(`School group ${groupId} not found`);

  const branches = await getGroupBranches(groupId);
  const branchIds = branches.map((b) => b.id);

  if (branchIds.length === 0) {
    return {
      groupId,
      groupName: group.name,
      totalCampuses: 0,
      totalGroupStudents: 0,
      totalGroupStaff: 0,
      totalGroupRevenue: 0,
      campusBreakdown: [],
    };
  }

  const campusBreakdown = [];
  let totalGroupStudents = 0;
  let totalGroupStaff = 0;
  let totalGroupRevenue = 0;

  for (const branch of branches) {
    const studentList = await db
      .select()
      .from(students)
      .where(eq(students.schoolId, branch.id));

    const staffList = await db
      .select()
      .from(users)
      .where(eq(users.schoolId, branch.id));

    const invList = await db
      .select()
      .from(saasInvoices)
      .where(eq(saasInvoices.schoolId, branch.id));

    const revenue = invList.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    totalGroupStudents += studentList.length;
    totalGroupStaff += staffList.length;
    totalGroupRevenue += revenue;

    campusBreakdown.push({
      schoolId: branch.id,
      branchName: branch.branchName || branch.name,
      studentCount: studentList.length,
      staffCount: staffList.length,
      revenue,
    });
  }

  return {
    groupId,
    groupName: group.name,
    totalCampuses: branches.length,
    totalGroupStudents,
    totalGroupStaff,
    totalGroupRevenue,
    campusBreakdown,
  };
}

// ── 5. Group Admin RBAC Assertion ──────────────────────────────────────────────
export async function assertGroupAdminAccess(userId: string, groupId: string): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
    .limit(1);

  if (!membership || membership.role !== "group_admin") {
    throw new Error(`User ${userId} is not an authorized Group Admin for group ${groupId}`);
  }

  return true;
}

// ── 6. Branch Admin / Staff Visibility Bound Assertion ────────────────────────
export async function assertBranchAccess(userId: string, branchSchoolId: string): Promise<boolean> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.schoolId, branchSchoolId)))
    .limit(1);

  if (!user) {
    throw new Error(`Branch access denied: User ${userId} does not belong to branch school ${branchSchoolId}`);
  }

  return true;
}
