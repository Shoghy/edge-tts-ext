import { defineConfig } from "eslint/config";
import { defaultConfig } from "@edge-tts/eslint";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

// eslint-disable-next-line import/no-default-export
export default defineConfig([
  { ignores: ["dist/"] },
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  ...defaultConfig(import.meta.dirname, ["manifest.config.ts"]),
  pluginReact.configs.flat.recommended!,
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/self-closing-comp": "warn",
    },
  },
]);
