import type { PlatformKey, ProductInfo } from "@priceguard/shared";
import { metaContent, parseVnd, readJsonLdProduct } from "./dom-helpers";

export function detectProduct(): ProductInfo | null {
  const nameEl =
    document.querySelector<HTMLElement>("h1") ??
    document.querySelector<HTMLElement>('[data-testid="lblPDPDetailProductName"]');
  const name =
    nameEl?.textContent?.trim() ??
    metaContent("og:title")?.split("|")[0]?.split("-")[0]?.trim();
  if (!name) return null;

  const priceCandidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      "div[class*='pdp-product-price'], span[class*='price'], div[data-testid*='price']",
    ),
  );
  let best: number | null = null;
  for (const el of priceCandidates) {
    const t = el.textContent ?? "";
    if (!t.includes("₫") && !t.includes("đ")) continue;
    const p = parseVnd(t);
    if (p != null && p > 0 && (best == null || p < best)) best = p;
  }
  if (best == null) {
    const bodyText = document.body?.innerText ?? "";
    const m = bodyText.match(/([\d.]+)\s*[₫đ]/);
    if (m) best = parseVnd(m[1] ?? "");
  }
  const fromLd = readJsonLdProduct();
  if (best == null && fromLd?.price != null) best = fromLd.price;
  if (best == null) return null;

  const platform: PlatformKey = "shopee";
  return {
    name,
    price: best,
    url: location.href,
    platform,
  };
}
