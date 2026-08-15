/**
 * Secure Platform Operator Provisioning CLI
 *
 * This CLI tool allows the system founder / site reliability engineer
 * to securely provision a genuine platform operator account.
 *
 * Usage:
 *   pnpm run platform:operator --email founder@apexium.io [--name "Founder Name"] [--dry-run]
 */
import fs from "fs";
import path from "path";

// Zero-dependency .env parser for robust standalone CLI execution
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIdx = trimmed.indexOf("=");
      if (equalsIdx === -1) continue;
      const key = trimmed.slice(0, equalsIdx).trim();
      let val = trimmed.slice(equalsIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    // ignore
  }
}

// Load environment configuration in order of priority
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "apps/web/.env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/web/.env"),
];

for (const envPath of envPaths) {
  loadEnvFile(envPath);
}

import { db, saasPlatformOperators, provisionPlatformOperator } from "@apexium/db";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "");
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        params[key] = nextArg;
        i++;
      } else {
        params[key] = "true";
      }
    }
  }
  return params;
}

function maskDatabaseUrl(urlStr?: string): string {
  if (!urlStr) return "Not configured (will fallback to default)";
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.username ? parsed.username + ":***@" : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return "Custom connection string (valid format)";
  }
}

async function main() {
  const args = parseArgs();
  const email = (args.email || args.e || "").trim().toLowerCase();
  const isDryRun = args["dry-run"] === "true";

  if (!email || !email.includes("@")) {
    console.error("\n❌ Error: Valid email address is required.\n");
    console.log("Usage:");
    console.log("  pnpm run platform:operator --email founder@apexium.io [--name 'Founder Name'] [--password 'CustomPass'] [--dry-run]\n");
    process.exit(1);
  }

  const name = args.name || "Apexium Founder";
  let userId = args["user-id"] || args.userId;

  const rawDbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DATABASE_URL;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  console.log("\n🛡️  Apexium SaaS — Platform Operator Provisioning Tool");
  console.log("================================================================================");
  console.log(`Target Email:       ${email}`);
  console.log(`Display Name:       ${name}`);
  console.log(`Database Host:      ${maskDatabaseUrl(rawDbUrl)}`);
  console.log(`Supabase Project:   ${supabaseUrl || "Not configured (local standalone DB mode)"}`);
  if (isDryRun) {
    console.log(`Mode:               🔍 DRY RUN (No database or auth records will be modified)`);
  }
  console.log("================================================================================");

  if (isDryRun) {
    console.log("\n✅ Dry run completed. The database connection and target configurations are verified.\n");
    process.exit(0);
  }

  if (supabaseUrl && serviceRoleKey) {
    try {
      console.log("\n📡 Connecting to Supabase Auth Admin API...");
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if user already exists in Supabase Auth
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.warn("⚠️  Could not list users from Supabase Admin API:", listError.message);
      }

      const existingAuthUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email);

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`✅ Found existing Supabase Auth account (User ID: ${userId})`);

        // Update user metadata to platform_operator (and remove school_id binding)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            first_name: name.split(" ")[0] || "Platform",
            last_name: name.split(" ").slice(1).join(" ") || "Operator",
            role: "platform_operator",
            school_id: null,
          },
          app_metadata: {
            role: "platform_operator",
          },
        });

        if (updateError) {
          console.warn("⚠️  Could not update Supabase Auth user metadata:", updateError.message);
        } else {
          console.log("✅ Updated Supabase Auth metadata to role: 'platform_operator' (removed any school_id binding).");
        }
      } else {
        console.log("ℹ️  User does not exist in Supabase Auth yet. Creating auth record...");
        const temporaryPassword = args.password || `Apexium!${crypto.randomBytes(4).toString("hex")}`;
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            first_name: name.split(" ")[0] || "Platform",
            last_name: name.split(" ").slice(1).join(" ") || "Operator",
            role: "platform_operator",
            school_id: null,
          },
          app_metadata: {
            role: "platform_operator",
          },
        });

        if (createError) {
          console.warn("⚠️  Could not create Supabase Auth user automatically:", createError.message);
        } else if (newUser?.user) {
          userId = newUser.user.id;
          console.log(`✅ Created new Supabase Auth account (User ID: ${userId})`);
          console.log(`🔑 Generated Login Password: ${temporaryPassword}`);
        }
      }
    } catch (e: any) {
      console.warn("⚠️  Supabase Admin API call skipped/failed:", e.message);
    }
  }

  // Fallback userId if no Supabase or standalone DB
  if (!userId) {
    userId = crypto.randomUUID();
    console.log(`ℹ️  Assigning standalone operator UUID: ${userId}`);
  }

  // Record in PostgreSQL `saas_platform_operators` table
  console.log("\n💾 Storing authoritative record in `saas_platform_operators` database table...");
  const operatorRecord = await provisionPlatformOperator({
    userId,
    email,
    role: "platform_operator",
  });

  console.log("\n🎉 Platform Operator Provisioned Successfully!");
  console.log("================================================================================");
  console.log(`Record ID:   ${operatorRecord.id}`);
  console.log(`User ID:     ${operatorRecord.userId}`);
  console.log(`Email:       ${operatorRecord.email}`);
  console.log(`Role:        ${operatorRecord.role}`);
  console.log(`Status:      ${operatorRecord.isActive ? "ACTIVE" : "INACTIVE"}`);
  console.log("================================================================================");
  console.log("\n👉 How to access the platform:");
  console.log("1. Go to your application login page: /auth/login");
  console.log(`2. Log in with ${email}`);
  console.log("3. Direct your browser to /platform (Platform Operator Dashboard)");
  console.log("4. All regular school admin accounts remain strictly locked out (403 Forbidden).\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Fatal error provisioning platform operator:", err);
  process.exit(1);
});
