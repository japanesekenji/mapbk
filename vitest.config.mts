import { defineConfig } from "vitest/config";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const alias = { "@": path.resolve(import.meta.dirname, "src") };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          // Database tests share seeded rows; run files one at a time.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "api",
          // HTTP tests against the running dev server (docker compose up app).
          include: ["tests/api/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
