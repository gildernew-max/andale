import { defineConfig } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

// Bug-catching only. Do not turn on recommended/style presets — App.jsx is
// ~494KB and a style pass would force a rewrite. Compiler-hook extras
// (set-state-in-effect, immutability, …) stay off for the same reason.
export default defineConfig([
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["**/*.{test,spec}.{js,jsx}", "vite.config.js", "eslint.config.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
