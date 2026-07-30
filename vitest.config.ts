import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", ".kilo", ".next", ".claude/worktrees/**"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["services/**/*.ts", "repositories/**/*.ts", "lib/**/*.ts"],
      exclude: ["**/*.test.ts", "node_modules", ".next"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
