import { db } from "./client.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("RESULT_TABLES:", JSON.stringify(result));
  } catch (err) {
    console.error("INSPECT_ERROR:", err);
  }
  process.exit(0);
}

main();
