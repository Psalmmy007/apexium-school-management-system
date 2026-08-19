import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    env: {
      DATABASE_URL:
        "postgresql://postgres.gadpsebirkwblhguxrjw:Mediocrity00%40%40%23%23@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@apexium/types": path.resolve(__dirname, "../../packages/types/src"),
      "@apexium/db": path.resolve(__dirname, "../../packages/db/src"),
    },
  },
});
