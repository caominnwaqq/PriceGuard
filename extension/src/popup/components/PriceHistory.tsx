import type { HistoryPoint } from "@priceguard/shared";

type Props = { points: HistoryPoint[] };

export function PriceHistory({ points }: Props) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-slate-500">Chưa đủ dữ liệu lịch sử (cần ít nhất 2 điểm).</p>
    );
  }
  const min = Math.min(...points.map((p) => p.minPrice));
  const max = Math.max(...points.map((p) => p.minPrice));
  const pad = 4;
  const w = 320 - pad * 2;
  const h = 80;
  const range = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * w;
      const y = pad + h - ((p.minPrice - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-xs font-medium text-slate-700">Lịch sử 30 ngày (giá thấp nhất/ngày)</div>
      <svg
        className="w-full text-emerald-600"
        viewBox={`0 0 ${320} ${h + pad * 2}`}
        role="img"
        aria-label="Biểu đồ lịch sử giá"
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}
