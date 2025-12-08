chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    title: "Read Out Loud",
    contexts: ["selection"],
    id: "edge-tts",
  });

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== "edge-tts") {
      return;
    }

    const storage = await chrome.storage.local.get();
    const voice = storage.selectedVoice ?? "en-US-EmmaMultilingualNeural";
  });
});

interface Message {
  type: "SET_SELECTED_VOICE";
  voice: string;
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  if (message.type !== "SET_SELECTED_VOICE") {
    return;
  }

  await chrome.storage.local.set({
    selectedVoice: message.voice,
  });
});
