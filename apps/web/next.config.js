/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages so Next.js can process their TypeScript
  transpilePackages: ["@apexium/types", "@apexium/db"],

  // Strict mode for React — catches common bugs early
  reactStrictMode: true,

  // Ensure environment variables are available at runtime (not build time)
  // All NEXT_PUBLIC_ vars are exposed to the browser; others are server-only
  env: {},

  // Image optimization — allow Supabase storage as an image source
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
