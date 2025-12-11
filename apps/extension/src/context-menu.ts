import { catchUnwindAsync } from "rusting-js";
import { sendTo } from "./events.ts";

type Tab = chrome.tabs.Tab;

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
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(PLAYER_URL),
    index: 0,
    active: false,
  });

  await chrome.tabs.update(tab.id!, { pinned: true });
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
