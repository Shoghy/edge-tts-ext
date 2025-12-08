import { app } from "./app.ts";

// eslint-disable-next-line import/no-default-export
export default {
  port: 3000,
  fetch: app.fetch,
};
