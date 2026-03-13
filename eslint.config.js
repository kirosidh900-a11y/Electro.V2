import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  /* =========================
     Node Backend
  ========================= */

  {
    files: ["src/**/*.js"],
    ignores: ["src/public/**"],

    ...js.configs.recommended,

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.node,
      },
    },

    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },

  /* =========================
     Browser Frontend
  ========================= */

  {
    files: ["src/public/**/*.js"],

    ...js.configs.recommended,

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.browser,
        Swal: "readonly",
      },
    },

    rules: {
      "no-unused-vars": "warn",
    },
  },
]);
