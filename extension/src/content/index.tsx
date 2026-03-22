import type { PostPricesResponse } from "@priceguard/shared";
import { detectForPlatform, platformFromUrl } from "./detectors";
import {
  isLikelyProductDetailPage,
  isMarketplaceHomepage,
  onSpaLocationChange,
} from "./navigation";
import "./content.css";

const HOST_ID = "priceguard-inline-root";
const DEBUG_CONTENT = false;

let lastDetectKey = "";
let badgeHost: HTMLDivElement | null = null;
let lastPathKey: string | null = null;
let consecutiveNulls = 0;
let extensionContextAlive = true;

const NULL_CLEAR_AFTER = 4;

function tabSessionDataKey(tabId: number): string {
  return `priceguard:tab:${tabId}:data`;
}

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function clearBadge() {
  badgeHost = null;
  document.getElementById(HOST_ID)?.remove();
}

function formatVND(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

function isExtensionContextError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Extension context invalidated") ||
    msg.includes("Receiving end does not exist") ||
    msg.includes("context invalidated") ||
    msg.includes("The message port closed before a response was received")
  );
}

function debugContentError(err: unknown) {
  if (!DEBUG_CONTENT) return;
  console.error("[PriceGuard content]", err);
}

async function safeSendMessage<T>(message: unknown): Promise<T | null> {
  if (!extensionContextAlive || !chrome?.runtime?.id) return null;
  try {
    return (await chrome.runtime.sendMessage(message)) as T;
  } catch (e) {
    if (isExtensionContextError(e)) {
      extensionContextAlive = false;
      return null;
    }
    debugContentError(e);
    return null;
  }
}

function mountBadge(payload: PostPricesResponse) {
  let host = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:2147483646;max-width:280px;";
    document.body.appendChild(host);
  }
  const cheapest = payload.prices.find((p) => p.isCheapest) ?? payload.prices[0];
  if (!cheapest) return;
  badgeHost = host;
  host.replaceChildren();

  const root = document.createElement("div");
  root.className = "pg-root rounded-lg border border-slate-200 bg-white p-3 font-sans text-sm shadow-lg";

  const title = document.createElement("div");
  title.className = "mb-1 font-semibold text-slate-800";
  title.textContent = "PriceGuard";

  const productName = document.createElement("div");
  productName.className = "line-clamp-2 text-xs text-slate-600";
  productName.textContent = payload.product.name;

  const row = document.createElement("div");
  row.className = "mt-2 flex items-baseline gap-2";

  const label = document.createElement("span");
  label.className = "text-xs text-slate-500";
  label.textContent = "Re nhat:";

  const platform = document.createElement("span");
  platform.className = "font-semibold text-emerald-600";
  platform.textContent = cheapest.platform;

  const price = document.createElement("span");
  price.className = "font-bold text-slate-900";
  price.textContent = formatVND(cheapest.price);

  row.append(label, platform, price);
  root.append(title, productName, row);
  host.appendChild(root);
}

async function clearProductState() {
  lastDetectKey = "";
  clearBadge();
  await safeSendMessage({ type: "NO_PRODUCT_CONTEXT" });
}

async function runDetect() {
  if (!extensionContextAlive) return;

  const pathNow = `${location.pathname}${location.search}`;
  const pathChanged = pathNow !== lastPathKey;
  if (pathChanged) {
    lastPathKey = pathNow;
    lastDetectKey = "";
    consecutiveNulls = 0;
  }

  const platform = platformFromUrl(location.href);
  if (!platform) {
    consecutiveNulls = 0;
    return;
  }

  /** Trang chủ (logo): không gọi API so sánh — chỉ xóa state tab này */
  if (isMarketplaceHomepage(location.href, platform)) {
    consecutiveNulls = 0;
    if (pathChanged) {
      await clearProductState();
    }
    return;
  }

  // Trang search/listing không đủ tín hiệu để so sánh chính xác.
  if (!isLikelyProductDetailPage(location.href, platform)) {
    consecutiveNulls = 0;
    if (pathChanged) {
      await clearProductState();
    }
    return;
  }

  const info = detectForPlatform(platform);
  if (!info) {
    consecutiveNulls++;
    if (consecutiveNulls >= NULL_CLEAR_AFTER) {
      consecutiveNulls = 0;
      await clearProductState();
    }
    return;
  }

  consecutiveNulls = 0;
  const key = `${info.name}|${info.price}|${info.platform}|${info.url}`;
  if (key === lastDetectKey) return;
  lastDetectKey = key;
  await safeSendMessage({
    type: "PRODUCT_DETECTED",
    payload: info,
  });
}

const debouncedRun = debounce(runDetect, 600);

async function bindSessionStorageForTab(): Promise<void> {
  const r = (await safeSendMessage<{ tabId: number | null }>({
    type: "GET_SENDER_TAB_ID",
  })) as { tabId: number | null } | null;
  const tabId = r?.tabId ?? null;
  if (tabId == null) return;

  try {
    const dataKey = tabSessionDataKey(tabId);
    const initial = await chrome.storage.session.get(dataKey);
    const raw = initial[dataKey] as PostPricesResponse | undefined;
    if (raw) mountBadge(raw);

    chrome.storage.onChanged.addListener(
      (changes, areaName: chrome.storage.AreaName) => {
        if (!extensionContextAlive) return;
        if (areaName !== "session") return;
        const ch = changes[dataKey];
        if (!ch) return;
        if (ch.newValue == null) {
          clearBadge();
          return;
        }
        try {
          mountBadge(ch.newValue as PostPricesResponse);
        } catch {
          /* ignore */
        }
      },
    );
  } catch (e) {
    if (isExtensionContextError(e)) {
      extensionContextAlive = false;
      return;
    }
    debugContentError(e);
  }
}

void bindSessionStorageForTab();

const obs = new MutationObserver(() => {
  void debouncedRun();
});
obs.observe(document.documentElement, { childList: true, subtree: true });

onSpaLocationChange(() => {
  void runDetect();
});

void runDetect();
