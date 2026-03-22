import type { PostPricesResponse } from "@priceguard/shared";
import { formatVND } from "@/utils/format";

type Props = { data: PostPricesResponse };

export function AlertBanner({ data }: Props) {
  const current = data.prices.find((p) => p.isCurrent);
  const cheapest = data.prices.find((p) => p.isCheapest);
  if (!current || !cheapest || current.price <= cheapest.price) return null;

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
    >
      Bạn đang xem giá cao hơn{" "}
      <strong>{formatVND(data.savings.amount)}</strong> ({data.savings.percent}% so với giá rẻ nhất tại{" "}
      <strong className="capitalize">{data.savings.bestPlatform}</strong>).
    </div>
  );
}
