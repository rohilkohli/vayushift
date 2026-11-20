import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Next compiles JSX itself; tests need the automatic runtime so components render without importing React.
  oxc: { jsx: { runtime: "automatic" } },
  // Server and domain tests run in Node. Files that render components opt in to jsdom with
  // `// @vitest-environment jsdom` on their first line.
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
});
