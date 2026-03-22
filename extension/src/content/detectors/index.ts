import type { PlatformKey, ProductInfo } from "@priceguard/shared";
import { detectProduct as lazada } from "./lazada";
import { detectProduct as shopee } from "./shopee";
import { detectProduct as tiki } from "./tiki";

export function detectForPlatform(platform: PlatformKey): ProductInfo | null {
  switch (platform) {
    case "shopee":
      return shopee();
    case "tiki":
      return tiki();
    case "lazada":
      return lazada();
    default:
      return null;
  }
}

export function platformFromUrl(href: string): PlatformKey | null {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    if (host.includes("shopee")) return "shopee";
    if (host.includes("tiki")) return "tiki";
    if (host.includes("lazada")) return "lazada";
  } catch {
    /* ignore */
  }
  return null;
}
