import type { PostPricesResponse } from "@priceguard/shared";

const TTL_MS = 5 * 60 * 1000;

export function tabDataKey(tabId: number): string {
  return `priceguard:tab:${tabId}:data`;
}

export function tabMetaKey(tabId: number): string {
  return `priceguard:tab:${tabId}:meta`;
}

export type CachedEnvelope = {
  data: PostPricesResponse;
  storedAt: number;
};

export async function getCached(tabId: number): Promise<CachedEnvelope | null> {
  const dk = tabDataKey(tabId);
  const mk = tabMetaKey(tabId);
  const v = await chrome.storage.session.get([dk, mk]);
  const data = v[dk] as PostPricesResponse | undefined;
  const storedAt = v[mk] as number | undefined;
  if (!data || typeof storedAt !== "number") return null;
  if (Date.now() - storedAt > TTL_MS) return null;
  return { data, storedAt };
}

export async function setCached(tabId: number, data: PostPricesResponse): Promise<void> {
  await chrome.storage.session.set({
    [tabDataKey(tabId)]: data,
    [tabMetaKey(tabId)]: Date.now(),
  });
}

export async function clearCached(tabId: number): Promise<void> {
  await chrome.storage.session.remove([tabDataKey(tabId), tabMetaKey(tabId)]);
}
