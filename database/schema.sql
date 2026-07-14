-- ============================================================================
-- Ahnajak Topup — MySQL Schema (consolidated from 70 Supabase/Postgres migrations)
-- ============================================================================
-- Run with: npm run db:migrate
-- This file is idempotent: safe to run multiple times (uses DROP TABLE IF EXISTS).
-- Postgres → MySQL conversion notes:
--   UUID DEFAULT gen_random_uuid()  → CHAR(36) DEFAULT (UUID())
--   TIMESTAMP WITH TIME ZONE         → DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
--   JSONB                            → JSON
--   BOOLEAN                          → TINYINT(1)
--   app_role ENUM type                → ENUM('admin','user')
--   auth.users(id)                    → users(id)  (our own users table)
--   RLS policies                      → removed (authorization handled in Express API layer)
--   SECURITY DEFINER functions         → moved to Express API endpoints
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- users (replaces Supabase auth.users)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(255),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (email)
);

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS profiles;
CREATE TABLE profiles (
  id            CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id       CHAR(36)      NOT NULL,
  email         TEXT,
  display_name  TEXT,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  reward_points  INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- user_roles
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS user_roles;
CREATE TABLE user_roles (
  id         CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id    CHAR(36)  NOT NULL,
  role       ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- site_settings (key-value store with JSON values)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS site_settings;
CREATE TABLE site_settings (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  `key`      VARCHAR(255) NOT NULL,
  value      JSON         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (`key`)
);

-- ----------------------------------------------------------------------------
-- games
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS games;
CREATE TABLE games (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  image                TEXT,
  description          TEXT,
  sort_order           INT          DEFAULT 0,
  slug                 VARCHAR(255),
  g2bulk_category_id   TEXT,
  default_package_icon TEXT,
  cover_image          TEXT,
  tags                 JSON,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (slug)
);

-- ----------------------------------------------------------------------------
-- packages
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS packages;
CREATE TABLE packages (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  game_id              CHAR(36)     NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  amount               VARCHAR(255) NOT NULL,
  price                DECIMAL(10,2) NOT NULL,
  icon                 TEXT,
  sort_order           INT          DEFAULT 0,
  label                TEXT,
  label_bg_color       VARCHAR(255) DEFAULT '#dc2626',
  label_text_color     VARCHAR(255) DEFAULT '#ffffff',
  label_icon           TEXT,
  g2bulk_product_id    TEXT,
  g2bulk_type_id       TEXT,
  quantity             INT,
  points               INT          DEFAULT 0,
  price_markup_percent DECIMAL(5,2),
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_packages_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_packages_game (game_id)
);

-- ----------------------------------------------------------------------------
-- special_packages
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS special_packages;
CREATE TABLE special_packages (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  game_id              CHAR(36)     NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  amount               VARCHAR(255) NOT NULL,
  price                DECIMAL(10,2) NOT NULL,
  icon                 TEXT,
  sort_order           INT          DEFAULT 0,
  label                TEXT,
  label_bg_color       VARCHAR(255) DEFAULT '#dc2626',
  label_text_color     VARCHAR(255) DEFAULT '#ffffff',
  label_icon           TEXT,
  g2bulk_product_id    TEXT,
  g2bulk_type_id       TEXT,
  quantity             INT,
  points               INT          DEFAULT 0,
  price_markup_percent DECIMAL(5,2),
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_special_packages_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_special_packages_game (game_id)
);

-- ----------------------------------------------------------------------------
-- preorder_packages
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS preorder_packages;
CREATE TABLE preorder_packages (
  id                    CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  game_id               CHAR(36)     NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  amount                VARCHAR(255) NOT NULL,
  price                 DECIMAL(10,2) NOT NULL,
  icon                  TEXT,
  sort_order            INT          DEFAULT 0,
  label                 TEXT,
  label_bg_color        VARCHAR(255) DEFAULT '#dc2626',
  label_text_color      VARCHAR(255) DEFAULT '#ffffff',
  label_icon            TEXT,
  g2bulk_product_id     TEXT,
  g2bulk_type_id        TEXT,
  quantity              INT,
  scheduled_fulfill_at  DATETIME,
  points                INT          DEFAULT 0,
  price_markup_percent  DECIMAL(5,2),
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preorder_packages_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX idx_preorder_packages_game (game_id)
);

-- ----------------------------------------------------------------------------
-- preorder_games (admin selects which games offer pre-order)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS preorder_games;
CREATE TABLE preorder_games (
  id         CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  game_id    CHAR(36)  NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT       DEFAULT 0,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (game_id),
  CONSTRAINT fk_preorder_games_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- topup_orders
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS topup_orders;
CREATE TABLE topup_orders (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id          CHAR(36),
  game_name        VARCHAR(255) NOT NULL,
  package_name     VARCHAR(255) NOT NULL,
  player_id        VARCHAR(100) NOT NULL,
  server_id        TEXT,
  player_name      TEXT,
  amount           DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(10)  DEFAULT 'USD',
  payment_method   VARCHAR(50),
  g2bulk_order_id  TEXT,
  g2bulk_product_id TEXT,
  card_codes       JSON,
  status           VARCHAR(50)  DEFAULT 'pending',
  status_message   TEXT,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_topup_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_topup_orders_user (user_id),
  INDEX idx_topup_orders_status (status),
  INDEX idx_topup_orders_created (created_at)
);

-- ----------------------------------------------------------------------------
-- preorder_orders
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS preorder_orders;
CREATE TABLE preorder_orders (
  id                CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id           CHAR(36),
  game_name         VARCHAR(255) NOT NULL,
  package_name      VARCHAR(255) NOT NULL,
  player_id         VARCHAR(100) NOT NULL,
  server_id         TEXT,
  player_name       TEXT,
  amount            DECIMAL(10,2) NOT NULL,
  currency          VARCHAR(10)  DEFAULT 'USD',
  payment_method    VARCHAR(50),
  g2bulk_order_id   TEXT,
  g2bulk_product_id TEXT,
  card_codes        JSON,
  status            VARCHAR(50)  NOT NULL DEFAULT 'notpaid',
  status_message    TEXT,
  scheduled_fulfill_at DATETIME,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preorder_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_preorder_orders_user (user_id),
  INDEX idx_preorder_orders_status (status)
);

-- ----------------------------------------------------------------------------
-- payment_gateways
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS payment_gateways;
CREATE TABLE payment_gateways (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  slug       VARCHAR(100) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  enabled    TINYINT(1)   DEFAULT 1,
  config     JSON,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (slug)
);

-- ----------------------------------------------------------------------------
-- payment_gateways_public (VIEW — exposes only non-sensitive config fields)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS payment_gateways_public;
CREATE VIEW payment_gateways_public AS
SELECT
  id,
  slug,
  name,
  enabled,
  created_at,
  updated_at,
  JSON_OBJECT(
    'websocket_url', JSON_EXTRACT(config, '$.websocket_url'),
    'profile_id', JSON_EXTRACT(config, '$.profile_id'),
    'checkout_url', JSON_EXTRACT(config, '$.checkout_url')
  ) AS config
FROM payment_gateways;

-- ----------------------------------------------------------------------------
-- payment_qr_settings
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS payment_qr_settings;
CREATE TABLE payment_qr_settings (
  id              CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  payment_method  VARCHAR(100) NOT NULL,
  qr_code_image   TEXT,
  bank_name        TEXT,
  account_name     TEXT,
  account_number   TEXT,
  instructions     TEXT,
  is_enabled      TINYINT(1)   DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- api_configurations
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS api_configurations;
CREATE TABLE api_configurations (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  api_name    VARCHAR(255) NOT NULL,
  api_uid     TEXT,
  api_secret  TEXT,
  is_enabled  TINYINT(1)   DEFAULT 0,
  use_sandbox TINYINT(1)   DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (api_name)
);

-- ----------------------------------------------------------------------------
-- game_verification_configs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS game_verification_configs;
CREATE TABLE game_verification_configs (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  game_name    VARCHAR(255) NOT NULL,
  api_code     VARCHAR(255) NOT NULL,
  api_provider VARCHAR(50)  DEFAULT 'g2bulk',
  requires_zone TINYINT(1)  NOT NULL DEFAULT 0,
  default_zone TEXT,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  zone_options JSON,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gvc_game_name (game_name),
  INDEX idx_gvc_active (is_active)
);

-- ----------------------------------------------------------------------------
-- g2bulk_products (was seagm_products)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS g2bulk_products;
CREATE TABLE g2bulk_products (
  id                CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  g2bulk_type_id    TEXT         NOT NULL,
  g2bulk_product_id VARCHAR(255) NOT NULL,
  game_name         VARCHAR(255) NOT NULL,
  product_name      VARCHAR(255) NOT NULL,
  denomination      TEXT,
  price             DECIMAL(10,2) NOT NULL,
  currency          VARCHAR(10)  DEFAULT 'USD',
  fields            JSON,
  is_active         TINYINT(1)   DEFAULT 1,
  product_type      VARCHAR(50)  DEFAULT 'recharge',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (g2bulk_product_id),
  INDEX idx_g2bulk_game (game_name),
  INDEX idx_g2bulk_active (is_active),
  INDEX idx_g2bulk_type (product_type)
);

-- ----------------------------------------------------------------------------
-- wallet_transactions
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS wallet_transactions;
CREATE TABLE wallet_transactions (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id       CHAR(36)     NOT NULL,
  type          ENUM('topup','purchase','refund') NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after  DECIMAL(12,2) NOT NULL DEFAULT 0,
  description   TEXT,
  reference_id  TEXT,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wallet_user (user_id),
  INDEX idx_wallet_created (created_at)
);

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS events;
CREATE TABLE events (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  image       TEXT,
  content     TEXT,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT          DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- coupons
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS coupons;
CREATE TABLE coupons (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  code           VARCHAR(50)  NOT NULL,
  user_id        CHAR(36),
  discount_type  ENUM('fixed','percent') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  is_used        TINYINT(1)   DEFAULT 0,
  expires_at     DATETIME,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at        DATETIME,
  UNIQUE (code),
  CONSTRAINT fk_coupons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- point_exchange_configs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS point_exchange_configs;
CREATE TABLE point_exchange_configs (
  id                CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  points_required   INT          NOT NULL,
  exchange_type     ENUM('fixed','percent') NOT NULL,
  exchange_value    DECIMAL(10,2) NOT NULL,
  coupon_valid_days INT          DEFAULT 30,
  is_active         TINYINT(1)   DEFAULT 1,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- point_transactions
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS point_transactions;
CREATE TABLE point_transactions (
  id               CHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id          CHAR(36)  NOT NULL,
  amount           INT       NOT NULL,
  transaction_type ENUM('earn','exchange','admin_adjust') NOT NULL,
  description      TEXT,
  reference_id     CHAR(36),
  created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_point_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_point_tx_user (user_id)
);

SET FOREIGN_KEY_CHECKS = 1;
