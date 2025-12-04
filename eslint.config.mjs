import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Explicitly register the react-hooks plugin
  {
    plugins: {
      "react-hooks": reactHooks,
    },
  },
  // Custom rule overrides for the project
  {
    rules: {
      // Warn on explicit any to encourage proper typing (was off, now warning)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      // Warn on exhaustive deps
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores
    "node_modules/**",
    "*.d.ts",
  ]),
]);

export default eslintConfig;
