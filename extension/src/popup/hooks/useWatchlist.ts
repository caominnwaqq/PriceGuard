/** Watchlist — nối GET/POST /api/watchlist sau MVP. */
export function useWatchlist() {
  return { items: [] as const, loading: false };
}
