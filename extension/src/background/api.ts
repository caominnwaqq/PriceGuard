import type { PostPricesRequest, PostPricesResponse } from "@priceguard/shared";

const API_BASE_RAW =
  (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL ?? "http://localhost:3000";

function resolveApiBase(raw: string): string {
  const u = new URL(raw);
  const isLocalhost =
    u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
  if (!isLocalhost && u.protocol !== "https:") {
    throw new Error("VITE_API_URL must use https outside localhost");
  }
  return u.toString().replace(/\/$/, "");
}

const API_BASE = resolveApiBase(API_BASE_RAW);

export async function postPrices(
  body: PostPricesRequest,
): Promise<PostPricesResponse> {
  const response = await fetch(`${API_BASE}/api/prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }
  return (await response.json()) as PostPricesResponse;
}
