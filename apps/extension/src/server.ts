import { hc } from "hono/client";
import type { AppRouter } from "@edge-tts/backend";

export const server = hc<AppRouter>("http://localhost:3000/");
