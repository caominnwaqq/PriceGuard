# PriceGuard

PriceGuard is a Chrome Extension + API backend that helps users compare prices across Shopee, Tiki, and Lazada.

## Highlights

- Fast inline detection on product pages (content script).
- Popup comparison with cheapest platform, savings, and 30-day chart.
- Cross-platform search keyword generation (slug + product name signals).
- Security hardening included:
  - CORS allowlist strategy.
  - Request validation + payload limits.
  - Basic per-IP rate limit.
  - Safer content rendering (no HTML string injection for dynamic fields).
- Monorepo with pnpm workspace: extension, api, shared.

## Project Structure

- extension: Chrome extension (MV3, React + Vite + CRX plugin)
- api: Fastify service for price comparison response
- shared: shared TypeScript types

## How It Works

1. Content script detects current product name and current price on supported marketplaces.
2. Background script sends detection data to API /api/prices.
3. API derives a search keyword and builds comparison rows.
4. Popup and inline badge render the results.

## Important Accuracy Note

Current cross-platform comparison data is still MVP-style and partially estimated.
Some rows are generated from search/listing assumptions instead of verified product-detail extraction from each marketplace.

If a row is estimated, UI labels it as "Gia uoc tinh tu trang tim kiem" and CTA changes to "Xem ket qua".

## Requirements

- Node.js 20+
- pnpm 9+
- Chrome (for extension testing)

## Quick Start (Local)

### 1) Install dependencies

Run from repo root:

pnpm install

### 2) Start API

pnpm dev:api

Default API URL: http://localhost:3000
Health check: GET /health

### 3) Build extension

pnpm --filter extension build

### 4) Load extension in Chrome

1. Open chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select folder: extension/dist

## Workspace Scripts

From repo root:

- pnpm dev:api
- pnpm dev:extension
- pnpm build

## API Contract

### POST /api/prices

Request body:

- productName: string
- currentUrl: valid URL
- platform: shopee | tiki | lazada
- currentPrice: positive integer

Response includes:

- product
- searchKeyword
- prices
- history
- savings
- comparison (optional metadata)

## Security Notes

Implemented:

- API body size limit.
- CORS origin checks (extension + localhost flows).
- Runtime request validation via zod.
- Basic in-memory rate limiting.
- Extension API base enforces HTTPS outside localhost.

Recommended for production:

- Add API authentication (API key or JWT).
- Replace in-memory rate limit with Redis/shared store.
- Add observability and abuse monitoring.

## Troubleshooting

### "Invalid body: currentPrice must be greater than 0"

Detector returned invalid/zero price on current page. Extension now skips API calls when detected price <= 0.

### "Extension context invalidated"

Usually appears right after extension reload/update while old content script is still alive in a tab.
Reload the tab after reloading extension.

### "Why does Tiki/Lazada result not match exact page price?"

Because some rows are still estimated from search/listing data in MVP.
Use product-detail page flow for better reliability.

## Packaging for Chrome Web Store

1. Build extension:

pnpm --filter extension build

2. Create zip from extension/dist contents (manifest must be at zip root).

PowerShell example:

Set-Location extension/dist
Compress-Archive -Path * -DestinationPath ../priceguard-store.zip -Force

3. Upload extension/priceguard-store.zip to Chrome Web Store Developer Dashboard.

## Current Limitations

- Cross-platform prices are not fully real-time marketplace-verified yet.
- Matching/scoring is heuristic-based.
- History data is generated for MVP visualization.

## Roadmap

- Real marketplace connectors for candidate retrieval.
- Verified product-detail linking per platform.
- Better variant disambiguation (storage/color/model strict match).
- Production auth, telemetry, and anti-abuse controls.

## License

Internal project (private workspace). Add a license before public release.
