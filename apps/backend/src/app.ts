import { Hono } from "hono";

export const app = new Hono().get("/health", (c) => c.text("Hello World!"));
export type AppRouter = typeof app;
