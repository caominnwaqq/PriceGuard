import type { PlatformKey, ProductInfo } from "@priceguard/shared";
import {
  metaContent,
  parseVnd,
  readJsonLdProduct,
  scanSmallestPriceIn,
} from "./dom-helpers";

export function detectProduct(): ProductInfo | null {
  const fromLd = readJsonLdProduct();
  const nameFromLd = fromLd?.name;

  const name =
    document.querySelector<HTMLElement>("h1.title")?.textContent?.trim() ??
    document.querySelector<HTMLElement>('[class*="ProductTitle"]')?.textContent?.trim() ??
    document.querySelector<HTMLElement>("h1")?.textContent?.trim() ??
    metaContent("og:title")?.split("|")[0]?.trim() ??
    nameFromLd;

  if (!name) return null;

  let price: number | null = null;

  const priceEl =
    document.querySelector<HTMLElement>(".product-price__current-price") ??
    document.querySelector<HTMLElement>('[class*="product-price"] [class*="current"]') ??
    document.querySelector<HTMLElement>('[data-testid="pdp-product-price"]');
  if (priceEl) price = parseVnd(priceEl.textContent ?? "");

  const metaPrice = metaContent("product:price:amount") ?? metaContent("og:price:amount");
  if (price == null && metaPrice) price = parseVnd(metaPrice);

  if (price == null && fromLd?.price != null) price = fromLd.price;

  const main =
    document.querySelector<HTMLElement>("#main, main, [role='main'], .product-detail") ??
    document.body;
  if (price == null) price = scanSmallestPriceIn(main);

  if (price == null || price <= 0) return null;

  const platform: PlatformKey = "tiki";
  return {
    name: name.trim(),
    price,
    url: location.href,
    platform,
  };
}
