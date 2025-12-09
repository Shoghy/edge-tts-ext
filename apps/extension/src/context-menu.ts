import { type Messages } from "./types.ts";

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

    await chrome.runtime.sendMessage({
      text: info.selectionText,
      type: "ReadOutLoud",
    } satisfies Messages);
  });
});
