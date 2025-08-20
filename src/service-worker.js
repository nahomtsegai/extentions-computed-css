const hoverByTab = new Map();
const lastByTab = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  const senderTabId = sender?.tab?.id;

  if (msg.type === "getHoverStatus") {
    sendResponse?.({ value: !!hoverByTab.get(msg.tabId) });
    return true;
  }

  if (msg.type === "toggleHover") {
    const id = msg.tabId;
    const next = !hoverByTab.get(id);
    hoverByTab.set(id, next);
    if (id != null) {
      chrome.tabs.sendMessage(id, { type: "setHover", value: next });
      chrome.runtime.sendMessage({ type: "hoverStatus", tabId: id, value: next });
    }
    sendResponse?.({ value: next });
    return true;
  }

  if (msg.type === "DCSI_RESULT") {
    const t = sender?.tab?.id;
    if (t != null) lastByTab.set(t, msg.payload);
    return true;
  }

  if (msg.type === "DCSI_SW_GET_LAST") {
    sendResponse?.({ payload: lastByTab.get(msg.tabId) || null });
    return true;
  }

  // NEW: accept content-script broadcast to keep popup in sync (e.g., after "m")
  if (msg.type === "hoverStatus" && typeof msg.value === "boolean") {
    const tabId = typeof msg.tabId === "number" ? msg.tabId : senderTabId;
    if (tabId != null) {
      hoverByTab.set(tabId, msg.value);
      chrome.runtime.sendMessage({ type: "hoverStatus", tabId, value: msg.value });
    }
    return true;
  }
});
