/**
 * Secure Platform Operator Provisioning CLI
 *
 * This CLI tool allows the system founder / site reliability engineer
 * to securely provision a genuine platform operator account.
 *
 * Usage:
 *   npx tsx scripts/provision-platform-operator.ts --email founder@apexium.io [--user-id <uuid>] [--name "Founder Name"]
 */
import { config } from "dotenv";
config(); // Load environment variables from .env if present

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

async function main() {
  const args = parseArgs();
  const email = (args.email || args.e || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("\n❌ Error: Valid email address is required.\n");
    console.log("Usage:");
    console.log("  npx tsx scripts/provision-platform-operator.ts --email founder@apexium.io [--name 'Founder Name'] [--user-id <uuid>]\n");
    process.exit(1);
  }

  const name = args.name || "Apexium Founder";
  let userId = args["user-id"] || args.userId;

  console.log("\n🛡️  Apexium SaaS — Platform Operator Provisioning Tool");
  console.log("========================================================");
  console.log(`Target Email: ${email}`);
  console.log(`Display Name: ${name}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

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
        console.log(`✅ Found existing Supabase Auth User ID: ${userId}`);

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
          console.log("✅ Updated Supabase Auth metadata to role: 'platform_operator'.");
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
          console.log(`✅ Created Supabase Auth user ID: ${userId}`);
          console.log(`🔑 Temporary Password: ${temporaryPassword}`);
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
  console.log("========================================================");
  console.log(`Record ID:   ${operatorRecord.id}`);
  console.log(`User ID:     ${operatorRecord.userId}`);
  console.log(`Email:       ${operatorRecord.email}`);
  console.log(`Role:        ${operatorRecord.role}`);
  console.log(`Status:      ${operatorRecord.isActive ? "ACTIVE" : "INACTIVE"}`);
  console.log("========================================================");
  console.log("\n👉 How to access the platform:");
  console.log("1. Go to your application login page: /auth/login");
  console.log(`2. Log in with ${email}`);
  console.log("3. Direct your browser to /platform (Platform Operator Dashboard)");
  console.log("4. Regular school admins will continue to be rejected with 403 Forbidden.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Fatal error provisioning platform operator:", err);
  process.exit(1);
});
