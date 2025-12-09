function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise(function (resolve) {
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true },
      function (tabs) {
        resolve(tabs[0]!);
      },
    );
  });
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

    const tab = await getActiveTab();
    console.log(tab);
  });
});
