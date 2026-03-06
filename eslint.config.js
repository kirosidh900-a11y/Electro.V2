import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([

  // Node backend (controllers, routes, middleware, etc.)
  {
    files: ["src/**/*.js"],
    ignores: ["src/public/**"],

    ...js.configs.recommended,

    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },

  // Browser frontend (public JS)
  {
    files: ["src/public/**/*.js"],

    ...js.configs.recommended,

    languageOptions: {
      globals: {
        ...globals.browser,
        Swal: "readonly"
      }
    }
  }

]);