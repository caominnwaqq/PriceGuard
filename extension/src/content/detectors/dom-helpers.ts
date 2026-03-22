/** Parse VND text: "799.000 ₫", "799000đ" → integer đồng */
export function parseVnd(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export function metaContent(property: string): string | null {
  const el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"], meta[name="${property}"]`,
  );
  const v = el?.getAttribute("content")?.trim();
  return v || null;
}

/** JSON-LD Product (Shopee / Tiki / Lazada often expose this). */
export function readJsonLdProduct(): { name?: string; price?: number } | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    const raw = s.textContent?.trim();
    if (!raw) continue;
    try {
      const j = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(j) ? j : [j];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        const type = o["@type"];
        const types = Array.isArray(type) ? type : [type];
        const isProduct = types.some((t) => {
          const s = String(t);
          return (
            s === "Product" ||
            s === "product" ||
            s.endsWith("/Product") ||
            s.includes("schema.org/Product")
          );
        });
        if (!isProduct) continue;
        const name = typeof o.name === "string" ? o.name : undefined;
        const offersRaw = o.offers;
        const offerList = Array.isArray(offersRaw)
          ? offersRaw
          : offersRaw && typeof offersRaw === "object"
            ? [offersRaw as Record<string, unknown>]
            : [];

        let priceNum: number | undefined;
        const first = offerList[0];
        if (first && typeof first === "object") {
          const p = (first as Record<string, unknown>).price;
          if (typeof p === "number" && Number.isFinite(p)) priceNum = Math.round(p);
          else if (typeof p === "string") {
            const n = Number.parseFloat(p.replace(/,/g, ""));
            if (Number.isFinite(n)) priceNum = Math.round(n);
          }
        }
        if (name && priceNum != null && priceNum > 0) return { name, price: priceNum };
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return null;
}

/**
 * Tìm giá nhỏ nhất trong phần tử gốc (tránh quét cả header/footer).
 * Chỉ dùng khi selector chính thất bại.
 */
export function scanSmallestPriceIn(root: ParentNode): number | null {
  const candidates = root.querySelectorAll<HTMLElement>("span, div, p, strong, b, ins, h2");
  let best: number | null = null;
  for (const el of candidates) {
    if (el.querySelector("span, div")) continue;
    const t = el.textContent?.trim() ?? "";
    if (t.length > 40) continue;
    if (!/[₫đ]/.test(t)) continue;
    const p = parseVnd(t);
    if (p == null || p < 1_000 || p > 500_000_000) continue;
    if (best == null || p < best) best = p;
  }
  return best;
}
