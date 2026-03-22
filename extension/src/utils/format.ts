/** Giá luôn là số nguyên (đồng). */
export function formatVND(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}
