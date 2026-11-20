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
  // Docker on Windows does not forward file events from bind mounts, so the dev container
  // sets NEXT_WATCH_POLL=1 and Next.js polls for changes instead.
  ...(process.env.NEXT_WATCH_POLL ? { watchOptions: { pollIntervalMs: 1000 } } : {}),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
