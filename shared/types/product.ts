export type PlatformKey = "shopee" | "tiki" | "lazada";

export interface ProductInfo {
  name: string;
  price: number;
  url: string;
  platform: PlatformKey;
}
