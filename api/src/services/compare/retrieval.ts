import type { CandidateOffer, PlatformKey, PostPricesRequest } from "@priceguard/shared";
import { md5Hex } from "../../utils/normalize.js";

const PLATFORM_MULTIPLIER: Record<PlatformKey, number> = {
    shopee: 1,
    tiki: 1.02,
    lazada: 0.99,
};

const TITLE_SUFFIXES = [
    "Chinh Hang",
    "Ban Fullbox",
    "Bao Hanh 12 Thang",
    "Gia Tot Hom Nay",
    "Deal Online",
    "Official Store",
] as const;

function seeded(seed: string, idx: number): number {
    const h = md5Hex(`${seed}:${idx}`).slice(0, 8);
    const n = Number.parseInt(h, 16);
    return (n % 10_000) / 10_000;
}

function clampPrice(v: number): number {
    return Math.max(1_000, Math.round(v));
}

function buildTitle(baseName: string, idx: number): string {
    const suffix = TITLE_SUFFIXES[idx % TITLE_SUFFIXES.length];
    if (idx === 0) return baseName.trim();
    return `${baseName.trim()} ${suffix}`;
}

function platformUrl(platform: PlatformKey, keyword: string, idx: number): string {
    const q = encodeURIComponent(keyword);
    if (platform === "shopee") return `https://shopee.vn/search?keyword=${q}&page=${idx}`;
    if (platform === "tiki") return `https://tiki.vn/search?q=${q}&page=${idx + 1}`;
    return `https://www.lazada.vn/catalog/?q=${q}&page=${idx + 1}`;
}

function shopTypeFor(score: number): "mall" | "official" | "normal" {
    if (score > 0.72) return "mall";
    if (score > 0.45) return "official";
    return "normal";
}

export function retrieveCandidates(
    body: PostPricesRequest,
    searchKeyword: string,
): CandidateOffer[] {
    const baseSeed = `${body.productName}:${searchKeyword}:${body.currentPrice}`;
    const nowIso = new Date().toISOString();
    const candidates: CandidateOffer[] = [];

    for (const platform of ["shopee", "tiki", "lazada"] as const) {
        for (let i = 0; i < 6; i++) {
            const r1 = seeded(`${baseSeed}:${platform}`, i);
            const r2 = seeded(`${baseSeed}:${platform}:ship`, i);
            const r3 = seeded(`${baseSeed}:${platform}:voucher`, i);

            const multiplier = PLATFORM_MULTIPLIER[platform] * (0.9 + r1 * 0.25);
            const listedPrice = clampPrice(body.currentPrice * multiplier);
            const shippingFee = clampPrice(12_000 + r2 * 28_000);
            const voucherAmount = clampPrice((listedPrice * (0.01 + r3 * 0.08)) / 1);

            candidates.push({
                id: md5Hex(`${platform}:${body.productName}:${i}`).slice(0, 20),
                platform,
                title: buildTitle(i === 0 ? body.productName : searchKeyword, i),
                url: platformUrl(platform, searchKeyword, i),
                listedPrice,
                shippingFee,
                voucherAmount,
                finalPrice: listedPrice,
                originalPrice: clampPrice(listedPrice * (1.05 + r2 * 0.18)),
                rating: Math.round((4 + seeded(`${baseSeed}:${platform}:rating`, i) * 1) * 10) / 10,
                sold: Math.round(20 + seeded(`${baseSeed}:${platform}:sold`, i) * 2_500),
                shopType: shopTypeFor(seeded(`${baseSeed}:${platform}:shop`, i)),
                fetchedAt: nowIso,
                matchScore: 0,
                confidence: 0,
                reasons: ["Retrieved from platform candidate pool"],
            });
        }
    }

    const currentId = md5Hex(`current:${body.platform}:${body.currentUrl}`).slice(0, 20);
    candidates.push({
        id: currentId,
        platform: body.platform,
        title: body.productName,
        url: body.currentUrl,
        listedPrice: body.currentPrice,
        shippingFee: 0,
        voucherAmount: 0,
        finalPrice: body.currentPrice,
        originalPrice: body.currentPrice,
        rating: 4.8,
        sold: 5_000,
        shopType: "official",
        fetchedAt: nowIso,
        matchScore: 1,
        confidence: 0.95,
        reasons: ["Current page product"],
    });

    return candidates;
}
