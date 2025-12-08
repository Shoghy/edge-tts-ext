import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig, type Config } from "eslint/config";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import importPlugin from "eslint-plugin-import";

export const defaultConfig = (
  tsDir: string,
  allowDefaultProject: string[] = [],
): Config[] =>
  defineConfig([
    {
      files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
      plugins: { js },
      extends: ["js/recommended"],
      languageOptions: {
        parserOptions: {
          projectService: {
            defaultProject: "tsconfig.json",
            allowDefaultProject: ["eslint.config.ts", ...allowDefaultProject],
          },
          tsconfigRootDir: tsDir,
        },
      },
    },
    tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
    {
      plugins: {
        import: importPlugin,
      },
      rules: {
        semi: ["error", "always"],
        "linebreak-style": ["error", "unix"],
        "no-trailing-spaces": ["warn", { ignoreComments: true }],
        eqeqeq: "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            varsIgnorePattern: "^_",
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        "comma-dangle": ["error", "always-multiline"],
        "@typescript-eslint/no-shadow": "warn",
        "import/order": "warn",
        "import/extensions": ["error", "ignorePackages"],
        "@typescript-eslint/strict-boolean-expressions": "error",
        curly: ["error", "multi-line", "consistent"],
        "@typescript-eslint/consistent-type-imports": [
          "warn",
          { prefer: "type-imports", fixStyle: "inline-type-imports" },
        ],
        "@typescript-eslint/no-deprecated": "warn",
        "@typescript-eslint/explicit-function-return-type": "error",
        "import/no-default-export": "error",
        "@typescript-eslint/no-floating-promises": "error",
      },
    },
  ]);
