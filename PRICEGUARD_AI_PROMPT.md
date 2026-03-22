# PriceGuard — AI Working Prompt

> Copy toàn bộ file này vào đầu mỗi session làm việc với AI (Claude, Cursor, GitHub Copilot Chat...).  
> File này đóng vai trò "bộ nhớ dài hạn" — AI sẽ hiểu đầy đủ context mà không cần giải thích lại.

---

## 1. Tổng quan dự án

**Tên:** PriceGuard  
**Loại:** Chrome Extension (Manifest V3)  
**Mục tiêu:** So sánh giá sản phẩm realtime trên Shopee, Tiki, Lazada ngay khi người dùng đang xem trang sản phẩm. Hiển thị giá rẻ nhất, lịch sử giá 30 ngày, và cảnh báo khi giá đạt ngưỡng mong muốn.

**Vấn đề giải quyết:**  
Người mua hàng online Việt Nam không biết giá sản phẩm họ đang xem có thực sự rẻ không, không có thời gian tra tay qua 3 sàn, và không nhận ra khi nào sàn "giả giảm giá" bằng cách tăng giá gốc trước khi sale.

**Revenue model:**
- Affiliate commission: mọi click "Mua ở [sàn]" qua link affiliate → nhận 1–5% commission
- Freemium Pro 29.000đ/tháng: lịch sử 90 ngày, unlimited watchlist, alert Zalo
- Phase 3: B2B price data API cho seller/brand

---

## 2. Tech Stack

### Extension (Frontend)
| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Build tool | Vite + CRXJS | Hot reload tự động cho MV3 |
| Framework | React 18 + TypeScript | Type-safe, component UI |
| Styling | Tailwind CSS | Bundle nhỏ, utility-first |
| State | Zustand | Nhẹ hơn Redux, đủ dùng |
| Storage | `chrome.storage.local` | Persist cache phía client |
| Messaging | `chrome.runtime` | Content ↔ Background ↔ Popup |

### Backend (API Server)
| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Runtime | Node.js 20 LTS | |
| Framework | Fastify | ~30% nhanh hơn Express |
| Validation | Zod | Runtime + TypeScript types |
| Auth | JWT (@fastify/jwt) | Stateless, phù hợp extension |
| ORM | Prisma | Type-safe queries, migrations |
| Queue | BullMQ | Redis-backed, retry, delays |
| Scraping | Playwright + Chromium | Anti-bot tốt hơn Puppeteer |

### Infrastructure
| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Database chính | PostgreSQL + TimescaleDB | Time-series cho price_history |
| Cache | Redis 7 | Price cache TTL 5 min, sessions |
| Deploy | Railway (MVP) | Đơn giản, đủ cho 10k MAU |
| Email | Resend | 3k email/tháng miễn phí |
| Notification | Zalo OA API | Thị trường VN prefer Zalo |
| Storage | S3-compatible | Logs, scraper screenshots |

---

## 3. Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Chrome Extension MV3)       │
│  Content Script │ Popup UI │ Background SW │ Options│
└────────────────────┬────────────────────────────┘
                     │ chrome.runtime / fetch
┌────────────────────▼────────────────────────────┐
│  API GATEWAY LAYER (Fastify)                     │
│  Rate limiter │ JWT auth │ Router │ Formatter    │
└────────────────────┬────────────────────────────┘
                     │ internal calls only
┌────────────────────▼────────────────────────────┐
│  BUSINESS LOGIC LAYER (Services)                 │
│  PriceService │ AlertService │ HistoryService    │
│  AffiliateService │ UserService                  │
└────────────────────┬────────────────────────────┘
                     │ repository pattern
┌────────────────────▼────────────────────────────┐
│  DATA & INTEGRATION LAYER                        │
│  Redis cache │ PostgreSQL │ Scraper pool         │
│  Affiliate APIs │ BullMQ workers │ Cron          │
└─────────────────────────────────────────────────┘
```

**Quy tắc bắt buộc:** Mỗi layer chỉ giao tiếp với layer ngay dưới nó. Không skip layer. Business logic không được import thẳng từ database client.

---

## 4. Folder Structure

```
price-guard/
├── extension/                    # Chrome Extension
│   ├── manifest.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── content/
│   │   │   ├── index.ts          # Entry — inject vào trang sản phẩm
│   │   │   ├── detectors/
│   │   │   │   ├── shopee.ts     # Detect giá/tên trên Shopee
│   │   │   │   ├── tiki.ts
│   │   │   │   └── lazada.ts
│   │   │   └── ui/
│   │   │       └── PriceTag.tsx  # Badge giá hiển thị inline trên trang
│   │   ├── background/
│   │   │   ├── index.ts          # Service Worker entry
│   │   │   ├── api.ts            # Fetch wrapper gọi backend
│   │   │   ├── cache.ts          # chrome.storage.local helpers
│   │   │   └── alarms.ts         # Watchlist check định kỳ
│   │   ├── popup/
│   │   │   ├── App.tsx           # Popup root
│   │   │   ├── components/
│   │   │   │   ├── PriceList.tsx
│   │   │   │   ├── PriceHistory.tsx  # Sparkline chart
│   │   │   │   ├── AlertBanner.tsx
│   │   │   │   └── WatchButton.tsx
│   │   │   └── hooks/
│   │   │       ├── usePrices.ts
│   │   │       └── useWatchlist.ts
│   │   └── options/
│   │       └── App.tsx           # Settings page
│   └── public/
│       └── icons/
│
├── api/                          # Backend Fastify
│   ├── src/
│   │   ├── server.ts             # Entry point
│   │   ├── routes/               # Gateway layer
│   │   │   ├── prices.ts         # POST /api/prices
│   │   │   ├── watchlist.ts      # GET/POST /api/watchlist
│   │   │   └── auth.ts           # POST /api/auth/*
│   │   ├── services/             # Business logic layer
│   │   │   ├── PriceService.ts
│   │   │   ├── AlertService.ts
│   │   │   ├── HistoryService.ts
│   │   │   └── AffiliateService.ts
│   │   ├── scrapers/             # Data adapters
│   │   │   ├── base.ts           # Abstract scraper interface
│   │   │   ├── ShopeeAdapter.ts
│   │   │   ├── TikiAdapter.ts    # Dùng Tiki Open API
│   │   │   └── LazadaAdapter.ts  # Dùng Lazada Affiliate API
│   │   ├── jobs/                 # BullMQ workers
│   │   │   ├── scrapeWorker.ts
│   │   │   └── alertWorker.ts
│   │   ├── db/
│   │   │   ├── prisma/
│   │   │   │   └── schema.prisma
│   │   │   └── redis.ts
│   │   └── utils/
│   │       ├── cache.ts          # Redis helpers với TTL
│   │       └── affiliate.ts      # Link generation
│   └── package.json
│
└── shared/                       # Types dùng chung
    └── types/
        ├── product.ts
        ├── price.ts
        └── api.ts
```

---

## 5. Database Schema

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  urlHash     String   @unique  // MD5 của normalized URL
  imageUrl    String?
  createdAt   DateTime @default(now())

  prices      PriceHistory[]
  watchlist   Watchlist[]
}

model PriceHistory {
  id          BigInt   @id @default(autoincrement())
  productId   String
  platform    Platform // SHOPEE | TIKI | LAZADA
  price       Int      // Lưu bằng đồng, không dùng float
  originalPrice Int?
  url         String
  affiliateUrl String?
  capturedAt  DateTime @default(now())

  product     Product  @relation(fields: [productId], references: [id])

  @@index([productId, capturedAt])  // Query lịch sử nhanh
  @@index([productId, platform])
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  plan        Plan     @default(FREE)  // FREE | PRO
  affiliateTag String? // Tag riêng của user nếu họ là affiliate
  createdAt   DateTime @default(now())

  watchlist   Watchlist[]
}

model Watchlist {
  id          String   @id @default(cuid())
  userId      String
  productId   String
  targetPrice Int      // Giá mục tiêu (đồng)
  notifyVia   String[] // ["email", "zalo"]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
  product     Product  @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
}

enum Platform { SHOPEE TIKI LAZADA }
enum Plan     { FREE PRO }
```

**Lưu ý quan trọng:** Luôn lưu giá bằng số nguyên (đồng), không bao giờ dùng `Float` cho tiền tệ để tránh floating point error.

---

## 6. API Contract

### POST /api/prices
Request từ extension khi detect sản phẩm:
```typescript
// Request
{
  productName: string   // Tên sản phẩm extract từ DOM
  currentUrl: string    // URL trang đang xem
  platform: "shopee" | "tiki" | "lazada"
  currentPrice: number  // Giá đang hiển thị trên trang (đồng)
}

// Response (< 800ms target)
{
  product: {
    id: string
    name: string
  }
  prices: Array<{
    platform: string
    price: number
    originalPrice?: number
    discount?: number       // % giảm
    url: string
    affiliateUrl: string    // Link có tracking
    shipping: string        // "Giao hôm nay" | "2-3 ngày"
    isCheapest: boolean
    isCurrent: boolean      // Đây có phải sàn đang xem không
  }>
  history: Array<{
    date: string            // ISO date
    minPrice: number        // Giá thấp nhất ngày đó
  }>
  savings: {
    amount: number          // Tiết kiệm được bao nhiêu đồng
    percent: number         // %
    bestPlatform: string
  }
}
```

### GET /api/watchlist
### POST /api/watchlist
### DELETE /api/watchlist/:id

---

## 7. Key Business Rules

**Caching strategy:**
- Redis key: `price:{MD5(normalizedProductName)}` — TTL 5 phút
- Cache HIT: trả về ngay, không gọi scraper — target < 100ms
- Cache MISS: chạy scraper 3 sàn song song — target < 800ms
- Sau khi scrape xong: `SET` Redis + lưu async vào PostgreSQL (non-blocking)

**Product matching:**
- Normalize tên sản phẩm: lowercase, bỏ dấu, bỏ special chars, bỏ màu sắc/size
- Fuzzy match với threshold 0.85 (dùng `fuse.js`) để tìm cùng sản phẩm trên 3 sàn
- Luôn hiển thị kết quả ngay cả khi chỉ tìm được 1–2 sàn

**Affiliate links:**
- Tiki: `https://tiki.vn/...?ref=PRICEGUARD`
- Lazada: dùng Lazada Affiliate API để generate trackable URL
- Shopee: `https://shope.ee/...` qua Shopee Affiliate Program

**Anti-ban cho scraper:**
- User-agent rotation
- Request delay ngẫu nhiên 500–2000ms
- Rotating residential proxies cho Shopee (block mạnh nhất)
- Playwright stealth mode (`playwright-extra` + `puppeteer-extra-plugin-stealth`)
- Fallback: nếu scrape fail 3 lần → dùng cached data + hiển thị warning

**Free vs Pro limits:**
- Free: 3 sàn, lịch sử 30 ngày, 5 watchlist, email alert
- Pro: 5+ sàn, lịch sử 90 ngày, unlimited watchlist, Zalo + email alert

---

## 8. Extension — Luồng hoạt động

```
Người dùng mở trang sản phẩm
    │
    ▼
Content Script chạy (inject tự động)
    │── URL match manifest host_permissions?
    │       NO → dừng, không làm gì
    │       YES → tiếp tục
    │
    ▼
MutationObserver theo dõi DOM
    │── Detect tên sản phẩm + giá hiện tại
    │── Gửi message đến Background SW:
    │   { type: 'PRODUCT_DETECTED', name, price, url }
    │
    ▼
Background Service Worker nhận message
    │── Kiểm tra chrome.storage.local cache
    │       HIT (< 5 phút) → gửi data về Popup ngay
    │       MISS → gọi API backend
    │
    ▼
API Backend xử lý (xem Section 6)
    │
    ▼
Background SW nhận response
    │── Lưu vào chrome.storage.local (TTL 5 phút)
    │── Gửi về Popup để render
    │── Update extension badge (icon) nếu có giá rẻ hơn
    │
    ▼
Popup UI render kết quả
    │── Hiển thị danh sách giá
    │── Hiển thị sparkline lịch sử
    │── Alert banner nếu đang ở sàn đắt hơn
```

---

## 9. Conventions & Code Style

```typescript
// Tất cả giá: số nguyên (đồng), không dùng float
const price: number = 799000  // ✅
const price: number = 799.0   // ❌

// Format tiền: luôn dùng helper
formatVND(799000) // → "799.000đ"

// API calls: luôn có timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000)  // 5 giây timeout
})

// Errors: không để lọt ra UI thô
try { ... } catch (e) {
  // Log chi tiết cho dev
  console.error('[PriceService]', e)
  // Trả về fallback thân thiện cho user
  return { error: 'Không thể tải giá. Vui lòng thử lại.' }
}

// Naming:
// - Services: PascalCase class, camelCase methods
// - API routes: kebab-case (/api/price-history)
// - DB columns: snake_case (captured_at)
// - TS types: PascalCase interface/type
// - React components: PascalCase
// - Hooks: camelCase bắt đầu bằng "use"
```

---

## 10. Môi trường phát triển

```bash
# Clone và setup
git clone <repo>
cd price-guard
pnpm install          # cài tất cả workspaces

# Extension
cd extension
pnpm dev              # Vite dev server + CRXJS hot reload

# Load vào Chrome:
# chrome://extensions → Developer mode ON → Load unpacked → chọn extension/dist/

# Backend
cd api
cp .env.example .env  # điền DATABASE_URL, REDIS_URL, JWT_SECRET
pnpm db:migrate       # prisma migrate dev
pnpm dev              # nodemon + ts-node

# Test
pnpm test             # vitest
pnpm test:e2e         # playwright test
```

**.env cần thiết cho API:**
```
DATABASE_URL="postgresql://user:pass@localhost:5432/priceguard"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-min-32-chars"
TIKI_API_KEY=""
LAZADA_APP_KEY=""
LAZADA_APP_SECRET=""
RESEND_API_KEY=""
ZALO_OA_TOKEN=""
```

---

## 11. Phạm vi MVP (Phase 1)

**Trong scope — phải xong trước launch:**
- [ ] Content script detect sản phẩm trên Shopee, Tiki, Lazada
- [ ] Popup hiển thị so sánh giá 3 sàn
- [ ] Lịch sử giá 30 ngày dạng sparkline
- [ ] Nút "Mua ở [sàn]" có affiliate link
- [ ] Alert banner khi đang ở sàn đắt hơn
- [ ] Cache Redis 5 phút

**Ngoài scope MVP — phase sau:**
- Phát hiện review ảo
- Alert Zalo
- Gói Pro / thanh toán
- Thêm sàn (Sendo, CellphoneS, FPT Shop)
- Dashboard web

---

## 12. Hướng dẫn làm việc với AI

Khi đưa task cho AI trong session này, hãy dùng format sau để kết quả chính xác nhất:

```
[TASK] Mô tả ngắn gọn task cần làm

[FILE] File cần tạo/chỉnh sửa: extension/src/content/detectors/shopee.ts

[CONTEXT] Bất kỳ context thêm nào AI cần biết

[OUTPUT] Kết quả mong muốn: TypeScript function / React component / SQL migration / ...
```

**Ví dụ task hợp lệ:**
```
[TASK] Viết shopee detector extract tên + giá sản phẩm từ DOM

[FILE] extension/src/content/detectors/shopee.ts

[CONTEXT] Shopee dùng class động, cần MutationObserver. 
          Giá format "799.000 ₫". Tên nằm trong h1.

[OUTPUT] TypeScript module export { detectProduct, getPrice }
         dùng interface ProductInfo từ shared/types/product.ts
```

---

*File này được tạo ngày: 2026-03-22*  
*Cập nhật khi: thay đổi tech stack, thêm service mới, thay đổi API contract*
