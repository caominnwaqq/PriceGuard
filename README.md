# 🛡️ PriceGuard

**Compare Shopee, Tiki, and Lazada prices instantly with AI-driven detection.**

[![Spelling](https://github.com/caominnwaqq/priceguard/actions/workflows/spelling.yml/badge.svg)](https://github.com/caominnwaqq/priceguard/actions/workflows/spelling.yml)

[](https://www.google.com/search?q=https://github.com/your-repo/priceguard)
[](https://www.google.com/search?q=https://github.com/your-repo/priceguard)

PriceGuard is a powerful Chrome Extension and API backend that takes the guesswork out of online shopping. It automatically detects products on major Vietnamese marketplaces and shows you the best deals across the web in real-time.

## 🌟 Highlights

  * 🚀 **Instant Inline Detection:** Smart content scripts identify products directly on the page.
  * 💰 **Cheapest Platform Alerts:** Popups highlight exactly where you can save the most money.
  * 📈 **30-Day Price Tracking:** Visualize price trends with an integrated history chart.
  * 🔐 **Security First:** Built with CORS allowlisting, payload limits, and hardened content rendering.
  * 📦 **Monorepo Architecture:** Cleanly organized using `pnpm` workspaces for the extension, API, and shared types.

## ℹ️ Overview

PriceGuard acts as your personal shopping assistant. By analyzing product name signals and slugs, the API derives search keywords to build a comprehensive comparison across Shopee, Tiki, and Lazada.

Hold your documentation to the same standard as your code. This project is built for developers who want a robust, secure, and scalable starting point for browser-based price comparison tools.

## 😊 Leave a good impression

Whether you are a savvy shopper looking for the best deal or a developer exploring MV3 extension architecture, PriceGuard is designed to be approachable. We prioritize:

1.  **User Time:** Quick answers to "Does this solve my problem?"
2.  **Quality:** Proper formatting, syntax highlighting, and clear structure.
3.  **Transparency:** Clear labeling for estimated data (MVP-style) vs. verified extraction.

## 🚀 Usage Instructions

PriceGuard works silently in the background. When you visit a supported product page, an inline badge or popup will render the comparison results.

```typescript
// Example: API Request for price comparison
const response = await fetch('/api/prices', {
  method: 'POST',
  body: JSON.stringify({
    productName: "iPhone 15 Pro",
    platform: "shopee",
    currentPrice: 28000000
  })
});
```

*(Insert a GIF here showing the price comparison popup appearing on a Shopee page\!)*

## ⬇️ Installation Instructions

Get your local environment running in minutes. You will need Node.js 20+ and pnpm 9+.

1.  **Install Dependencies**
    ```bash
    pnpm install
    ```
2.  **Launch the API**
    ```bash
    pnpm dev:api
    # Health check available at http://localhost:3000/health
    ```
3.  **Build & Load Extension**
      * Run `pnpm --filter extension build`.
      * Open `chrome://extensions` in Chrome.
      * Enable **Developer mode** and click **Load unpacked**.
      * Select the `extension/dist` folder.

## 🛠️ Tech Stack

  * **Extension:** Chrome MV3, React, Vite.
  * **Backend:** Fastify (API), Zod (Validation).
  * **Workspace:** pnpm, TypeScript.

## 🗺️ Roadmap

We are constantly improving our matching heuristics and data accuracy.

  * [ ] **Real Marketplace Connectors:** Move from estimated data to real-time verification.
  * [ ] **Variant Disambiguation:** Strict matching for color, storage, and models.
  * [ ] **Production Controls:** Adding JWT authentication and Redis-backed rate limiting.

## 💭 Feedback

If you find this project useful or have suggestions for the price-matching algorithm, please start a Discussion\!
