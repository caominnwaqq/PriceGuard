import type { PriceRow } from "@priceguard/shared";
import { formatVND } from "@/utils/format";

type Props = { rows: PriceRow[] };

export function PriceList({ rows }: Props) {
  if (!rows.length) {
    return (
      <p className="text-sm text-slate-500">Chưa có dữ liệu giá. Mở trang sản phẩm để so sánh.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={`${r.platform}-${r.url}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium capitalize text-slate-800">{r.platform}</span>
            <span className="text-xs text-slate-500">{r.shipping}</span>
            {r.isEstimated && (
              <span className="text-xs font-medium text-amber-700">Giá ước tính từ trang tìm kiếm</span>
            )}
          </div>
          <div className="text-right">
            <div className="font-semibold text-slate-900">{formatVND(r.price)}</div>
            {r.originalPrice != null && r.originalPrice > r.price && (
              <div className="text-xs text-slate-400 line-through">
                {formatVND(r.originalPrice)}
              </div>
            )}
            {r.discount != null && r.discount > 0 && (
              <div className="text-xs text-rose-600">-{r.discount}%</div>
            )}
          </div>
          <a
            className={`w-full rounded px-2 py-1.5 text-center text-xs font-medium text-white sm:w-auto ${r.isEstimated ? "bg-amber-700 hover:bg-amber-800" : "bg-slate-900 hover:bg-slate-800"
              }`}
            href={r.affiliateUrl || r.url}
            target="_blank"
            rel="noreferrer"
          >
            {r.isEstimated ? `Xem kết quả ở ${r.platform}` : `Mua ở ${r.platform}`}
          </a>
        </li>
      ))}
    </ul>
  );
}
