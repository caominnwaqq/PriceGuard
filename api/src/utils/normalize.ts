import crypto from "node:crypto";

/** Chuẩn hoá tên để match / cache key (MVP). */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}
