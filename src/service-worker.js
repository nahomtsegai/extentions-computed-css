
// Track hover state per tab
const hoverByTab = new Map();
const lastByTab = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === 'getHoverStatus') {
    const { tabId } = msg;
    sendResponse?.({ value: !!hoverByTab.get(tabId) });
    return;
  }

  if (msg.type === 'toggleHover') {
    const { tabId } = msg;
    const next = !hoverByTab.get(tabId);
    hoverByTab.set(tabId, next);
    if (tabId != null) {
      chrome.tabs.sendMessage(tabId, { type: 'setHover', value: next });
      chrome.runtime.sendMessage({ type: 'hoverStatus', tabId, value: next });
    }
    sendResponse?.({ value: next });
    return;
  }

  if (msg.type === 'DCSI_RESULT') {
    const tabId = sender?.tab?.id;
    if (tabId != null) lastByTab.set(tabId, msg.payload);
    return;
  }

  if (msg.type === 'DCSI_SW_GET_LAST') {
    const { tabId } = msg;
    sendResponse?.({ payload: lastByTab.get(tabId) || null });
    return;
  }
});
