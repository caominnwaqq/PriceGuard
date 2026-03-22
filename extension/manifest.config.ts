import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "PriceGuard",
  description: "So sánh giá Shopee, Tiki, Lazada realtime",
  version: "0.0.1",
  permissions: ["storage", "alarms", "tabs"],
  host_permissions: [
    "https://*.shopee.vn/*",
    "https://shopee.vn/*",
    "https://*.tiki.vn/*",
    "https://tiki.vn/*",
    "https://*.lazada.vn/*",
    "https://lazada.vn/*",
    "http://localhost/*",
    "http://127.0.0.1/*",
  ],
  action: {
    default_popup: "popup.html",
    default_title: "PriceGuard",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: [
        "https://*.shopee.vn/*",
        "https://shopee.vn/*",
        "https://*.tiki.vn/*",
        "https://tiki.vn/*",
        "https://*.lazada.vn/*",
        "https://lazada.vn/*",
      ],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  options_page: "options.html",
});
