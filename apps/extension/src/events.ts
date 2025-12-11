import { catchUnwindAsync } from "rusting-js";
import { type Result } from "rusting-js/enums";
import { z } from "zod/v4";
import { type Tab } from "./utils.ts";

interface PlayerEvents {
  stop: [];
  play: [text: string];
  goBack: [Tab?];
}

interface ContextMenuEvents {
  playerReady: [];
}

export interface ExtEvents {
  player: PlayerEvents;
  contextMenu: ContextMenuEvents;
}

export type EventMethods<T extends Record<keyof T, unknown[]>> = {
  [K in keyof T]: (...args: T[K]) => Promise<boolean> | boolean;
};

export type EventMapper<T extends Record<keyof T, unknown[]>> = {
  [K in keyof T]: T[K] extends [] ? { method: K } : { method: K; args: T[K] };
}[keyof T];

export function sendTo<T extends keyof ExtEvents>(
  dest: T,
  // @ts-expect-error invalid type
  event: EventMapper<ExtEvents[T]>,
): Promise<Result<boolean, Error>> {
  return catchUnwindAsync(() => chrome.runtime.sendMessage({ ...event, dest }));
}

const messageZod = z.object({
  dest: z.string(),
  method: z.string(),
  args: z.array(z.unknown()).optional(),
});

export function registerMessageListener<T extends keyof ExtEvents>(
  name: T,
  // @ts-expect-error invalid type
  handlers: Partial<EventMethods<ExtEvents[T]>>,
): () => void {
  function handleMessage(
    message: unknown,
    _: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): void {
    const result = messageZod.safeParse(message);
    if (!result.success || result.data.dest !== name) return;
    const data = result.data;
    const handler = handlers[data.method as keyof typeof handlers];

    if (handler === undefined) {
      console.error("Handler doesn't exist");
      return;
    }

    // @ts-expect-error invalid type
    sendResponse(handler(...(data.args ?? [])));
  }

  chrome.runtime.onMessage.addListener(handleMessage);

  return (): void => {
    chrome.runtime.onMessage.removeListener(handleMessage);
  };
}
