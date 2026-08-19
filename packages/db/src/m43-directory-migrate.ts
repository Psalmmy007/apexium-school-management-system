import { sql } from "drizzle-orm";
import { db } from "./client";

export async function runM43Migration() {
  console.log("Running Milestone 43 Directory Migration...");

  // 1. Add directory columns to schools if they don't exist
  await db.execute(sql`
    ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS listing_status varchar(30) NOT NULL DEFAULT 'active_tenant',
    ADD COLUMN IF NOT EXISTS school_type varchar(50),
    ADD COLUMN IF NOT EXISTS state varchar(100),
    ADD COLUMN IF NOT EXISTS city varchar(100),
    ADD COLUMN IF NOT EXISTS listing_verified boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_token varchar(128),
    ADD COLUMN IF NOT EXISTS flagged_domain_mismatch boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS flag_reason varchar(255),
    ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;
  `);

  // Ensure all existing schools are marked as active_tenant and listing_verified = true
  await db.execute(sql`
    UPDATE schools
    SET listing_status = 'active_tenant', listing_verified = true
    WHERE listing_status IS NULL OR listing_status = 'active_tenant';
  `);

  // 2. Create school_directory_views table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS school_directory_views (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      event_type varchar(30) NOT NULL,
      period_reported boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_dir_views_school_id ON school_directory_views(school_id);
    CREATE INDEX IF NOT EXISTS idx_dir_views_created_at ON school_directory_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_dir_views_period_reported ON school_directory_views(period_reported);
  `);

  console.log("Milestone 43 Migration completed successfully.");
}

runM43Migration()
  .then(() => {
    console.log("Finished.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
