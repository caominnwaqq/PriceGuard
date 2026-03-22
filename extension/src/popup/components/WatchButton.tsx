/** MVP: nút theo dõi — nối API watchlist ở phase sau. */
export function WatchButton() {
  return (
    <button
      type="button"
      disabled
      className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
      title="Sắp có"
    >
      Theo dõi giá (sắp có)
    </button>
  );
}
