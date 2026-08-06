/**
 * Milestone 16 direct migration script.
 * Adds:
 *   1. New student_status enum values: suspended, withdrawn, expelled, alumni
 *   2. student_activity_timeline table
 *   3. Indexes on the new table
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("Connecting to database...");

  // 1. Add new enum values (ALTER TYPE ... ADD VALUE is idempotent with IF NOT EXISTS)
  const newStatusValues = ["suspended", "withdrawn", "expelled", "alumni"];
  for (const val of newStatusValues) {
    try {
      await sql.unsafe(`ALTER TYPE student_status ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`✓ Added enum value: ${val}`);
    } catch (e: any) {
      console.log(`  Enum value '${val}' already exists or error: ${e.message}`);
    }
  }

  // 2. Create student_activity_timeline table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS student_activity_timeline (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ Created student_activity_timeline table");

  // 3. Create indexes
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS student_timeline_idx 
    ON student_activity_timeline(school_id, student_id, created_at)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS timeline_event_type_idx 
    ON student_activity_timeline(school_id, event_type)
  `);
  console.log("✓ Created indexes");

  // 4. Create student_documents table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS student_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      document_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_size INT,
      mime_type VARCHAR(100),
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ Created student_documents table");

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS student_doc_idx 
    ON student_documents(school_id, student_id)
  `);
  console.log("✓ Created student_doc_idx index");

  await sql.end();
  console.log("Migration complete!");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
