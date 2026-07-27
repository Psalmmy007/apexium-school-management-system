import postgres from "postgres";

async function main() {
  // Connect to default 'postgres' database
  const sql = postgres("postgresql://postgres:postgres@localhost:5432/postgres");
  try {
    console.log("Creating database apexium_dev...");
    await sql`CREATE DATABASE apexium_dev`;
    console.log("✅ Database apexium_dev created successfully!");
  } catch (err: any) {
    if (err.code === "42P04") {
      console.log("ℹ️ Database apexium_dev already exists.");
    } else {
      console.error("❌ Error creating database:", err.message);
    }
  } finally {
    await sql.end();
  }
}

main();
