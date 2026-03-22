import type { CandidateOffer } from "@priceguard/shared";

function clampPrice(v: number): number {
    return Math.max(1_000, Math.round(v));
}

function calcFinalPrice(listed: number, shippingFee: number, voucherAmount: number): number {
    const cappedVoucher = Math.min(voucherAmount, Math.round(listed * 0.25));
    return clampPrice(listed + shippingFee - cappedVoucher);
}

function parseDateMs(v: string): number {
    const t = Date.parse(v);
    return Number.isNaN(t) ? Date.now() : t;
}

export function normalizeCandidatePricing(candidates: CandidateOffer[]): CandidateOffer[] {
    const now = Date.now();

    return candidates.map((c) => {
        const shippingFee = clampPrice(c.shippingFee);
        const voucherAmount = clampPrice(c.voucherAmount);
        const listedPrice = clampPrice(c.listedPrice);
        const finalPrice = calcFinalPrice(listedPrice, shippingFee, voucherAmount);
        const ageHours = Math.max(0, (now - parseDateMs(c.fetchedAt)) / (1000 * 60 * 60));

        const reasons = [...c.reasons];
        reasons.push(`Normalized final price = listed + ship - voucher (${listedPrice} + ${shippingFee} - ${voucherAmount})`);
        if (ageHours > 6) reasons.push("Data is older than 6 hours");

        return {
            ...c,
            listedPrice,
            shippingFee,
            voucherAmount,
            finalPrice,
            reasons,
        };
    });
}

export function freshnessScore(fetchedAt: string): number {
    const ageMinutes = Math.max(0, (Date.now() - parseDateMs(fetchedAt)) / (1000 * 60));
    if (ageMinutes <= 10) return 1;
    if (ageMinutes <= 60) return 0.85;
    if (ageMinutes <= 360) return 0.6;
    return 0.4;
}
