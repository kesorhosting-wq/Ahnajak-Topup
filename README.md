# Ahnajak Topup — Game Topup Platform (MySQL Edition)

A full-featured game topup platform built with **React + Vite + Express + MySQL**.
Formerly powered by Supabase, now fully self-contained with MySQL for easy cloning and deployment.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express 5 (Node.js, CommonJS) |
| Database | MySQL / MariaDB |
| Auth | JWT + bcrypt (self-contained, no external service) |
| File Storage | Local `/uploads/` directory (served by Express) |
| Payments | KHQR (Ahnajak/Kesor), KHQRcc (ABA Pay), IKhode Bakong |
| Game Fulfillment | G2Bulk API integration |

## Prerequisites

1. **Node.js** 18+ ([download](https://nodejs.org/))
2. **MySQL** 5.7+ or **MariaDB** 10.2+ (via XAMPP, WAMP, or standalone)
3. **npm** (comes with Node.js)

## Quick Start (Clone & Run)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Ahnajak-Topup

# 2. Copy environment config and fill in your MySQL credentials
cp .env.example .env
# Edit .env — at minimum set DB_PASSWORD and JWT_SECRET

# 3. Install dependencies
npm install

# 4. Create all database tables (24 tables + 1 view)
npm run db:migrate

# 5. Insert default data (admin user, site settings, game configs)
npm run db:seed

# 6. Start both the API server and Vite frontend together
npm run dev
```

Then open **http://localhost:8080** in your browser.

### Default Admin Account
- **Email:** `admin@ahnajak.com`
- **Password:** `admin123`
- ⚠️ **Change this password immediately after first login!**

## Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | MySQL server host | `localhost` |
| `DB_PORT` | MySQL server port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | `ahnajak_topup` |
| `JWT_SECRET` | Secret key for JWT tokens | (change this!) |
| `JWT_EXPIRES_IN` | Token expiry | `365d` |
| `PORT` | API server port | `3010` |
| `PUBLIC_BASE_URL` | Public URL for callbacks | `http://localhost:3010` |
| `ICON_API_KEY` | Icon search API key | |
| `G2BULK_API_KEY` | G2Bulk API key | |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (optional) | |
| `TELEGRAM_CHAT_ID` | Telegram chat ID (optional) | |

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API server + Vite frontend together |
| `npm run dev:server` | Start only the API server (port 3010) |
| `npm run dev:client` | Start only the Vite dev server (port 8080) |
| `npm run db:migrate` | Create all database tables from `database/schema.sql` |
| `npm run db:seed` | Insert default data from `database/seed.sql` |
| `npm run build` | Build the frontend for production |
| `npm run server` | Start the API server (production) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## Project Structure

```
ahnajak-topup/
├── database/                 # MySQL schema + seed data
│   ├── schema.sql            # All 24 tables + 1 view (consolidated)
│   └── seed.sql              # Default admin, settings, game configs
├── scripts/
│   ├── migrate.cjs           # Run: npm run db:migrate
│   └── seed.cjs              # Run: npm run db:seed
├── server/                   # Express API server (replaces Supabase)
│   ├── index.cjs             # Main server entry (port 3010)
│   ├── db.cjs                # MySQL connection pool
│   ├── auth.cjs              # JWT + bcrypt auth middleware
│   └── routes/               # API route modules
│       ├── auth.cjs          # Signup, signin, signout, session
│       ├── settings.cjs      # Site settings CRUD
│       ├── games.cjs         # Games + packages + special packages
│       ├── orders.cjs        # Topup orders + polling
│       ├── preorders.cjs     # Pre-order games/packages/orders
│       ├── events.cjs        # Events CRUD
│       ├── coupons.cjs       # Coupon validation (was RPC)
│       ├── points.cjs        # Reward points + exchange (was RPC)
│       ├── wallet.cjs        # Wallet transactions
│       ├── payments.cjs      # Payment gateways + webhooks
│       ├── uploads.cjs       # File uploads (was Supabase Storage)
│       ├── process-topup.cjs # G2Bulk fulfillment (was edge function)
│       ├── verify-game.cjs   # Game ID verification (was edge function)
│       ├── g2bulk.cjs        # G2Bulk API proxy (was edge function)
│       ├── ahnajak-khqr.cjs  # KHQR payment generation
│       ├── ikhode.cjs        # IKhode Bakong payment
│       ├── prices.cjs        # Price sync from G2Bulk
│       ├── api-configs.cjs   # API config + game verification config
│       └── misc.cjs           # Image proxy + icon search
├── src/                      # React frontend
│   ├── lib/
│   │   └── api.ts            # Fetch-based API client (replaces Supabase JS)
│   ├── integrations/supabase/
│   │   └── client.ts         # Compatibility shim (routes to api.ts)
│   ├── contexts/             # AuthContext, SiteContext, CartContext
│   ├── pages/                # All page components
│   ├── components/           # UI + admin components
│   └── hooks/                # Custom React hooks
├── uploads/                  # Uploaded files (banners, fonts, images)
├── .env.example              # Copy to .env and configure
└── package.json
```

## Database Schema

24 tables created by `database/schema.sql`:

| Table | Purpose |
|---|---|
| `users` | User accounts (email + bcrypt password) |
| `profiles` | User profiles (wallet balance, reward points) |
| `user_roles` | Admin/user role assignments |
| `site_settings` | Key-value store for all site customization |
| `games` | Game catalog |
| `packages` | Game topup packages |
| `special_packages` | Special/featured packages |
| `preorder_games` | Games available for pre-order |
| `preorder_packages` | Pre-order packages |
| `preorder_orders` | Pre-order order records |
| `topup_orders` | Topup order records |
| `payment_gateways` | Payment gateway configs (KHQR, KHQRcc, IKhode) |
| `payment_gateways_public` | View — public-safe gateway config |
| `payment_qr_settings` | QR code payment settings |
| `api_configurations` | API credentials (G2Bulk, etc.) |
| `game_verification_configs` | Game ID verification mappings |
| `g2bulk_products` | Cached G2Bulk product catalog |
| `wallet_transactions` | Wallet topup/purchase/refund records |
| `events` | Admin event posts |
| `coupons` | Discount coupons |
| `point_exchange_configs` | Point-to-coupon exchange configs |
| `point_transactions` | Reward point transaction log |

## Architecture

```
Browser → Vite Dev Server (:8080)
              ↓ proxy /api/*
         Express API Server (:3010)
              ↓ mysql2
         MySQL Database (:3306)
```

- **Frontend** calls `/api/*` endpoints (proxied by Vite in dev, or served directly in production)
- **Express API** handles auth (JWT), CRUD, payment processing, file uploads, and G2Bulk fulfillment
- **MySQL** stores all data — no external services required

## Production Deployment

```bash
# 1. Build the frontend
npm run build

# 2. Set production environment variables in .env
#    - Set a strong JWT_SECRET
#    - Set PUBLIC_BASE_URL to your domain
#    - Configure DB credentials

# 3. Run database migration
npm run db:migrate
npm run db:seed

# 4. Start the API server
npm run server

# 5. Serve the built frontend (from dist/) with nginx, Apache, or similar
#    Proxy /api/* to localhost:3010
```

## Using XAMPP for MySQL

1. Open XAMPP Control Panel
2. Start MySQL
3. Verify it's running on port 3306
4. Set `DB_PASSWORD=` (empty) in `.env` (XAMPP default has no password)

## License

This project is proprietary. All rights reserved.
