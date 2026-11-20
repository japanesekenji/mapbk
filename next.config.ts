import type { NextConfig } from "next";

// Cache Components is off for the MVP: most screens are interactive client
// pages that read Supabase directly, and access control lives in the database.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
