import { hc } from "hono/client";
import type { AppRouter } from "@edge-tts/backend";

export const server = hc<AppRouter>("http://localhost:3000/");

export const DEFAULT_VOICE = "en-US-EmmaMultilingualNeural";

export function setVoice(voice: string): Promise<void> {
  return chrome.storage.local.set({ voice });
}

export async function getVoice(): Promise<string> {
  const data = await chrome.storage.local.get("voice");
  console.log(data);
  return (data.voice as string) ?? DEFAULT_VOICE;
}
