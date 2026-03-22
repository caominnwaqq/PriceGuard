import type { PlatformKey } from "@priceguard/shared";

/**
 * Trang chủ / landing sau khi bấm logo (pathname gần như rỗng).
 * Không dùng cho category/search — chỉ reset khi về root.
 */
export function isMarketplaceHomepage(href: string, platform: PlatformKey): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  const raw = u.pathname.replace(/\/+$/, "") || "/";
  if (raw !== "/") return false;

  switch (platform) {
    case "shopee":
    case "tiki":
    case "lazada":
      return true;
    default:
      return false;
  }
}

/**
 * Chỉ cho phép detect ở URL có khả năng là trang chi tiết sản phẩm.
 * Tránh detect nhầm ở search/listing dẫn đến giá sai khi user bấm "xem kết quả".
 */
export function isLikelyProductDetailPage(href: string, platform: PlatformKey): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }

  const path = u.pathname.toLowerCase();

  switch (platform) {
    case "shopee": {
      if (path.startsWith("/search") || u.searchParams.has("keyword")) return false;
      // Typical Shopee PDP URL: /<slug>-i.<shopId>.<itemId>
      return /-i\.\d+\.\d+/.test(path);
    }
    case "tiki": {
      if (path.startsWith("/search") || u.searchParams.has("q")) return false;
      // Typical Tiki PDP URL: /...-p<id>.html
      return /-p\d+\.html$/.test(path);
    }
    case "lazada": {
      if (path.startsWith("/catalog") || u.searchParams.has("q")) return false;
      // Typical Lazada PDP URL starts with /products/
      return path.startsWith("/products/");
    }
    default:
      return false;
  }
}

/**
 * Shopee/Tiki/Lazada đổi URL bằng history.pushState khi bấm logo — bắt để reload state ngay.
 */
export function onSpaLocationChange(callback: () => void): () => void {
  const run = () => {
    callback();
  };

  window.addEventListener("popstate", run);

  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);

  history.pushState = (...args: Parameters<History["pushState"]>) => {
    const out = push(...args);
    queueMicrotask(run);
    return out;
  };
  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    const out = replace(...args);
    queueMicrotask(run);
    return out;
  };

  return () => {
    window.removeEventListener("popstate", run);
    history.pushState = push;
    history.replaceState = replace;
  };
}
