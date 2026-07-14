-- ============================================================================
-- Ahnajak Topup — Seed Data
-- ============================================================================
-- Run with: npm run db:seed
-- Idempotent: uses INSERT IGNORE so it's safe to run multiple times.
-- Default admin: admin@ahnajak.com / admin123  (CHANGE THIS PASSWORD IMMEDIATELY!)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Default admin user + profile + role
-- bcrypt hash of "admin123" (cost factor 10): $2a$10$...
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO users (id, email, password_hash, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@ahnajak.com',
  '$2a$10$CbAjJHOQSPxxgPwlLOdwIOW284QnZYIEbLgzouzs5j.RuzxvwxUPe',
  'Admin'
);

INSERT IGNORE INTO profiles (id, user_id, email, display_name, wallet_balance, reward_points)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'admin@ahnajak.com',
  'Admin',
  0,
  0
);

INSERT IGNORE INTO user_roles (id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  'admin'
);

-- ----------------------------------------------------------------------------
-- Payment gateways (disabled by default — configure in Admin panel)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO payment_gateways (id, slug, name, enabled, config)
VALUES
  (UUID(), 'ikhode-bakong', 'IKhode Bakong KHQR', 0, JSON_OBJECT(
    'node_api_url', '',
    'websocket_url', '',
    'webhook_secret', '',
    'custom_webhook_url', ''
  )),
  (UUID(), 'khqrcc', 'KHQRcc (ABA Pay)', 0, JSON_OBJECT(
    'profile_id', '',
    'secret_key', '',
    'checkout_url', 'https://khqr.cc/api/payment/requestv2'
  ));

-- ----------------------------------------------------------------------------
-- Default site settings (mirrors SiteContext.tsx defaults)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO site_settings (`key`, value) VALUES
  ('siteName',              JSON_QUOTE('Ahnajak Topup')),
  ('logoUrl',              JSON_QUOTE('')),
  ('logoSize',              64),
  ('logoMobilePosition',    50),
  ('headerHeightDesktop',   96),
  ('headerHeightMobile',    56),
  ('footerLogoUrl',        JSON_QUOTE('')),
  ('footerLogoSize',        32),
  ('heroText',              JSON_QUOTE('ជ្រើសរើសទំនិញ')),
  ('primaryColor',         JSON_QUOTE('#0ea5e9')),
  ('accentColor',          JSON_QUOTE('#0284c7')),
  ('backgroundColor',      JSON_QUOTE('#FFFFFF')),
  ('siteIcon',             JSON_QUOTE('')),
  ('browserTitle',         JSON_QUOTE('Ahnajak Topup - Game Topup Cambodia')),
  ('backgroundImage',      JSON_QUOTE('')),
  ('headerImage',          JSON_QUOTE('')),
  ('bannerImage',          JSON_QUOTE('')),
  ('bannerImages',         JSON_ARRAY()),
  ('bannerHeight',         256),
  ('gameCardBgColor',      JSON_QUOTE('')),
  ('gameCardBorderColor',  JSON_QUOTE('')),
  ('gameCardFrameImage',   JSON_QUOTE('')),
  ('gameCardBorderImage',  JSON_QUOTE('')),
  ('footerText',           JSON_QUOTE('')),
  ('footerBgColor',        JSON_QUOTE('')),
  ('footerTextColor',      JSON_QUOTE('')),
  ('footerTelegramIcon',   JSON_QUOTE('')),
  ('footerTiktokIcon',     JSON_QUOTE('')),
  ('footerFacebookIcon',   JSON_QUOTE('')),
  ('footerTelegramUrl',    JSON_QUOTE('')),
  ('footerTiktokUrl',      JSON_QUOTE('')),
  ('footerFacebookUrl',    JSON_QUOTE('')),
  ('footerPaymentIcons',   JSON_ARRAY()),
  ('footerPaymentIconSize', 32),
  ('topupBackgroundImage', JSON_QUOTE('')),
  ('topupBackgroundColor',  JSON_QUOTE('')),
  ('topupBannerImage',     JSON_QUOTE('')),
  ('topupBannerColor',     JSON_QUOTE('')),
  ('packageBgColor',       JSON_QUOTE('')),
  ('packageBgImage',       JSON_QUOTE('')),
  ('packageTextColor',     JSON_QUOTE('')),
  ('packagePriceColor',    JSON_QUOTE('')),
  ('packageIconUrl',       JSON_QUOTE('')),
  ('packageCurrency',      JSON_QUOTE('USD')),
  ('packageCurrencySymbol', JSON_QUOTE('$')),
  ('packageHeight',         36),
  ('packageIconWidth',     24),
  ('packageIconHeight',    24),
  ('packageIconSizeDesktop', 32),
  ('packageIconSizeMobile',  50),
  ('packageTextSize',       14),
  ('packagePriceSize',      14),
  ('packageTextWeight',     700),
  ('packagePriceWeight',    700),
  ('packageBorderWidth',    0),
  ('packageBorderColor',   JSON_QUOTE('#D4A84B')),
  ('frameColor',           JSON_QUOTE('#D4A84B')),
  ('frameBorderWidth',      4),
  ('idSectionBgColor',     JSON_QUOTE('')),
  ('idSectionBgImage',     JSON_QUOTE('')),
  ('idSectionTextColor',   JSON_QUOTE('')),
  ('paymentSectionBgColor', JSON_QUOTE('')),
  ('paymentSectionBgImage', JSON_QUOTE('')),
  ('paymentSectionTextColor', JSON_QUOTE('')),
  ('customKhmerFont',      JSON_QUOTE('')),
  ('customEnglishFont',    JSON_QUOTE('')),
  ('fallingIntensity',      0),
  ('fallingSpeed',          1),
  ('iconCdnBaseUrl',       JSON_QUOTE('')),
  ('contactButtonIcon',   JSON_QUOTE('')),
  ('featuredGamesTitle',   JSON_QUOTE('Featured Games'));

-- ----------------------------------------------------------------------------
-- Default game verification configs (subset — the full list from migrations)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO game_verification_configs (id, game_name, api_code, api_provider, requires_zone, default_zone, is_active) VALUES
  (UUID(), 'Mobile Legends', 'mlbb', 'g2bulk', 1, NULL, 1),
  (UUID(), 'MLBB', 'mlbb', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Mobile Legends Bang Bang', 'mlbb', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Mobile Legends Global', 'mlbb_global', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Magic Chess', 'magic_chest_gogo', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Free Fire', 'freefire_global', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Garena Free Fire', 'freefire_global', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Free Fire MAX', 'freefire_global', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Blood Strike', 'bloodstrike', 'g2bulk', 0, 'global', 1),
  (UUID(), 'PUBG Mobile', 'pubgm', 'g2bulk', 0, NULL, 1),
  (UUID(), 'PUBG', 'pubgm', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Honor of Kings', 'hok', 'g2bulk', 1, NULL, 1),
  (UUID(), 'HOK', 'hok', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Arena of Valor', 'aov', 'g2bulk', 1, NULL, 1),
  (UUID(), 'AOV', 'aov', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Call of Duty Mobile', 'codm', 'g2bulk', 0, NULL, 1),
  (UUID(), 'CODM', 'codm', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Valorant', 'valorant', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Valorant Cambodia', 'valorant_kh', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Genshin Impact', 'genshin', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Honkai Star Rail', 'honkai_star_rail', 'g2bulk', 1, NULL, 1),
  (UUID(), 'HSR', 'honkai_star_rail', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Zenless Zone Zero', 'zenless_zone_zero', 'g2bulk', 1, NULL, 1),
  (UUID(), 'ZZZ', 'zenless_zone_zero', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Wuthering Waves', 'wuthering_waves', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Clash of Clans', 'coc', 'g2bulk', 0, NULL, 1),
  (UUID(), 'COC', 'coc', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Brawl Stars', 'brawl_stars', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Clash Royale', 'clash_royale', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Wild Rift', 'wildrift', 'g2bulk', 0, NULL, 1),
  (UUID(), 'LoL Wild Rift', 'wildrift', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Stumble Guys', 'stumble_guys', 'g2bulk', 0, NULL, 1),
  (UUID(), '8 Ball Pool', '8_ball_pool', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Hago', 'hago', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Point Blank', 'point_blank', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Dragon City', 'dragon_city', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Higgs Domino', 'higgs_domino', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Higgs Domino Island', 'higgs_domino', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Sausage Man', 'sausage_man', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Super Sus', 'super_sus', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Delta Force', 'deltaforce', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Tower of Fantasy', 'tower_of_fantasy', 'g2bulk', 1, NULL, 1),
  (UUID(), 'Lords Mobile', 'lords_mobile', 'g2bulk', 0, NULL, 1),
  (UUID(), 'Roblox', 'roblox', 'roblox', 0, NULL, 1),
  (UUID(), 'Minecraft', 'minecraft', 'minecraft', 0, NULL, 1);
