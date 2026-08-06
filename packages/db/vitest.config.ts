import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60000,
    hookTimeout: 60000,
    // Load the root .env.local so tests connect to the real Supabase database
    env: {
      DATABASE_URL:
        "postgresql://postgres.gadpsebirkwblhguxrjw:Mediocrity00%40%40%23%23@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    },
  },
});
