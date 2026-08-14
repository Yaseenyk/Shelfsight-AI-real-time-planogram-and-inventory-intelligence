import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
  resolve: {
    // Mirror the "@/*" path alias from tsconfig so tests import modules exactly
    // as the application does, rather than through relative paths that would
    // keep working if the alias broke.
    alias: { "@": resolve(__dirname, ".") },
  },
});
