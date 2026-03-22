/** Định kỳ kiểm tra watchlist — mở rộng ở phase sau. */
export function registerWatchlistAlarms(): void {
  if (!chrome.alarms) return;
  chrome.alarms.get("priceguard-watchlist", (a) => {
    if (!a) {
      chrome.alarms.create("priceguard-watchlist", { periodInMinutes: 60 });
    }
  });
}
