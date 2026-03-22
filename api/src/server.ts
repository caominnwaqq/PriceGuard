import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerPricesRoutes } from "./routes/prices.js";

const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin.startsWith("chrome-extension://")) return true;
  try {
    const u = new URL(origin);
    const isLocalhost = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return isLocalhost && (u.protocol === "http:" || u.protocol === "https:");
  } catch {
    return false;
  }
}

await app.register(cors, {
  origin(origin, cb) {
    cb(null, isAllowedOrigin(origin));
  },
  methods: ["POST", "GET", "OPTIONS"],
});

await registerPricesRoutes(app);

app.get("/health", async () => ({ status: "ok", service: "priceguard-api" }));

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`PriceGuard API http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
