import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // No jsdom: the code under test is pure logic (regex analysis, scanning,
    // validation). Component tests would need @testing-library/react plus a
    // jsdom environment, which is not worth the dependency weight yet.
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});