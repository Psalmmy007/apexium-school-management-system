import { db, schools } from "@apexium/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import SchoolLoginPageClient from "./SchoolLoginPageClient";

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, params.slug.toLowerCase()))
    .limit(1);

  if (!school) {
    return { title: "School Portal Login — Apexium ERP" };
  }

  return {
    title: `${school.name} — Portal Login`,
    description: `Sign in to ${school.name} portal`,
  };
}

export default async function SchoolSlugLoginPage({ params }: Props) {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, params.slug.toLowerCase()))
    .limit(1);

  if (!school) {
    // If school slug is not found in database, check if first school exists or 404
    const [firstSchool] = await db.select().from(schools).limit(1);
    if (!firstSchool) {
      notFound();
    }
    return (
      <SchoolLoginPageClient
        school={{
          id: firstSchool.id,
          name: firstSchool.name,
          slug: firstSchool.slug,
          motto: "Excellence & Character",
          address: firstSchool.address || "Main Campus",
          phone: firstSchool.phone || "+234 800 000 0000",
        }}
      />
    );
  }

  return (
    <SchoolLoginPageClient
      school={{
        id: school.id,
        name: school.name,
        slug: school.slug,
        motto: "Excellence & Character",
        address: school.address || "Main Campus",
        phone: school.phone || "+234 800 000 0000",
      }}
    />
  );
}
