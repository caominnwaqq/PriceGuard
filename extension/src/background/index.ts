import type {
  PostPricesRequest,
  PostPricesResponse,
  ProductInfo,
} from "@priceguard/shared";
import { postPrices } from "./api";
import { clearCached, getCached, setCached } from "./cache";
import { registerWatchlistAlarms } from "./alarms";

registerWatchlistAlarms();

/** Dedupe fetch theo từng tab */
const lastFetchKeyByTab = new Map<number, string>();

function requestKey(body: PostPricesRequest): string {
  return `${body.platform}|${body.currentUrl}|${body.currentPrice}|${body.productName.slice(0, 120)}`;
}

async function resolveTabId(
  messageTabId: number | undefined,
  senderTabId: number | undefined,
): Promise<number | undefined> {
  if (typeof messageTabId === "number" && messageTabId >= 0) return messageTabId;
  if (typeof senderTabId === "number" && senderTabId >= 0) return senderTabId;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function updateBadge(data: PostPricesResponse | null): Promise<void> {
  if (!data) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const current = data.prices.find((p) => p.isCurrent);
  const cheapest = data.prices.find((p) => p.isCheapest);
  if (!current || !cheapest) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  if (current.price > cheapest.price) {
    await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
    await chrome.action.setBadgeText({ text: "!" });
  } else {
    await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
    await chrome.action.setBadgeText({ text: "" });
  }
}

/** Chỉ đổi badge khi tab vừa fetch trùng tab đang active (tránh ghi đè khi đang xem tab khác). */
async function updateBadgeIfTabActive(tabId: number, data: PostPricesResponse): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id === tabId) await updateBadge(data);
}

async function refreshBadgeForActiveTab(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const id = tabs[0]?.id;
  if (id == null) {
    await updateBadge(null);
    return;
  }
  const c = await getCached(id);
  await updateBadge(c?.data ?? null);
}

chrome.tabs.onActivated.addListener(() => {
  void refreshBadgeForActiveTab();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  lastFetchKeyByTab.delete(tabId);
  void clearCached(tabId);
  void refreshBadgeForActiveTab();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_SENDER_TAB_ID") {
    sendResponse({ tabId: sender.tab?.id ?? null });
    return false;
  }

  if (message?.type === "NO_PRODUCT_CONTEXT") {
    void (async () => {
      const tabId = await resolveTabId(undefined, sender.tab?.id);
      if (tabId == null) {
        sendResponse({ ok: false });
        return;
      }
      lastFetchKeyByTab.delete(tabId);
      await clearCached(tabId);
      const active = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active[0]?.id === tabId) await updateBadge(null);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "GET_PRICE_STATE") {
    void (async () => {
      const tabId = await resolveTabId(message.tabId as number | undefined, undefined);
      if (tabId == null) {
        sendResponse(null);
        return;
      }
      const c = await getCached(tabId);
      sendResponse(c?.data ?? null);
    })();
    return true;
  }

  if (message?.type === "PRODUCT_DETECTED") {
    const payload = message.payload as ProductInfo | undefined;
    const tabId = sender.tab?.id;
    const normalizedPrice = payload?.price != null ? Math.round(payload.price) : null;
    if (
      !payload?.name ||
      normalizedPrice == null ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0 ||
      !payload.platform ||
      tabId == null
    ) {
      sendResponse({ ok: false });
      return false;
    }

    const body: PostPricesRequest = {
      productName: payload.name,
      currentUrl: payload.url,
      platform: payload.platform,
      currentPrice: normalizedPrice,
    };

    const key = requestKey(body);
    if (key === lastFetchKeyByTab.get(tabId)) {
      sendResponse({ ok: true, deduped: true });
      return false;
    }

    void (async () => {
      try {
        const data = await postPrices(body);
        lastFetchKeyByTab.set(tabId, key);
        await setCached(tabId, data);
        await updateBadgeIfTabActive(tabId, data);
        sendResponse({ ok: true });
      } catch (e) {
        console.error("[PriceGuard background]", e);
        sendResponse({ ok: false, error: String(e) });
      }
    })();

    return true;
  }

  return false;
});
