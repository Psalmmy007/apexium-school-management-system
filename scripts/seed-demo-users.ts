import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gadpsebirkwblhguxrjw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function seedDemoData() {
  console.log("🌱 Creating demo accounts in Supabase Auth...");

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const DEMO_SCHOOL_ID = "school-apexium-demo-001";
  const DEMO_SCHOOL_NAME = "Apexium Model International School";

  const DEMO_USERS = [
    {
      email: "admin@apexium.edu",
      password: "DemoAdmin123!",
      role: "admin",
      firstName: "Samuel",
      lastName: "Okonkwo",
    },
    {
      email: "teacher@apexium.edu",
      password: "DemoTeacher123!",
      role: "teacher",
      firstName: "Amina",
      lastName: "Bello",
    },
    {
      email: "parent@apexium.edu",
      password: "DemoParent123!",
      role: "parent",
      firstName: "David",
      lastName: "Adeyemi",
    },
    {
      email: "student@apexium.edu",
      password: "DemoStudent123!",
      role: "student",
      firstName: "Chidi",
      lastName: "Adeyemi",
    },
  ];

  for (const u of DEMO_USERS) {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = listData?.users?.find((usr) => usr.email === u.email);

    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          school_id: DEMO_SCHOOL_ID,
          school_name: DEMO_SCHOOL_NAME,
          role: u.role,
          first_name: u.firstName,
          last_name: u.lastName,
        },
      });

      if (error || !data.user) {
        console.error(`❌ Failed to create user ${u.email}:`, error?.message);
      } else {
        console.log(`✅ Created demo user: ${u.email} (${u.role.toUpperCase()})`);
      }
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: u.password,
        user_metadata: {
          school_id: DEMO_SCHOOL_ID,
          school_name: DEMO_SCHOOL_NAME,
          role: u.role,
          first_name: u.firstName,
          last_name: u.lastName,
        },
      });

      if (error) {
        console.error(`❌ Failed to update user ${u.email}:`, error.message);
      } else {
        console.log(`🔄 Updated demo user credentials: ${u.email} (${u.role.toUpperCase()})`);
      }
    }
  }

  console.log("\n🎉 All 4 demo accounts are live and ready for login!");
}

seedDemoData().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
