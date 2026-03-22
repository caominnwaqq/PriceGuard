import type { PlatformKey } from "./product";

export interface PriceRow {
  platform: PlatformKey;
  price: number;
  originalPrice?: number;
  discount?: number;
  url: string;
  affiliateUrl: string;
  shipping: string;
  isCheapest: boolean;
  isCurrent: boolean;
  confidence?: number;
  matchScore?: number;
  finalPrice?: number;
  shippingFee?: number;
  voucherAmount?: number;
  explain?: string[];
  /** True when this row is derived from search/listing data, not a verified product-detail URL. */
  isEstimated?: boolean;
}

export interface HistoryPoint {
  date: string;
  minPrice: number;
}

export interface SavingsInfo {
  amount: number;
  percent: number;
  bestPlatform: PlatformKey;
}

export interface CandidateOffer {
  id: string;
  platform: PlatformKey;
  title: string;
  url: string;
  listedPrice: number;
  shippingFee: number;
  voucherAmount: number;
  finalPrice: number;
  originalPrice?: number;
  rating?: number;
  sold?: number;
  shopType?: "mall" | "official" | "normal";
  fetchedAt: string;
  matchScore: number;
  confidence: number;
  reasons: string[];
}

export interface ComparisonSummary {
  currentPlatform: PlatformKey;
  selectedByPlatform: Partial<Record<PlatformKey, CandidateOffer>>;
  evaluatedCount: number;
  topCandidates: CandidateOffer[];
  matchThreshold: number;
}
