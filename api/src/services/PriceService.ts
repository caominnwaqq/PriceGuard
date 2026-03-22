import type { PostPricesRequest, PostPricesResponse } from "@priceguard/shared";
import { getCache, setCache } from "../utils/cache.js";
import { md5Hex, normalizeProductName } from "../utils/normalize.js";
import { matchCandidates } from "./compare/matching.js";
import { normalizeCandidatePricing } from "./compare/pricing.js";
import { retrieveCandidates } from "./compare/retrieval.js";
import { scoreAndSelect } from "./compare/scoring.js";

const BRANDS = [
  "samsung",
  "iphone",
  "apple",
  "xiaomi",
  "oppo",
  "vivo",
  "realme",
  "nokia",
  "tecno",
  "infinix",
  "asus",
  "acer",
  "lenovo",
  "hp",
  "dell",
  "msi",
  "huawei",
  "honor",
] as const;

const NOISE_TOKENS = new Set([
  "chinh",
  "hang",
  "official",
  "store",
  "shop",
  "mall",
  "global",
  "gia",
  "tot",
  "re",
  "freeship",
  "voucher",
  "bao",
  "hanh",
  "new",
  "2024",
  "2025",
  "2026",
]);

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function extractSlugKeyword(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  if (host.includes("shopee")) {
    const m = path.match(/\/([^/]+)-i\.\d+\.\d+/i);
    if (m?.[1]) return safeDecode(m[1]).replace(/[-_.]+/g, " ");
  }

  if (host.includes("tiki")) {
    const m = path.match(/\/([^/]+)-p\d+\.html$/i);
    if (m?.[1]) return safeDecode(m[1]).replace(/[-_.]+/g, " ");
  }

  if (host.includes("lazada")) {
    const m = path.match(/\/products\/([^/]+?)(-i\d+)?(\.html)?$/i);
    if (m?.[1]) return safeDecode(m[1]).replace(/[-_.]+/g, " ");
  }

  return null;
}

function canonicalizeKeyword(raw: string): string {
  const norm = normalizeProductName(raw);
  const tokens = norm
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .filter((t) => !NOISE_TOKENS.has(t));
  return tokens.join(" ").trim();
}

function scoreKeyword(keyword: string): number {
  if (!keyword) return -999;
  const tokens = keyword.split(" ").filter(Boolean);
  let score = 0;

  if (tokens.length >= 3) score += 3;
  if (tokens.length > 9) score -= 2;

  const hasBrand = tokens.some((t) => BRANDS.includes(t as (typeof BRANDS)[number]));
  if (hasBrand) score += 4;

  const modelLike = tokens.filter((t) => /[a-z]+\d|\d+[a-z]/i.test(t)).length;
  score += Math.min(4, modelLike * 2);

  const specs = tokens.filter((t) => /\d+(gb|tb|mah|hz|w|inch|"|mp)$/i.test(t)).length;
  score += Math.min(4, specs * 2);

  const joinedLen = keyword.length;
  if (joinedLen < 10) score -= 3;
  if (joinedLen >= 20 && joinedLen <= 90) score += 2;
  if (joinedLen > 140) score -= 2;

  return score;
}

function deriveSearchKeyword(body: PostPricesRequest): string {
  const candidates: string[] = [];

  try {
    const u = new URL(body.currentUrl);
    const kw =
      u.searchParams.get("keyword") ??
      u.searchParams.get("q") ??
      u.searchParams.get("query");
    if (kw?.trim()) {
      candidates.push(kw.trim());
    }

    const slug = extractSlugKeyword(u);
    if (slug) candidates.push(slug);
  } catch {
    /* ignore */
  }

  const head = body.productName.split(/[,|]/)[0]?.trim() ?? body.productName.trim();
  candidates.push(head);
  candidates.push(body.productName.trim());

  const normalized = candidates
    .map((c) => canonicalizeKeyword(c))
    .filter((c) => c.length > 0)
    .map((c) => c.slice(0, 200));

  const unique = Array.from(new Set(normalized));
  if (!unique.length) return "dien thoai";

  unique.sort((a, b) => scoreKeyword(b) - scoreKeyword(a));
  return unique[0] ?? "dien thoai";
}

function platformSearchUrls(keyword: string): Record<string, string> {
  const q = encodeURIComponent(keyword);
  return {
    shopee: `https://shopee.vn/search?keyword=${q}`,
    tiki: `https://tiki.vn/search?q=${q}&ref=PRICEGUARD`,
    lazada: `https://www.lazada.vn/catalog/?q=${q}`,
  };
}

function stableDailyJitter(seed: string, dayIso: string): number {
  const h = md5Hex(`${seed}:${dayIso}`).slice(0, 8);
  const n = Number.parseInt(h, 16);
  const p = (n % 1_000) / 1_000;
  return 0.96 + p * 0.08;
}

/**
 * MVP: trả về so sánh 3 sàn với giả lập dựa trên giá hiện tại (không scrape thật).
 * Sau này: scraper song song + fuzzy match fuse.js.
 */
export async function getPricesForProduct(
  body: PostPricesRequest,
): Promise<PostPricesResponse> {
  const norm = normalizeProductName(body.productName);
  const cacheKey = `price:${md5Hex(`${norm}::${body.platform}::${Math.round(body.currentPrice / 5000)}`)}`;
  const hit = getCache<PostPricesResponse>(cacheKey);
  if (hit) return hit;

  const searchKeyword = deriveSearchKeyword(body);
  const search = platformSearchUrls(searchKeyword);

  const candidates = retrieveCandidates(body, searchKeyword);
  const matched = matchCandidates(body.productName, candidates);
  const normalized = normalizeCandidatePricing(matched.matched.length ? matched.matched : candidates);
  const { selectedRows, summary } = scoreAndSelect(normalized, body.platform);

  const rows = selectedRows.map((r) => {
    if (r.url.includes("search?")) {
      if (r.platform === "shopee") return { ...r, url: search.shopee, affiliateUrl: search.shopee };
      if (r.platform === "tiki") return { ...r, url: search.tiki, affiliateUrl: search.tiki };
      return { ...r, url: search.lazada, affiliateUrl: search.lazada };
    }
    return r;
  });

  const min = rows.length ? Math.min(...rows.map((r) => r.price)) : body.currentPrice;
  for (const r of rows) r.isCheapest = r.price === min;

  const current = rows.find((r) => r.isCurrent);
  const cheapest = rows.find((r) => r.isCheapest) ?? rows[0] ?? current;
  const savingsAmount =
    current && cheapest && current.price > cheapest.price
      ? current.price - cheapest.price
      : 0;
  const savingsPercent =
    cheapest && cheapest.price > 0 && savingsAmount > 0
      ? Math.round((savingsAmount / cheapest.price) * 100)
      : 0;

  const today = new Date();
  const history = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const day = d.toISOString().slice(0, 10);
    const jitter = stableDailyJitter(norm, day);
    return {
      date: day,
      minPrice: Math.round(min * jitter),
    };
  });

  const result: PostPricesResponse = {
    product: {
      id: md5Hex(norm).slice(0, 24),
      name: body.productName.trim(),
    },
    searchKeyword,
    prices: rows,
    history,
    savings: {
      amount: savingsAmount,
      percent: savingsPercent,
      bestPlatform: cheapest?.platform ?? body.platform,
    },
    comparison: {
      ...summary,
      matchThreshold: matched.threshold,
    },
  };

  setCache(cacheKey, result);
  return result;
}
