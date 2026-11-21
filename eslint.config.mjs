// Lint rules for the whole repository. `npm run lint` fails on any warning, so these are limits, not suggestions.
// The size limits keep every module and function small enough to read, test and review on its own.
import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** Size and shape limits for application code. Blank lines and comments do not count. */
const LIMITS = {
  "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }],
  complexity: ["error", 12],
  "max-depth": ["error", 4],
  "max-params": ["error", 5],
};

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts", "*.tsbuildinfo"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      ...LIMITS,
      "no-console": "error",
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "xxx", "hack"], location: "start" }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.tsx", "src/hooks/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "error" },
  },
  { files: ["src/**/*.tsx"], ...jsxA11y.flatConfigs.recommended },
  {
    // A scrollable region must be reachable from the keyboard (axe: scrollable-region-focusable), so a region
    // role may take tabIndex 0 just as a tab panel may.
    files: ["src/**/*.tsx"],
    rules: { "jsx-a11y/no-noninteractive-tabindex": ["error", { roles: ["tabpanel", "region"] }] },
  },
  {
    // The one place that may write to the console: it formats structured logs for Cloud Logging.
    files: ["src/server/logger.ts", "src/instrumentation.ts"],
    rules: { "no-console": "off" },
  },
  {
    // Tests: long scenario functions and fixtures are normal, so only the structural limits are relaxed.
    files: ["**/*.test.{ts,tsx}", "src/server/testing/**"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
);
