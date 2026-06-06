# NIPS-AI Dropshipping — Developer Handoff

This document maps the **Emergent prototype** (this repo) to the **production system** you will run on your VPS.

The prototype is a **planning / proof-of-concept dashboard only**. It is not the production deliverable. Use it to verify the workflow, screens, data shape and AI behaviour before wiring up real suppliers and WordPress.

---

## 1. Stack mapping (prototype → production)

| Concern | Prototype (Emergent) | Production (your VPS) |
| --- | --- | --- |
| API service | FastAPI (Python) at `:8001`, ingress on `/api/*` | Node.js / Express, behind Nginx, on `api.nipsdownloads.com` (port 4100) |
| Database | MongoDB (collections below) | PostgreSQL (tables: `licenses`, `plugin_releases`, `cloud_logs`, optional shared supplier cache) |
| Deployment | Emergent container, supervisor-managed | Docker / docker-compose, Nginx reverse proxy, systemd or compose stack |
| Plugin distribution | Mock list at `/api/v1/plugin/releases` | Real release server at `updates.nipsdownloads.com`, ZIPs from `/opt/nips-ai-dropshipping-cloud/storage/releases/` |
| Customer storefront | None — dashboard only | PHP WordPress plugin on each customer's WooCommerce site |
| Supplier (AliExpress) | Static catalog in `mock_data.py` | NIPS-AI Cloud-owned AliExpress API integration (keys never leave the VPS) |
| AI rewrite | OpenAI `gpt-5.2` via Emergent Universal Key | Same model directly via your own OpenAI key (or keep Emergent key — your choice) |
| Auth | None — open API for prototype | License-key validation header on every plugin → cloud request |
| WooCommerce publish | Mock — returns fake `wc_product_id` | Real WooCommerce REST or PHP plugin handlers create the product |
| Customer-side storage | `import_drafts` collection in Mongo | WordPress options / custom tables / custom post types on the customer's WP DB |

---

## 2. Data model (prototype Mongo → production Postgres + WP)

### MongoDB collections (prototype)
- `import_drafts` — Import List entries (full supplier payload + studio_edits + ai_history + publish_status)
- `search_history` — every Discovery search (mode, query, sort_by, result_count)
- `ai_settings` — store-owner toggles (one document `id="default"`)
- `publish_logs` — mock publish steps + `wc_product_id`
- `activity_logs` — generic audit feed for all actions
- `status_checks` — legacy starter doc (unused)

### Production storage split

**On the customer WordPress site** (PHP plugin):
- Import List drafts → custom table `nips_import_drafts` (or CPT `nips_draft`)
- Search history / saved searches → `nips_search_history` table
- Studio edits → meta on each draft row
- WooCommerce published product links → meta on the WP product
- AI history → meta on the draft

**On your VPS Postgres** (NIPS-AI Cloud):
- `licenses` — license_key, domain, plan, issued_at, expires_at, features[]
- `plugin_releases` — version, channel, released_at, notes, file_path, size_kb, is_latest
- `cloud_logs` — server-side audit logs
- `supplier_api_credentials` — encrypted AliExpress credentials (NEVER exposed to plugin)
- `supplier_cache` *(optional)* — shared cache of supplier responses keyed by product_id, with TTL

Customer plugin **never** writes to your Postgres directly. All traffic goes through the cloud API with the license key.

---

## 3. API surface

Prototype routes are all prefixed with `/api`. The production Node API should expose the **same shapes** so you only swap the base URL and the storage layer when porting:

```
GET    /api/dashboard/stats
GET    /api/license/status                 ← becomes POST in prod (license_key in body)
POST   /api/discovery/search               body: { mode, query, sort_by, filter_free_shipping, filter_min_reviews }
GET    /api/discovery/history
DELETE /api/discovery/history

GET    /api/imports
POST   /api/imports                        body: { product_id, isolate_variants }
GET    /api/imports/{draft_id}
PATCH  /api/imports/{draft_id}
DELETE /api/imports/{draft_id}
DELETE /api/imports                        (clear unpublished)

GET    /api/ai/settings
PUT    /api/ai/settings
POST   /api/ai/rewrite                     body: { draft_id, field, target_language?, instructions? }

POST   /api/publish                        body: { draft_id, publish_mode }
GET    /api/publish/logs

GET    /api/logs
DELETE /api/logs

GET    /api/v1/plugin/releases
GET    /api/v1/plugin/releases/latest
GET    /api/v1/plugin/releases/download?version=X.X.X&license_key=...   ← prod only

POST   /api/maintenance/clear?target=history|drafts|cache|logs|all
```

In production, every request from the WordPress plugin should include a `X-NIPS-License-Key` header. The cloud API validates it against `licenses` before doing anything else.

---

## 4. Discovery sort/scoring (smart sorting)

The prototype enriches every search result with a `meta` object:

```json
{
  "score": 78.4,
  "profit_pct": 220.2,
  "shipping_days_min": 12,
  "free_shipping": true,
  "orders": 44218,
  "rating": 4.7,
  "feedback_count": 18421,
  "score_breakdown": {
    "profit_margin": 0.73,
    "rating": 0.94,
    "reviews": 0.85,
    "shipping_speed": 0.60,
    "free_shipping": 1.0,
    "images": 1.0,
    "variants": 1.0,
    "content_quality": 0.87,
    "weights": { ... }
  }
}
```

Sort options:
- `best_score` — composite 0–100 (default)
- `profit_top` — estimated $ profit
- `profit_pct_top` — profit % over supplier cost
- `cheapest` — supplier price asc
- `best_rating` — supplier rating
- `most_orders` — synthetic orders count
- `fastest_shipping` — min shipping days
- `free_shipping` — filter (free only) + score sort
- `min_reviews_100` — filter (≥100 reviews) + score sort

Filters: `filter_free_shipping`, `filter_min_reviews`.

> The score is **a prototype heuristic, not a revenue prediction**. When porting to production, replace the synthetic `orders` (derived from `feedback_count * 2.4`) with the real AliExpress orders field, and re-tune weights against your own conversion data.

The scoring helper lives in `/app/backend/server.py` → `compute_meta()`. Port it line-for-line to Node when you build the production cloud — it's pure arithmetic, no FastAPI coupling.

---

## 5. AI rewrite

- Provider: OpenAI `gpt-5.2` via `emergentintegrations` (Universal Key).
- Endpoint: `POST /api/ai/rewrite` with `{draft_id, field}`.
- Supported fields: `title`, `description`, `seo_title`, `seo_meta_description`, `tags`, `category`, `attributes`, `specs`, `translate`.
- AI is **opt-in**. Toggles live in `AISettings` (`/api/ai/settings`). The Product Studio buttons only fire AI when clicked.
- AI history is stored on the draft (`ai_history[]`) for audit; the UI shows a before/after dialog with Apply/Discard. There is no automatic mutation of the draft — the store owner is always in control.

**Production note**: rate-limit `/api/ai/rewrite` per license key (e.g. 60/min, 2000/day). The prototype has no rate limit because it's not internet-exposed beyond the demo.

---

## 6. Publish workflow

Prototype: `POST /api/publish` synthesises a fake `wc_product_id`, marks the draft as `published`, never touches a real WordPress store. Steps are stored in `publish_logs`.

Production flow:
1. Plugin reads the draft locally on the WordPress site.
2. Plugin builds the WooCommerce product payload from `studio_edits` (NOT from raw supplier JSON).
3. Plugin calls the WooCommerce REST/PHP API to create a draft product.
4. Plugin downloads images, converts to WebP 800×800, attaches as featured + gallery, stores source URL in attachment meta.
5. Plugin saves supplier metadata as private product meta (`_nips_supplier_url`, `_nips_supplier_product_id`, etc.).
6. Plugin POSTs the publish result back to the cloud `/api/publish` for analytics + audit.
7. Import List draft is preserved until the cloud confirms `wc_product_id`.

The clean separation between `studio_edits` and the raw supplier payload is intentional. Raw supplier JSON must never end up in a product description — only the rewritten/cleaned content does.

---

## 7. Variant isolation

`POST /api/imports` with `isolate_variants: true` creates one draft **per variant** instead of one draft with embedded variants. Each variant draft carries:

- `is_variant_draft: true`
- `parent_product_id` (links back to the supplier parent)
- `variant_id`, isolated SKU, variant title/image/price
- Empty `variants[]` (it's a single product)

In production this maps to creating **N simple WooCommerce products**. The `publish_mode: "variable"` path (not yet implemented in the prototype publisher beyond the mock log) should instead create one variable WooCommerce product with variations.

---

## 8. Release server

Prototype list lives in `PLUGIN_RELEASES` constant in `server.py`. The download URLs point at `updates.nipsdownloads.com` but are not served by the prototype.

Production:
- Build artefacts at `/opt/nips-ai-dropshipping-cloud/storage/plugin-builds/vX.X.X/nips-ai-dropshipping/`
- ZIPs at `/opt/nips-ai-dropshipping-cloud/storage/releases/nips-ai-dropshipping-vX.X.X.zip`
- Postgres table `plugin_releases` with version, channel, released_at, file_path, size, is_latest
- `GET /v1/plugin/releases/latest` reads `plugin_releases` where `is_latest=true AND channel=$plan`
- `GET /v1/plugin/releases/download?version=X.X.X&license_key=...` validates the license, then streams the ZIP with `Content-Disposition: attachment`
- WordPress plugin integrates with the WP update transient (`pre_set_site_transient_update_plugins`) to surface the update inside `Plugins → Update`.

The prototype only stubs `/api/v1/plugin/releases` and `/api/v1/plugin/releases/latest` for UI testing.

---

## 9. Things deliberately NOT built in the prototype

These map cleanly to your production system; build them there, not here.

- The PHP WordPress plugin (admin pages, AJAX/REST handlers, WooCommerce hooks)
- Real AliExpress capture (use the cloud-side supplier proxy in Node)
- Image WebP pipeline (do it in PHP using `wp_handle_sideload` + `imagewebp`/Imagick)
- Real WooCommerce publish (use WC REST API or `wp_insert_post` + WC meta)
- License brute-force / abuse protection (do it in Express + Postgres)
- Multi-tenant auth (each customer site is identified by its license key; no user accounts needed)
- WebSocket / SSE streaming of AI output (Express + EventSource is the natural fit)
- WordPress plugin auto-update transient wiring

---

## 10. Local dev quick-start

```
# Backend (already running under supervisor)
sudo supervisorctl restart backend
tail -f /var/log/supervisor/backend.err.log

# Frontend (hot reload)
sudo supervisorctl restart frontend
tail -f /var/log/supervisor/frontend.err.log

# Sanity check
curl $REACT_APP_BACKEND_URL/api/dashboard/stats | jq .
```

Test the exact-URL capture flow:
```
curl -X POST $REACT_APP_BACKEND_URL/api/discovery/search \
  -H 'Content-Type: application/json' \
  -d '{"mode":"auto","query":"https://www.aliexpress.com/item/1005007250240074.html","sort_by":"best_score"}' | jq '.results[0].title, .results[0].meta'
```

---

## 11. File map

```
/app/backend/
├── server.py        ← All FastAPI routes, scoring, AI, publish
├── mock_data.py     ← 6 mock supplier products (replace with real proxy in prod)
└── .env             ← MONGO_URL, DB_NAME, CORS_ORIGINS, EMERGENT_LLM_KEY

/app/frontend/src/
├── App.js
├── index.{js,css}
├── layout/DashboardLayout.jsx   ← Sidebar + outlet
├── components/PageHeader.jsx
├── lib/{api.js, format.js}
└── pages/
    ├── Dashboard.jsx
    ├── Discovery.jsx            ← Search + smart sort + filters
    ├── ImportList.jsx
    ├── ProductStudio.jsx        ← Tabs + AI dialog + publish dialog
    ├── AISettings.jsx
    ├── Logs.jsx
    ├── CloudSettings.jsx
    └── Releases.jsx

/app/memory/
├── PRD.md
└── test_credentials.md

/app/HANDOFF.md                   ← (this file)
```

---

## 12. Final notes

- Keep the scoring weights configurable in production — store them in Postgres so you can tune without redeploying.
- When you wire the real AliExpress proxy, preserve the prototype payload schema exactly (see one full sample in any `import_drafts` document). The UI is built around that shape.
- The prototype intentionally has zero auth; do NOT expose this URL publicly without an Nginx basic-auth shim or a quick license-key middleware.
