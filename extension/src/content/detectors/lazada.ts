import type { PlatformKey, ProductInfo } from "@priceguard/shared";
import {
  metaContent,
  parseVnd,
  readJsonLdProduct,
  scanSmallestPriceIn,
} from "./dom-helpers";

export function detectProduct(): ProductInfo | null {
  const fromLd = readJsonLdProduct();

  const name =
    document.querySelector<HTMLElement>(".pdp-mod-product-badge-title")?.textContent?.trim() ??
    document.querySelector<HTMLElement>(".pdp-product-name")?.textContent?.trim() ??
    document.querySelector<HTMLElement>('[class*="pdp-mod-product-name"]')?.textContent?.trim() ??
    document.querySelector<HTMLElement>("h1")?.textContent?.trim() ??
    metaContent("og:title")?.split("|")[0]?.split("-")[0]?.trim() ??
    fromLd?.name;

  if (!name) return null;

  let price: number | null = null;

  const priceEl =
    document.querySelector<HTMLElement>(".pdp-mod-product-price-showDiscount") ??
    document.querySelector<HTMLElement>(".pdp-price_type_normal") ??
    document.querySelector<HTMLElement>('[itemprop="price"]') ??
    document.querySelector<HTMLElement>(".pdp-mod-product-price-main");

  if (priceEl) {
    price =
      parseVnd(priceEl.getAttribute("content") ?? "") ??
      parseVnd(priceEl.textContent ?? "");
  }

  if (price == null && fromLd?.price != null) price = fromLd.price;

  const metaPrice = metaContent("product:price:amount") ?? metaContent("og:price:amount");
  if (price == null && metaPrice) price = parseVnd(metaPrice);

  const main =
    document.querySelector<HTMLElement>(".pdp-block, #root, main, [role='main']") ??
    document.body;
  if (price == null) price = scanSmallestPriceIn(main);

  if (price == null || price <= 0) return null;

  const platform: PlatformKey = "lazada";
  return {
    name: name.trim(),
    price,
    url: location.href,
    platform,
  };
}
