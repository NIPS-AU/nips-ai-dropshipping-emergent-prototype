-- NIPS-AI Dropshipping Cloud · PostgreSQL schema
-- Run on a fresh database before first start.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Licenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  key             text PRIMARY KEY,
  plan            text NOT NULL DEFAULT 'Business',
  plan_label      text NOT NULL DEFAULT 'Business',
  domain          text NOT NULL,
  features        jsonb NOT NULL DEFAULT '["discovery","import_list","product_studio","ai_rewrite","updates"]'::jsonb,
  valid           boolean NOT NULL DEFAULT true,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT '2099-12-31'::timestamptz
);

-- Seed the admin/test license
INSERT INTO licenses (key, plan, plan_label, domain)
  VALUES ('NIPS-ADMIN-LICENSE-0001', 'Business', 'Business', 'alloutspares.com')
  ON CONFLICT (key) DO NOTHING;

-- ── Plugin releases ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_releases (
  version         text PRIMARY KEY,
  channel         text NOT NULL DEFAULT 'stable',
  released_at     date NOT NULL DEFAULT current_date,
  notes           text NOT NULL DEFAULT '',
  file_path       text NOT NULL,
  size_kb         integer NOT NULL DEFAULT 0,
  is_latest       boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS plugin_releases_latest_per_channel
  ON plugin_releases (channel) WHERE is_latest;

INSERT INTO plugin_releases (version, channel, released_at, notes, file_path, size_kb, is_latest) VALUES
  ('2.9.8','stable','2026-02-12','Image import engine — WebP 800x800 + Media Library dedupe.','nips-ai-dropshipping-v2.9.8.zip',498,true),
  ('2.9.7','stable','2026-02-10','Publish Product Studio draft to WooCommerce draft product.','nips-ai-dropshipping-v2.9.7.zip',489,false),
  ('2.9.6','stable','2026-02-08','Product Studio draft loader repair.','nips-ai-dropshipping-v2.9.6.zip',482,false),
  ('2.9.5','stable','2026-02-05','Discovery polish, exact URL capture stability.','nips-ai-dropshipping-v2.9.5.zip',471,false),
  ('2.9.4','stable','2026-01-28','Release/update server hardening.','nips-ai-dropshipping-v2.9.4.zip',463,false)
  ON CONFLICT (version) DO NOTHING;

-- ── Per-license workspace data (mirrors the prototype Mongo collections) ───
CREATE TABLE IF NOT EXISTS search_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key     text NOT NULL REFERENCES licenses(key) ON DELETE CASCADE,
  endpoint        text,
  mode            text,
  query           text NOT NULL,
  sort_by         text,
  shipping_from   text,
  shipping_to     text,
  result_count    integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_history_license_idx ON search_history (license_key, created_at DESC);

CREATE TABLE IF NOT EXISTS import_drafts (
  draft_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key           text NOT NULL REFERENCES licenses(key) ON DELETE CASCADE,
  is_variant_draft      boolean NOT NULL DEFAULT false,
  parent_product_id     text,
  variant_id            text,
  product_id            text NOT NULL,
  sku                   text,
  supplier_url          text,
  product_url           text,
  title                 text NOT NULL,
  price                 numeric(12,2) NOT NULL DEFAULT 0,
  retail_price          numeric(12,2) NOT NULL DEFAULT 0,
  profit_estimate       numeric(12,2) NOT NULL DEFAULT 0,
  currency              text NOT NULL DEFAULT 'USD',
  category              text,
  tags                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  main_image            text,
  gallery_images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  description_images    jsonb NOT NULL DEFAULT '[]'::jsonb,
  description           text,
  specifications        jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes            jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants              jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping              jsonb NOT NULL DEFAULT '{}'::jsonb,
  stock                 integer NOT NULL DEFAULT 0,
  supplier              jsonb NOT NULL DEFAULT '{}'::jsonb,
  studio_edits          jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_history            jsonb NOT NULL DEFAULT '[]'::jsonb,
  publish_status        text NOT NULL DEFAULT 'draft',
  wc_product_id         integer,
  wc_publish_mode       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS import_drafts_license_idx ON import_drafts (license_key, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_settings (
  license_key             text PRIMARY KEY REFERENCES licenses(key) ON DELETE CASCADE,
  title_rewrite           boolean NOT NULL DEFAULT true,
  description_cleanup     boolean NOT NULL DEFAULT true,
  seo_title               boolean NOT NULL DEFAULT true,
  seo_meta_description    boolean NOT NULL DEFAULT true,
  tags_suggest            boolean NOT NULL DEFAULT true,
  category_suggest        boolean NOT NULL DEFAULT true,
  attributes_cleanup      boolean NOT NULL DEFAULT true,
  specs_cleanup           boolean NOT NULL DEFAULT true,
  translate_enabled       boolean NOT NULL DEFAULT false,
  default_language        text NOT NULL DEFAULT 'en',
  default_model           text NOT NULL DEFAULT 'gpt-5.2',
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publish_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key     text NOT NULL REFERENCES licenses(key) ON DELETE CASCADE,
  draft_id        uuid,
  publish_mode    text NOT NULL,
  wc_product_id   integer,
  wc_status       text,
  title           text,
  status          text NOT NULL,
  steps           jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publish_logs_license_idx ON publish_logs (license_key, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key     text REFERENCES licenses(key) ON DELETE CASCADE,
  kind            text NOT NULL,
  message         text NOT NULL,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_license_idx ON activity_logs (license_key, created_at DESC);
