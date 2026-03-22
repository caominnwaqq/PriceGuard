import { formatVND } from "@/utils/format";

type Props = {
  productName: string;
  cheapestLabel: string;
  cheapestPrice: number;
  onOpenPopup?: () => void;
};

export function PriceTag({
  productName,
  cheapestLabel,
  cheapestPrice,
  onOpenPopup,
}: Props) {
  return (
    <div className="pg-root rounded-lg border border-slate-200 bg-white p-3 font-sans text-sm shadow-lg">
      <div className="mb-1 font-semibold text-slate-800">PriceGuard</div>
      <div className="line-clamp-2 text-xs text-slate-600">{productName}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xs text-slate-500">Rẻ nhất:</span>
        <span className="font-semibold text-emerald-600">{cheapestLabel}</span>
        <span className="font-bold text-slate-900">{formatVND(cheapestPrice)}</span>
      </div>
      {onOpenPopup && (
        <button
          type="button"
          className="mt-2 w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white hover:bg-slate-800"
          onClick={onOpenPopup}
        >
          Xem chi tiết
        </button>
      )}
    </div>
  );
}
