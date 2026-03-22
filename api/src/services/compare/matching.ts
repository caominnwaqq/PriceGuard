import Fuse from "fuse.js";
import type { CandidateOffer } from "@priceguard/shared";
import { normalizeProductName } from "../../utils/normalize.js";

export type MatchResult = {
    matched: CandidateOffer[];
    threshold: number;
};

type VariantSignature = {
    storageGb?: number;
    color?: string;
};

const COLORS = [
    "den",
    "trang",
    "xanh",
    "do",
    "hong",
    "vang",
    "tim",
    "gray",
    "black",
    "white",
    "blue",
    "green",
    "silver",
] as const;

function extractVariant(text: string): VariantSignature {
    const n = normalizeProductName(text);
    const storage = n.match(/(\d{2,4})\s?(gb|tb)/);
    const storageGb = storage
        ? storage[2] === "tb"
            ? Number.parseInt(storage[1] ?? "0", 10) * 1024
            : Number.parseInt(storage[1] ?? "0", 10)
        : undefined;

    let color: string | undefined;
    for (const c of COLORS) {
        if (n.includes(c)) {
            color = c;
            break;
        }
    }
    return { storageGb, color };
}

function jaccardSimilarity(a: string, b: string): number {
    const ta = new Set(a.split(" ").filter(Boolean));
    const tb = new Set(b.split(" ").filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    let intersection = 0;
    for (const t of ta) {
        if (tb.has(t)) intersection++;
    }
    const union = ta.size + tb.size - intersection;
    return union > 0 ? intersection / union : 0;
}

function variantFactor(target: VariantSignature, cand: VariantSignature): number {
    let score = 1;
    if (target.storageGb != null && cand.storageGb != null && target.storageGb !== cand.storageGb) {
        score -= 0.24;
    }
    if (target.color && cand.color && target.color !== cand.color) {
        score -= 0.07;
    }
    return Math.max(0.3, score);
}

function clamp01(v: number): number {
    return Math.min(1, Math.max(0, v));
}

export function matchCandidates(targetName: string, candidates: CandidateOffer[]): MatchResult {
    const threshold = 0.46;
    const targetNorm = normalizeProductName(targetName);
    const targetVariant = extractVariant(targetName);

    const fuse = new Fuse(candidates, {
        keys: ["title"],
        includeScore: true,
        ignoreLocation: true,
        threshold: 0.6,
    });

    const scoreById = new Map<string, number>();
    for (const r of fuse.search(targetName, { limit: candidates.length })) {
        scoreById.set(r.item.id, 1 - (r.score ?? 1));
    }

    const matched = candidates
        .map((c) => {
            const candNorm = normalizeProductName(c.title);
            const fuzzy = scoreById.get(c.id) ?? 0;
            const lexical = jaccardSimilarity(targetNorm, candNorm);
            const variant = variantFactor(targetVariant, extractVariant(c.title));
            const matchScore = clamp01((0.55 * fuzzy + 0.45 * lexical) * variant);
            const reasons = [...c.reasons];

            if (variant < 1) reasons.push("Variant mismatch penalty applied");
            if (lexical > 0.72) reasons.push("High token overlap");
            if (fuzzy > 0.8) reasons.push("Strong fuzzy title match");

            return {
                ...c,
                matchScore,
                reasons,
            };
        })
        .filter((c) => c.matchScore >= threshold)
        .sort((a, b) => b.matchScore - a.matchScore);

    return { matched, threshold };
}
