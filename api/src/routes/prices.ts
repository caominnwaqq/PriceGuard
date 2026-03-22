import type { FastifyInstance } from "fastify";
import type { PostPricesRequest } from "@priceguard/shared";
import { z } from "zod";
import { getPricesForProduct } from "../services/PriceService.js";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 90;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const prev = ipHits.get(ip) ?? [];
  const recent = prev.filter((t) => t >= cutoff);
  if (recent.length >= RATE_MAX_REQUESTS) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  return false;
}

const urlString = z.string().trim().min(1).max(2048).refine((s) => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}, "Invalid URL");

const bodySchema = z.object({
  productName: z.string().trim().min(1).max(220),
  currentUrl: urlString,
  platform: z.enum(["shopee", "tiki", "lazada"]),
  currentPrice: z.number().int().positive().max(1_000_000_000),
});

const wrongMethodBody = {
  error: "Wrong method or path",
  use: "POST /api/prices",
  contentType: "application/json",
  bodyExample: {
    productName: "string",
    currentUrl: "https://shopee.vn/...",
    platform: "shopee | tiki | lazada",
    currentPrice: 799000,
  },
} as const;

export async function registerPricesRoutes(app: FastifyInstance): Promise<void> {
  /** Common mistake: GET /api/price — this API only accepts POST /api/prices */
  app.get("/api/price", async (_request, reply) => {
    return reply.status(405).send({ ...wrongMethodBody, hint: "You used GET /api/price (singular). There is no such route." });
  });

  app.get("/api/prices", async (_request, reply) => {
    return reply.status(405).send({ ...wrongMethodBody, hint: "Use POST with a JSON body, not GET." });
  });

  app.post<{ Body: PostPricesRequest }>("/api/prices", async (request, reply) => {
    if (isRateLimited(request.ip || "unknown")) {
      return reply.status(429).send({ error: "Too many requests" });
    }

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const data = await getPricesForProduct(parsed.data);
    return reply.send(data);
  });
}
