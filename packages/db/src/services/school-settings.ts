import { db, schools, schoolSettings } from "../index";
import { eq, and } from "drizzle-orm";

export interface SchoolGeneralSettings {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  motto: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSchoolSettingsParams {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  logoUrl?: string;
}

/**
 * Retrieves the general school profile settings for a specific school tenant.
 */
export async function getSchoolGeneralSettings(schoolId: string): Promise<SchoolGeneralSettings | null> {
  if (!schoolId) return null;

  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!school) return null;

  const [mottoSetting] = await db
    .select()
    .from(schoolSettings)
    .where(and(eq(schoolSettings.schoolId, schoolId), eq(schoolSettings.key, "motto")))
    .limit(1);

  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    address: school.address,
    phone: school.phone,
    email: school.email,
    logoUrl: school.logoUrl,
    motto: mottoSetting?.value || "",
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
  };
}

/**
 * Updates the existing school record in the `schools` table and schoolSettings for motto.
 * Strictly updates the single row matching schoolId; never creates duplicate or orphaned school records.
 */
export async function updateSchoolGeneralSettings(
  schoolId: string,
  params: UpdateSchoolSettingsParams
): Promise<SchoolGeneralSettings> {
  if (!schoolId) {
    throw new Error("School ID is required to update school settings.");
  }

  const [existingSchool] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!existingSchool) {
    throw new Error(`School with ID ${schoolId} not found.`);
  }

  const updateValues: Partial<typeof schools.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (params.name !== undefined && params.name.trim() !== "") {
    updateValues.name = params.name.trim();
  }
  if (params.address !== undefined) {
    updateValues.address = params.address.trim() || null;
  }
  if (params.phone !== undefined) {
    updateValues.phone = params.phone.trim() || null;
  }
  if (params.email !== undefined) {
    updateValues.email = params.email.trim() || null;
  }
  if (params.logoUrl !== undefined) {
    updateValues.logoUrl = params.logoUrl || null;
  }

  const [updatedSchool] = await db
    .update(schools)
    .set(updateValues)
    .where(eq(schools.id, schoolId))
    .returning();

  if (params.motto !== undefined) {
    await db
      .insert(schoolSettings)
      .values({
        schoolId,
        key: "motto",
        value: params.motto.trim(),
      })
      .onConflictDoUpdate({
        target: [schoolSettings.schoolId, schoolSettings.key],
        set: { value: params.motto.trim() },
      });
  }

  const [mottoSetting] = await db
    .select()
    .from(schoolSettings)
    .where(and(eq(schoolSettings.schoolId, schoolId), eq(schoolSettings.key, "motto")))
    .limit(1);

  return {
    id: updatedSchool.id,
    name: updatedSchool.name,
    slug: updatedSchool.slug,
    address: updatedSchool.address,
    phone: updatedSchool.phone,
    email: updatedSchool.email,
    logoUrl: updatedSchool.logoUrl,
    motto: mottoSetting?.value || "",
    createdAt: updatedSchool.createdAt,
    updatedAt: updatedSchool.updatedAt,
  };
}
