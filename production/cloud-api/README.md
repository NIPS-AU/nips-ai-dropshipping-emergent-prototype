# NIPS-AI Dropshipping Cloud API · Production (api.nipsdownloads.com)

This is the production mirror of the Emergent prototype contract. Drop it on your
VPS, plug in your existing AliExpress provider, point DNS at the host, and the
WordPress plugin + the React dashboard at `dropshipping.nips.live` will both work
against the same canonical contract.

Stack: **Node.js 20 / Express · PostgreSQL 16 · Docker · Nginx**

---

## 0. What this serves

Same routes as the prototype, mirrored on real infrastructure:

```
POST   /v1/suppliers/aliexpress/search          ← canonical supplier search
POST   /api/v1/suppliers/aliexpress/search      ← Emergent-routable alias

GET    /api/dashboard/stats
GET    /api/license/status
GET    /api/logs                · DELETE /api/logs
GET    /api/maintenance         · POST   /api/maintenance/clear?target=...

GET    /api/imports             · POST /api/imports
GET    /api/imports/:id         · PATCH /api/imports/:id  · DELETE /api/imports/:id
DELETE /api/imports

GET    /api/ai/settings         · PUT  /api/ai/settings
POST   /api/ai/rewrite

POST   /api/publish             · GET /api/publish/logs

GET    /api/v1/plugin/releases  · GET /api/v1/plugin/releases/latest
GET    /v1/plugin/releases      · GET /v1/plugin/releases/latest
GET    /v1/plugin/releases/download?version=X.X.X&license_key=...
```

Every protected route requires a license-key header (default
`X-NIPS-License-Key`). The public release-metadata and download routes are
exempt. The download route validates the license key in the query string.

CORS allows (configurable via `CORS_ORIGINS`):
- `https://dropshipping.nips.live`
- `https://alloutspares.com`
- `https://api.nipsdownloads.com`
- `https://updates.nipsdownloads.com`
- Any `*.preview.emergentagent.com` host (regex)

---

## 1. Local quick-start

```bash
cp .env.example .env             # then edit DATABASE_URL, OPENAI_API_KEY, etc.

# Start Postgres locally if you don't have one running
docker run -d --name nips-pg -p 5432:5432 -e POSTGRES_USER=nips -e POSTGRES_PASSWORD=CHANGE_ME -e POSTGRES_DB=nips_cloud postgres:16-alpine

yarn install                     # or: npm install
yarn migrate                     # applies sql/schema.sql (idempotent)
yarn start                       # listens on :4100

# Smoke test
curl -s http://localhost:4100/healthz
curl -s -X POST http://localhost:4100/v1/suppliers/aliexpress/search \
  -H 'Content-Type: application/json' \
  -H 'X-NIPS-License-Key: NIPS-ADMIN-LICENSE-0001' \
  -d '{"query":"Makita Cordless Charger & Battery","platform":"aliexpress","shipping_from":"ALL","shipping_to":"AU","sort":"cheapest","limit":18}' | jq .
```

The mock provider ships out-of-the-box (`ALIEXPRESS_PROVIDER=mock`). See §3 to
swap in your real AliExpress integration.

---

## 2. Production deploy (VPS · Docker · Nginx)

### 2.1 Prep the host

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx docker.io docker-compose-plugin
sudo mkdir -p /opt/nips-ai-dropshipping-cloud/{cloud-api,storage/releases}
sudo chown -R $USER:$USER /opt/nips-ai-dropshipping-cloud
```

### 2.2 Copy the code

```bash
# from your workstation
rsync -avz ./ root@api.nipsdownloads.com:/opt/nips-ai-dropshipping-cloud/cloud-api/
```

### 2.3 Configure secrets

```bash
cd /opt/nips-ai-dropshipping-cloud/cloud-api
cp .env.example .env
nano .env       # set DATABASE_URL (point at the db container), OPENAI_API_KEY, ALIEXPRESS_*, LICENSE_REQUIRED=true
```

### 2.4 Boot the stack

```bash
docker compose up -d --build
docker compose logs -f api    # confirm: "▶ NIPS-AI Cloud API listening on :4100"
```

The Compose file:
- Builds the Node image
- Boots Postgres 16 with a named volume (`nips_cloud_pgdata`)
- Applies `sql/schema.sql` on every container start (idempotent)
- Mounts `/opt/nips-ai-dropshipping-cloud/storage/releases` read-only for ZIP downloads
- Binds the API to `127.0.0.1:4100` only — Nginx terminates TLS

### 2.5 Nginx + TLS

```bash
sudo cp nginx/api.nipsdownloads.com.conf       /etc/nginx/sites-available/
sudo cp nginx/updates.nipsdownloads.com.conf   /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.nipsdownloads.com.conf     /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/updates.nipsdownloads.com.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.nipsdownloads.com -d updates.nipsdownloads.com
sudo nginx -t && sudo systemctl reload nginx
```

DNS: point `api.nipsdownloads.com` and `updates.nipsdownloads.com` A records at
the VPS public IP.

### 2.6 Smoke-test production

```bash
curl -s https://api.nipsdownloads.com/healthz
curl -s -X POST https://api.nipsdownloads.com/v1/suppliers/aliexpress/search \
  -H 'Content-Type: application/json' \
  -H 'X-NIPS-License-Key: NIPS-ADMIN-LICENSE-0001' \
  -d '{"query":"headphones","platform":"aliexpress","sort":"best_score","limit":6}' | jq '.count, .results[0].title'
```

---

## 3. Plug in your real AliExpress provider

Open `src/lib/aliexpress.js`. There are four provider branches (`mock`, `rapidapi`,
`apify`, `aliexpress-open`); the mock is fully implemented. Fill in **one** of the
others to match the integration you already use on the existing cloud.

Each provider function must return:

```ts
{
  exact: ProductLike | null,       // set when a single exact match was found (URL/SKU)
  results: ProductLike[]           // up to `limit` items
}
```

`ProductLike` must include the fields the dashboard expects (see
`src/lib/scoring.js` → `flattenSupplierProduct` for the full list). At minimum:

```
product_id, sku, title, supplier_url, price, retail_price, profit_estimate,
currency, category, tags[], main_image, gallery_images[], description_images[],
description, specifications[], attributes[], variants[], shipping{}, stock,
supplier{}
```

`lib/scoring.js` derives `meta` (score, profit_pct, free_shipping, shipping_days_min,
orders, rating, feedback_count, breakdown) from those raw fields — no extra work
on the adapter side.

`orders` defaults to `feedback_count × 2.4` (heuristic). To use the real
AliExpress orders count, set `product.orders` on each item in your adapter — the
scoring helper will respect it.

---

## 4. Verbatim query contract (do not break)

The Emergent prototype guarantees the typed query is sent through byte-for-byte
to the cloud. This server preserves the same guarantee:

- The request body's `query` field is the only thing the supplier search reads.
- It is **echoed verbatim** in the response (`response.query === request.query`).
- No trimming, no normalisation, no rewriting. Even leading whitespace, smart
  quotes, ampersands and casing are preserved.

Test it:

```bash
curl -s -X POST https://api.nipsdownloads.com/v1/suppliers/aliexpress/search \
  -H 'Content-Type: application/json' \
  -H 'X-NIPS-License-Key: NIPS-ADMIN-LICENSE-0001' \
  -d '{"query":"Makita Cordless Charger & Battery","platform":"aliexpress"}' \
  | jq -r '.query'
# → Makita Cordless Charger & Battery
```

---

## 5. Postgres schema

`sql/schema.sql` creates 7 tables:

| Table | Purpose |
| --- | --- |
| `licenses` | License keys, plan, expiry. Seeded with `NIPS-ADMIN-LICENSE-0001`. |
| `plugin_releases` | Release catalogue. Seeded with v2.9.4 – v2.9.8. |
| `search_history` | Per-license Discovery searches. |
| `import_drafts` | Per-license Import List drafts (mirrors prototype Mongo `import_drafts`). |
| `ai_settings` | Per-license AI toggles + default model/language. |
| `publish_logs` | Per-license publish step history with `wc_product_id`. |
| `activity_logs` | Per-license audit feed shown on the dashboard. |

All non-license tables are keyed by `license_key` so a single deployment can
serve multiple customer storefronts.

---

## 6. Releases — ZIP layout

Place plugin ZIPs at `RELEASES_DIR` (default `/opt/nips-ai-dropshipping-cloud/storage/releases`).
Filenames must match the `file_path` column in `plugin_releases`.

```
/opt/nips-ai-dropshipping-cloud/storage/releases/
├── nips-ai-dropshipping-v2.9.4.zip
├── nips-ai-dropshipping-v2.9.5.zip
├── nips-ai-dropshipping-v2.9.6.zip
├── nips-ai-dropshipping-v2.9.7.zip
└── nips-ai-dropshipping-v2.9.8.zip
```

Mark a new release latest:

```sql
UPDATE plugin_releases SET is_latest=false WHERE channel='stable';
INSERT INTO plugin_releases(version, channel, released_at, notes, file_path, size_kb, is_latest)
VALUES ('2.9.9','stable','2026-02-15','Variant isolation publish flow','nips-ai-dropshipping-v2.9.9.zip', 511, true);
```

---

## 7. Mapping back to the WordPress plugin

The `POST /api/publish` route in this server is a **stub** — it writes a fake
WC product ID. Replace the marked block in `src/routes/publish.js` with a call
to the WordPress plugin REST endpoint on the customer site (looked up via
`licenses.domain`). The plugin then:

1. Builds the WC product from `draft.studio_edits` (never raw supplier JSON).
2. Downloads + WebP-converts images (Imagick / `imagewebp`) → Media Library.
3. Creates the WooCommerce draft product via `wp_insert_post` + WC meta.
4. Returns the real `wc_product_id` to the cloud.
5. Cloud stores the publish log and marks the draft as `published`.

---

## 8. Operational notes

- **Backups**: snapshot the `nips_cloud_pgdata` volume nightly + dump licenses table off-host.
- **Rate-limiting**: add `express-rate-limit` to `/api/ai/rewrite` (e.g. 60/min and 2000/day per license key) before opening to the public.
- **Observability**: `morgan combined` is already wired. Pipe to `journalctl` or ship to your log host.
- **CORS**: the regex for `*.preview.emergentagent.com` lets the Emergent prototype frontend hit production. Remove it once the Emergent preview is decommissioned.
- **`LICENSE_REQUIRED=false`** is for initial bring-up only. Flip to `true` before exposing publicly.

---

## 9. File map

```
production/cloud-api/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── .gitignore
├── package.json
├── README.md
├── nginx/
│   ├── api.nipsdownloads.com.conf
│   └── updates.nipsdownloads.com.conf
├── sql/
│   └── schema.sql
└── src/
    ├── server.js                 ← entry point
    ├── migrate.js                ← applies sql/schema.sql
    ├── middleware/
    │   └── license.js            ← X-NIPS-License-Key validation
    ├── lib/
    │   ├── db.js                 ← pg pool + helpers
    │   ├── scoring.js            ← compute_meta(), apply_sort_and_filters(), flattenSupplierProduct()
    │   ├── ai.js                 ← OpenAI rewrite helper
    │   ├── aliexpress.js         ← provider switch (mock / rapidapi / apify / aliexpress-open)
    │   └── aliexpress.mock.js    ← 3-product mock catalogue (replace via provider)
    └── routes/
        ├── discovery.js          ← /v1/suppliers/aliexpress/search, /api/discovery/*
        ├── imports.js            ← /api/imports CRUD
        ├── ai.js                 ← /api/ai/{settings,rewrite}
        ├── publish.js            ← /api/publish, /api/publish/logs (stub → WP plugin)
        ├── cloud.js              ← /api/dashboard/stats, /api/license/status, /api/logs, /api/maintenance
        └── releases.js           ← /api/v1/plugin/releases[...] + /v1/plugin/releases[...]
```
