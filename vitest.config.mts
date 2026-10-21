import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.db.test.ts"],
        },
      },
      {
        // Runs against a real Neon branch (DATABASE_URL). Files share one
        // database and reset it between tests, so they run one at a time.
        extends: true,
        resolve: {
          alias: {
            "server-only": fileURLToPath(
              new URL("./src/test/server-only.ts", import.meta.url),
            ),
          },
        },
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          setupFiles: ["src/test/setup-db.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
