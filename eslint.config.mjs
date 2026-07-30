import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Local architecture-guardrail plugin (no npm install needed)
const ndcRules = require("./eslint-rules/index.js");

const eslintConfig = [
  {
    ignores: [".next/**", "generated/**", "node_modules/**", "next-env.d.ts", "docs/**", ".claude/**", "public/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  },
  {
    // Architecture guardrails — apply to all TS/JS source files
    files: ["app/api/**/*.ts", "services/**/*.ts"],
    plugins: {
      ndc: ndcRules,
    },
    rules: {
      "ndc/no-db-in-api": "error",
    },
  },
  {
    files: ["next.config.js", "eslint-rules/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
