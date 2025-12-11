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
  action: {
    default_icon: {
      48: "public/logo.png",
    },
    default_popup: "src/popup/index.html",
  },
  permissions: ["contextMenus", "storage"],
  background: {
    service_worker: "src/context-menu.ts",
  },
  web_accessible_resources: [
    {
      resources: ["src/player/index.html"],
      matches: ["<all_urls>"],
    },
  ],
});
