import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

// eslint-disable-next-line import/no-default-export
export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: "public/logo.png",
  },
  content_scripts: [
    {
      js: ["src/main.ts"],
      matches: ["https://*/*"],
    },
  ],
  permissions: ["contentSettings"],
});
