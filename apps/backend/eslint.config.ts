import { defineConfig } from "eslint/config";
import { defaultConfig } from "@edge-tts/eslint";
import globals from "globals";

// eslint-disable-next-line import/no-default-export
export default defineConfig([
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  ...defaultConfig(import.meta.dirname),
]);
