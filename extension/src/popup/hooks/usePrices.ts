import type { PostPricesResponse } from "@priceguard/shared";
import { useEffect } from "react";
import { usePriceStore } from "../store";

function tabSessionDataKey(tabId: number): string {
  return `priceguard:tab:${tabId}:data`;
}

export function usePrices() {
  const { data, loading, error, setData, setLoading, setError } = usePriceStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = () => {
      void chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId == null) {
          if (!cancelled) {
            setData(null);
            setLoading(false);
          }
          return;
        }
        chrome.runtime
          .sendMessage({ type: "GET_PRICE_STATE", tabId })
          .then((res: PostPricesResponse | null) => {
            if (cancelled) return;
            setData(res);
          })
          .catch((e: unknown) => {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : String(e));
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      });
    };

    load();

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName,
    ) => {
      if (areaName !== "session" || cancelled) return;
      void chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId == null) return;
        if (!changes[tabSessionDataKey(tabId)]) return;
        void chrome.runtime
          .sendMessage({ type: "GET_PRICE_STATE", tabId })
          .then((res: PostPricesResponse | null) => {
            if (!cancelled) setData(res);
          });
      });
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }, [setData, setError, setLoading]);

  return { data, loading, error };
}
