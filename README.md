# EtherStar Jewels (ether-jewels)

Lab-grown diamond jewelry store — React storefront + Express/MongoDB API.
Rebuilt to pixel-match the original Shopify reference theme;
code comments marked `live:` record the original values.

## Tech stack

| Layer   | Inside this repo |
| ------- | ---------------- |
| Storefront (`client/`) | React 19, Vite 8 (dev server), Tailwind CSS 4, `react-router-dom` 7, `lucide-react` icons |
| API (`server/`) | Node.js, Express 4, Mongoose 8, `jsonwebtoken` (auth), `bcryptjs` (passwords), `cors`, `dotenv` |
| Database | MongoDB Atlas (cloud, `mongodb+srv://…`) — offline fallback via `mongodb-memory-server` (dev only) |
| Dev tooling | `concurrently` (run both apps), `oxlint` (client lint) |

Ports: **3000** storefront · **5001** API · **27017** local Mongo (fallback only).
Vite proxies `/api/*` → `http://localhost:5001`, so the frontend calls relative URLs.

## Project structure

```
ether-jewels/
├── client/                    # Storefront (Vite + React)
│   └── src/
│       ├── pages/             # Route pages (Home, Collection, ProductDetail,
│       │                      #   Diamond, Cart, Search, Login, Contact, About,
│       │                      #   Faqs, Return/Shipping/Terms/Privacy, InfoShell)
│       ├── components/
│       │   ├── layout/        # Header, Footer, CartDrawer, MobileNav
│       │   ├── product/       # ProductCard, ProductGrid
│       │   ├── sections/      # Home sections (HeroSlideshow, ShopByShape,
│       │                      #   NewArrivals, GoldComparison, …)
│       │   ├── filters/       # RangeSlider
│       │   └── ui/            # NewsletterPopup, CookieConsent
│       ├── context/BagContext.jsx     # Bag state (localStorage + /api/bag sync,
│       │                                #   guest merge sums, save-for-later)
│       ├── context/WishlistContext.jsx  # Favourites (localStorage + /api/wishlist)
│       ├── data/products.js         # Static catalog fallback: products,
│       │                            #   shapes, categories + helpers
│       │                            #   (resolveCategory, findProduct, productsForCategory)
│       ├── App.jsx                  # Routes (see table below)
│       └── index.css                # Theme tokens, container, card, footer styles
├── server/                    # API (Express + Mongoose)
│   ├── server.js              # App entry: middleware + route mounting
│   ├── local.js               # Offline launcher: in-memory Mongo on 27017 + API
│   ├── seed.js                # Neutralized (was: 22 categories + 15 products);
│   │                          #   catalog now managed via /admin panel
│   ├── config/
│   │   ├── db.js              # connectDB()
│   │   └── catalog.js         # Shared rules: RING_CATEGORIES, shapes,
│   │                          #   DEFAULT_RING_SIZES, isRingCategory()
│   ├── models/                # User, Product, Category, Order, Coupon,
│   │                          #   Review, Inquiry, Subscriber, Bag, Wishlist
│   ├── routes/                # auth, products, categories, orders, coupons,
│   │                          #   reviews, inquiries, newsletter, dbViewer,
│   │                          #   bag, wishlist
│   ├── scripts/               # ensure-catalog, migrate-bag-wishlist
│   │                          #   (embedded User.cart/wishlist -> collections)
│   └── middleware/auth.js     # signToken, authOptional/Required, requireAdmin
├── .env / .env.example        # Root sample env (see server/.env for real values)
└── package.json               # Root scripts (concurrently runs both apps)
```

## Run it

Prerequisites: Node.js 20+, internet (Atlas cloud DB).

```bash
# first time (from repo root)
npm run install-all

# every day — terminal 1: API (needs server/.env with Atlas MONGO_URI)
cd server && node server.js        # → http://localhost:5001/api/health

# terminal 2: storefront
cd client && npm run dev           # → http://localhost:3000
```

No local MongoDB install needed — production path uses Atlas.
Offline fallback (ephemeral data, reseeds on restart):
`cd server && npm run local` (in-memory Mongo + API), then `npm run seed` in a second terminal.

### Scripts

| Where | Script | What |
| ----- | ------ | ---- |
| root | `npm run dev` | API + storefront together |
| root | `npm run server` / `npm run client` | One app only |
| root | `npm run install-all` | Install root + server + client |
| server | `node server.js` / `npm start` | API against Atlas |
| server | `npm run local` | API against in-memory Mongo |
| server | `npm run seed` | No-op (seed data neutralized; use /admin) |
| client | `npm run dev` / `build` / `preview` | Vite dev / prod build / preview |
| client | `npm run lint` | oxlint |

## Database (MongoDB, Mongoose)

Connection: `server/.env` → `MONGO_URI` (Atlas `mongodb+srv://…/etherstar-jewels`).
`.env` is gitignored — never commit secrets; `.env.example` holds placeholders.

Collections: `users, products, categories, orders, coupons, reviews, inquiries, subscribers`
(Diamond page is a Coming Soon placeholder; loose-diamond inventory is not modeled yet).

Jewelry rules enforced in code:
- **USD-only** (`currency: 'USD'` on Product/Order).
- **Ring sizes required only for ring categories** (`rings, solitaire-rings, halo-rings, engagement-rings, three-stone-rings, bands`); forbidden otherwise. Orders reject ring items without `size`.
- Products are **settings only** (center diamond excluded) — `price` = 14KT base, `kt18Delta` added for 18KT; `styleCode` = SKU (`MJ72R`); `legacySlugs[]` keeps old URLs working; `shape`, metal `variants[]`, `images[]` + optional `video`.
- `Category.key` is the source of truth (supports aggregates like `rings`, shape collections, aliases) — new categories need no migration.
- Reviews denormalize `ratingAvg/ratingCount` onto Product on approve.

Seed data mirrors `client/src/data/products.js` (the catalog truth).

## API endpoints

Base `http://localhost:5001`. Auth: `Authorization: Bearer <JWT>` (register/login return it).

| Method & path | Auth | What |
| ------------- | ---- | ---- |
| `GET /api/health` | – | `{"status":"ok"}` |
| `POST /api/auth/register`, `POST /api/auth/login` | – | Create session → `{token, user}` |
| `GET /api/auth/me` | user | Own profile |
| `GET /api/bag` | user | Bag + saved-for-later (populated; pruned counts reported) |
| `PUT /api/bag` | user | Replace bag `{items}` → `{items, saved, dropped, droppedAll}` |
| `PATCH /api/bag/lines` | user | Set one line qty `{key, qty}` (≤0 removes) |
| `POST /api/bag/save-for-later`, `POST /api/bag/move-to-bag` | user | Shelf moves by `{key}` |
| `DELETE /api/bag/saved` | user | Remove one shelf line `{key}` |
| `GET /api/wishlist`, `POST /api/wishlist`, `DELETE /api/wishlist/:productId` | user | Favourites (populated) |
| `POST /api/wishlist/merge` | user | Union guest fav ids |
| `POST /api/wishlist/move-to-bag` | user | Favourite → bag line |
| `GET /api/products?category=&shape=&metal=&minPrice=&maxPrice=&search=&featured=&sort=&page=&limit=` | – | Filtered list `{items,total,page,pages}` |
| `GET /api/products/:slug` | – | One product (also matches `legacySlugs`) |
| `POST/PUT /api/products`, `DELETE /api/products/:id` (→ archive) | admin | Catalog CRUD (forces `USD`) |
| `GET /api/categories`, `GET /api/categories/:key` | – | Collections (resolves aliases) |
| `POST /api/orders` | optional | Create order (guest OK); validates ring sizes, coupon, USD math |
| `GET /api/orders/mine` | user | Own orders |
| `GET /api/orders`, `PATCH /api/orders/:id/status` | admin | All orders / status flow |
| `POST /api/coupons/validate`, `GET/POST /api/coupons` | –, admin | Discount check + management |
| `GET /api/reviews/product/:id`, `POST /api/reviews`, `PATCH /api/reviews/:id/approve` | –, –, admin | Reviews + approval (recalcs rating) |
| `POST /api/inquiries`, `GET /api/inquiries` | –, admin | Contact / custom-design messages |
| `POST /api/newsletter/subscribe`, `POST /api/newsletter/unsubscribe` | – | Newsletter (footer popup uses `source`) |
| `GET /admin/db`, `GET /admin/db/:collection` | – | **Dev-only** read-only DB viewer (disabled when `NODE_ENV=production`) |

## Storefront flow

Routes (`App.jsx`): `/` Home · `/collections/:category` · `/products/:slug` ·
`/pages/diamond` (Coming Soon search UI) · `/search` · `/cart` · `/account/login` ·
`/pages/contact|about-us|faqs|return-policy|shipping-and-deliveries` ·
`/policies/terms-of-service|privacy-policy`.

Flow: Home sections → Collection (filters, sort, 2-col mobile / 3-col desktop grid, 50/page `?page=` pagination) → Product card (`From $1,500.00 USD`, hover 2nd image desktop, Choose options overlay, no badges) → PDP (KT 14/18 selector, metal swatches, ring size, qty → bag) → Bag (`BagContext`: localStorage guest bag + `/api/bag` account sync, login merge sums quantities, save-for-later shelf, moves to/from wishlist) → checkout creates `POST /api/orders` (guest or logged-in) → reviews/contact/newsletter feed their collections.

Conventions: section air lives in container `pt-/pb-` pairs (mobile + `lg:`) with a `live:` comment recording reference values; footer bg `#ece7e3`; headings New York serif, links 15px `#222`.

## Setup from scratch (new machine)

1. `git clone … && cd ether-jewels && npm run install-all`
2. Copy `.env.example` → `server/.env`, fill `MONGO_URI` (Atlas: Database → Connect → Drivers → `mongodb+srv://user:pass@host/etherstar-jewels`), set a long `JWT_SECRET`
3. Atlas: Database user + Network Access `0.0.0.0/0` (dev) — same steps as cloud.mongodb.com onboarding
4. Add your catalog in `/admin` (categories first, then products) — `npm run seed` is neutralized
5. `node server.js` + `cd client && npm run dev` → open `http://localhost:3000`
6. Browse data: `http://localhost:5001/admin/db` or Atlas → Browse Collections

## Security notes

- Real `MONGO_URI`/passwords only in gitignored `server/.env`; rotate the Atlas DB password after sharing it with anyone.
- `JWT_SECRET` must be long/random in any shared/deployed env (`dev-only-change-me` is local-only).
- `/admin/db` is dev-only; keep `NODE_ENV=production` on deploys.
- Atlas `0.0.0.0/0` is a dev convenience — restrict to server IPs in production.
