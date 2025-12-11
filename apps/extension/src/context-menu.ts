import { catchUnwindAsync } from "rusting-js";
import { registerMessageListener, sendTo } from "./events.ts";
import { type Tab } from "./utils.ts";

const PLAYER_URL = "src/player/index.html";

function getActiveTab(): Promise<Tab | undefined> {
  return new Promise(function (resolve) {
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true },
      function (tabs) {
        resolve(tabs[0]);
      },
    );
  });
}

async function createPlayerTab(): Promise<void> {
  const prevTab = await chrome.tabs.query({ active: true });

  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(PLAYER_URL),
    index: 0,
    active: true,
  });

  await chrome.tabs.update(tab.id!, { pinned: true });

  await new Promise<void>((resolve) => {
    const unsubscribe = registerMessageListener("contextMenu", {
      playerReady() {
        resolve();
        unsubscribe();
        return true;
      },
    });
  });

  await sendTo("player", { method: "goBack", args: [prevTab[0]] });
}

function createPlayerFrame(): void {
  const frame = document.createElement("iframe");
  frame.src = chrome.runtime.getURL(PLAYER_URL);
  frame.style.position = "absolute";
  frame.style.height = "0";
  frame.style.borderWidth = "0";
  document.body.appendChild(frame);
}

async function injectPlayer(tab?: Tab): Promise<void> {
  if (tab === undefined) {
    await createPlayerTab();
    return;
  }

  const result = await catchUnwindAsync(() =>
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: createPlayerFrame,
    }),
  );

  if (result.isOk()) return;

  await createPlayerTab();
}

async function playText(text: string): Promise<void> {
  const hasPlayer = await sendTo("player", { method: "stop" }).then((result) =>
    result.isOkAnd((ok) => ok),
  );
  if (!hasPlayer) {
    await injectPlayer(await getActiveTab());
  }

  await sendTo("player", { method: "play", args: [text] });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    title: "Read Out Loud",
    contexts: ["selection"],
    id: "edge-tts",
  });

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== "edge-tts" || info.selectionText === undefined) {
      return;
    }

    await playText(info.selectionText);
  });
});
