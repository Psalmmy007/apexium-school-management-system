import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gadpsebirkwblhguxrjw:Mediocrity00%40%40%23%23@aws-1-eu-west-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(databaseUrl, { max: 1 });

  console.log("Creating database tables directly on Supabase...");

  try {
    // 1. Create schools table
    await sql`
      CREATE TABLE IF NOT EXISTS "schools" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "slug" text UNIQUE NOT NULL,
        "address" text,
        "phone" text,
        "logo_url" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table schools created.");

    // 2. Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "email" text UNIQUE NOT NULL,
        "first_name" text NOT NULL,
        "last_name" text NOT NULL,
        "role" text NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table users created.");

    // 3. Create academic_sections table
    await sql`
      CREATE TABLE IF NOT EXISTS "academic_sections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "code" text NOT NULL,
        "display_order" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table academic_sections created.");

    // 4. Create classes table
    await sql`
      CREATE TABLE IF NOT EXISTS "classes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "section_id" uuid REFERENCES "academic_sections"("id") ON DELETE SET NULL,
        "name" text NOT NULL,
        "code" text NOT NULL,
        "capacity" integer DEFAULT 40 NOT NULL,
        "display_order" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table classes created.");

    // 5. Create sections (arms/streams) table
    await sql`
      CREATE TABLE IF NOT EXISTS "sections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "class_id" uuid REFERENCES "classes"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "capacity" integer DEFAULT 30 NOT NULL,
        "display_order" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table sections created.");

    // 6. Create terms table
    await sql`
      CREATE TABLE IF NOT EXISTS "terms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "session" text NOT NULL,
        "is_current" boolean DEFAULT false NOT NULL,
        "status" text DEFAULT 'active' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table terms created.");

    // 7. Create subjects table
    await sql`
      CREATE TABLE IF NOT EXISTS "subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "code" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table subjects created.");

    // 8. Create guardians table
    await sql`
      CREATE TABLE IF NOT EXISTS "guardians" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "first_name" text NOT NULL,
        "last_name" text NOT NULL,
        "relationship" text NOT NULL,
        "phone" text NOT NULL,
        "email" text,
        "occupation" text,
        "address" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table guardians created.");

    // 9. Create students table
    await sql`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "admission_number" text NOT NULL,
        "first_name" text NOT NULL,
        "middle_name" text,
        "last_name" text NOT NULL,
        "gender" text NOT NULL,
        "date_of_birth" date,
        "passport_url" text,
        "class_id" uuid REFERENCES "classes"("id") ON DELETE SET NULL,
        "section_id" uuid REFERENCES "sections"("id") ON DELETE SET NULL,
        "status" text DEFAULT 'Active' NOT NULL,
        "admission_date" date DEFAULT CURRENT_DATE,
        "state_of_origin" text,
        "lga" text,
        "nationality" text DEFAULT 'Nigerian',
        "religion" text,
        "blood_group" text,
        "genotype" text,
        "residential_address" text,
        "emergency_contact" text,
        "previous_school" text,
        "medical_conditions" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table students created.");

    // 10. Create student_guardians table
    await sql`
      CREATE TABLE IF NOT EXISTS "student_guardians" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "school_id" uuid REFERENCES "schools"("id") ON DELETE CASCADE,
        "student_id" uuid REFERENCES "students"("id") ON DELETE CASCADE,
        "guardian_id" uuid REFERENCES "guardians"("id") ON DELETE CASCADE,
        "is_primary" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Table student_guardians created.");

    console.log("🎉 ALL CORE TABLES CREATED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Table Creation Error:", error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
