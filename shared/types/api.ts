import type { ComparisonSummary, HistoryPoint, PriceRow, SavingsInfo } from "./price";

export interface PostPricesRequest {
  productName: string;
  currentUrl: string;
  platform: "shopee" | "tiki" | "lazada";
  currentPrice: number;
}

export interface PostPricesResponse {
  product: {
    id: string;
    name: string;
  };
  /** Từ khóa dùng cho link tìm kiếm đa sàn (URL ?keyword= / ?q= hoặc rút gọn tên SP). */
  searchKeyword: string;
  prices: PriceRow[];
  history: HistoryPoint[];
  savings: SavingsInfo;
  comparison?: ComparisonSummary;
}
