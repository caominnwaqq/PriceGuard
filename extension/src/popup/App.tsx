import { AlertBanner } from "./components/AlertBanner";
import { PriceHistory } from "./components/PriceHistory";
import { PriceList } from "./components/PriceList";
import { WatchButton } from "./components/WatchButton";
import { usePrices } from "./hooks/usePrices";

export function App() {
  const { data, loading, error } = usePrices();

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-slate-600">Đang tải…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">PriceGuard</h1>
        <p className="text-sm text-slate-600">
          Mở trang sản phẩm trên Shopee, Tiki hoặc Lazada để xem so sánh giá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <header>
        <h1 className="text-lg font-semibold text-slate-900">PriceGuard</h1>
        <p className="line-clamp-2 text-sm text-slate-600">{data.product.name}</p>
        {data.searchKeyword ? (
          <p className="mt-1 text-xs text-slate-500">
            Từ khóa tìm trên sàn khác: <span className="font-medium">{data.searchKeyword}</span>
          </p>
        ) : null}
      </header>
      <AlertBanner data={data} />
      <PriceList rows={data.prices} />
      <PriceHistory points={data.history} />
      <WatchButton />
    </div>
  );
}
