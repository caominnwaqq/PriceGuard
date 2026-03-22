import type { CandidateOffer, ComparisonSummary, PlatformKey, PriceRow } from "@priceguard/shared";
import { freshnessScore } from "./pricing.js";

type ScoredOffer = CandidateOffer & { totalScore: number };

function isSearchLikeUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        const path = u.pathname.toLowerCase();
        if (path.includes("/search") || path.includes("/catalog")) return true;
        return u.searchParams.has("q") || u.searchParams.has("keyword") || u.searchParams.has("query");
    } catch {
        return true;
    }
}

function clamp01(v: number): number {
    return Math.min(1, Math.max(0, v));
}

function trustScore(c: CandidateOffer): number {
    const rating = c.rating != null ? clamp01((c.rating - 3.5) / 1.5) : 0.5;
    const sold = c.sold != null ? clamp01(Math.log10(c.sold + 1) / 4) : 0.4;
    const shopType = c.shopType === "mall" ? 1 : c.shopType === "official" ? 0.85 : 0.65;
    return 0.45 * rating + 0.3 * sold + 0.25 * shopType;
}

function formatShipping(v: number): string {
    if (v <= 0) return "Freeship";
    return `Ship ${new Intl.NumberFormat("vi-VN").format(v)}d`;
}

export function scoreAndSelect(
    candidates: CandidateOffer[],
    currentPlatform: PlatformKey,
): {
    selectedRows: PriceRow[];
    summary: ComparisonSummary;
} {
    if (!candidates.length) {
        return {
            selectedRows: [],
            summary: {
                currentPlatform,
                selectedByPlatform: {},
                evaluatedCount: 0,
                topCandidates: [],
                matchThreshold: 0,
            },
        };
    }

    const minFinal = Math.min(...candidates.map((c) => c.finalPrice));

    const scored: ScoredOffer[] = candidates.map((c) => {
        const priceScore = clamp01(minFinal / Math.max(minFinal, c.finalPrice));
        const totalScore =
            0.42 * c.matchScore +
            0.33 * priceScore +
            0.17 * trustScore(c) +
            0.08 * freshnessScore(c.fetchedAt);

        return {
            ...c,
            confidence: clamp01(totalScore),
            totalScore,
        };
    });

    const byPlatform = new Map<PlatformKey, ScoredOffer>();
    for (const c of scored.sort((a, b) => b.totalScore - a.totalScore)) {
        if (!byPlatform.has(c.platform)) byPlatform.set(c.platform, c);
    }

    const selected = (["shopee", "tiki", "lazada"] as const)
        .map((platform) => byPlatform.get(platform))
        .filter((x): x is ScoredOffer => Boolean(x));

    const cheapestPrice = selected.length
        ? Math.min(...selected.map((c) => c.finalPrice))
        : Number.POSITIVE_INFINITY;

    const selectedRows: PriceRow[] = selected.map((c) => {
        const estimated = isSearchLikeUrl(c.url);
        const discount =
            c.originalPrice != null && c.originalPrice > 0
                ? Math.max(0, Math.round(((c.originalPrice - c.finalPrice) / c.originalPrice) * 100))
                : undefined;

        return {
            platform: c.platform,
            price: c.finalPrice,
            finalPrice: c.finalPrice,
            originalPrice: c.originalPrice,
            discount,
            url: c.url,
            affiliateUrl: c.url,
            shipping: formatShipping(c.shippingFee),
            shippingFee: c.shippingFee,
            voucherAmount: c.voucherAmount,
            isCheapest: c.finalPrice === cheapestPrice,
            isCurrent: c.platform === currentPlatform,
            confidence: Number(c.confidence.toFixed(3)),
            matchScore: Number(c.matchScore.toFixed(3)),
            explain: estimated
                ? [...c.reasons.slice(0, 3), "Estimated from search/listing data; not a verified product-detail page"]
                : c.reasons.slice(0, 4),
            isEstimated: estimated,
        };
    });

    const selectedByPlatform: Partial<Record<PlatformKey, CandidateOffer>> = {};
    for (const row of selected) {
        selectedByPlatform[row.platform] = row;
    }

    const summary: ComparisonSummary = {
        currentPlatform,
        selectedByPlatform,
        evaluatedCount: candidates.length,
        topCandidates: scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, 8),
        matchThreshold: 0.46,
    };

    return { selectedRows, summary };
}
