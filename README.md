# NIPS-AI Dropshipping — Prototype Package

**Status: Frozen prototype. No further features will be added.**
**Build:** v2.9.6-prototype (Discovery → Import List → Product Studio → Mock Publish + Smart Sort + Developer Handoff)

This is the Emergent prototype of the **NIPS-AI Dropshipping Cloud Dashboard**. It is a planning / proof-of-concept build only. The real product is a PHP WordPress plugin + Node.js cloud API + PostgreSQL on your VPS. See `HANDOFF.md` for the full prototype-to-production mapping.

---

## 1. Stack

| Layer | Prototype (this repo) | Production target |
| --- | --- | --- |
| API | FastAPI (Python 3.11) on `:8001` | Node.js / Express on `api.nipsau.com` (port 4100) |
| Database | MongoDB (motor async driver) | PostgreSQL |
| Frontend | React 19 + Tailwind 3 + shadcn/ui + craco | (same React dashboard is reusable in production — just swap the API base URL) |
| Process mgr | supervisor (Emergent container) | Docker / systemd |
| Ingress | Emergent Kubernetes ingress (`/api/*` → `:8001`) | Nginx reverse proxy |
| AI provider | OpenAI `gpt-5.2` via Emergent Universal Key | Your own OpenAI key (or keep Emergent key) |

---

## 2. Local setup (after cloning from GitHub)

> The `.env` files are **not** included in the GitHub export. Recreate them as shown.

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# create backend/.env
cat > .env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="nips_prototype"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=sk-emergent-...          # your Emergent Universal Key
EOF

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install                              # NEVER use npm — yarn only

# create frontend/.env
cat > .env <<'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=0
EOF

yarn start                                # opens http://localhost:3000
```

### MongoDB

Any local instance is fine:

```bash
docker run -d --name nips-mongo -p 27017:27017 mongo:7
```

---

## 3. Project layout

```
/app/
├── HANDOFF.md                          ← Developer handoff (prototype → production mapping)
├── README.md                           ← This file
├── memory/
│   ├── PRD.md                          ← Product requirements snapshot
│   └── test_credentials.md             ← Mock license info (no auth in prototype)
│
├── backend/
│   ├── server.py                       ← All FastAPI routes, scoring, AI, publish
│   ├── mock_data.py                    ← 6 mock supplier products (replace with real proxy)
│   ├── requirements.txt
│   ├── tests/
│   │   └── backend_test.py             ← 32 pytest tests (last run: 32/32 pass)
│   └── .env                            ← (excluded from GitHub — recreate)
│
└── frontend/
    ├── package.json
    ├── craco.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    └── src/
        ├── App.js                      ← Routes
        ├── index.js                    ← React entry + QueryClient + Sonner
        ├── index.css                   ← Fontshare imports, design tokens
        ├── App.css
        ├── lib/
        │   ├── api.js                  ← Axios endpoints
        │   └── format.js
        ├── components/
        │   ├── PageHeader.jsx
        │   └── ui/                     ← shadcn/ui primitives
        ├── layout/
        │   └── DashboardLayout.jsx     ← Fixed left sidebar
        ├── constants/testIds/          ← data-testid registry (legacy starter)
        ├── hooks/use-toast.js
        └── pages/
            ├── Dashboard.jsx
            ├── Discovery.jsx
            ├── ImportList.jsx
            ├── ProductStudio.jsx
            ├── AISettings.jsx
            ├── Logs.jsx
            ├── CloudSettings.jsx
            └── Releases.jsx
```

---

## 4. Frontend pages

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `pages/Dashboard.jsx` | KPI cards (cloud, license, drafts, published), recent activity, quick-start checklist |
| `/discovery` | `pages/Discovery.jsx` | Unified search (6 modes), exact AliExpress URL capture, **smart sort (9 modes)**, free-shipping + 100+ reviews filters, score badges, score-breakdown popover, import-to-list button |
| `/imports` | `pages/ImportList.jsx` | Draft cards (title, SKU, ID, images, variants, price, profit, shipping, supplier), Open in Studio / Preview Payload / Delete |
| `/studio/:draftId` | `pages/ProductStudio.jsx` | Loads ONE draft only. 8 tabs: Overview, Images, Variants, Shipping, Specs & Attributes, Description, SEO preview, Raw Payload. AI rewrite per field with before/after dialog. Mock-publish dialog (draft / simple / variable / isolated_variants) |
| `/ai` | `pages/AISettings.jsx` | Per-feature toggles, default model, default language |
| `/logs` | `pages/Logs.jsx` | Activity log table (search, import, AI, publish, maintenance) |
| `/cloud` | `pages/CloudSettings.jsx` | Cloud connection info, license card, maintenance buttons, production architecture map + HANDOFF.md pointer |
| `/releases` | `pages/Releases.jsx` | Mock release server: v2.9.4 / v2.9.5 / v2.9.6, download buttons |

---

## 5. Frontend components

| File | Component | Notes |
| --- | --- | --- |
| `layout/DashboardLayout.jsx` | `DashboardLayout`, `Sidebar` | Fixed left sidebar with 7 nav items + cloud-status footer |
| `components/PageHeader.jsx` | `PageHeader` | Title + description + actions slot used on every page |
| `pages/Discovery.jsx` | `ProductCard`, `ScoreRing` | Discovery product card + score badge |
| `pages/ImportList.jsx` | `DraftCard` | Import List card |
| `pages/ProductStudio.jsx` | `AIButton`, `Info` | AI rewrite trigger + readonly info pill |
| `pages/CloudSettings.jsx` | `Row`, `MaintBtn` | Cloud settings row + maintenance button |
| `components/ui/*` | shadcn/ui primitives | Button, Card, Input, Label, Select, Switch, Dialog, Tabs, Toast (sonner), Popover, Badge, Checkbox, Textarea, etc. |

---

## 6. Backend routes (all under `/api` prefix)

| Method | Path | Body / Query | Purpose |
| --- | --- | --- | --- |
| GET | `/api/` | — | Service ping |
| GET | `/api/dashboard/stats` | — | License + cloud + counters + recent activity |
| GET | `/api/license/status` | — | License card data |
| POST | `/api/discovery/search` | `{mode, query, sort_by, filter_free_shipping, filter_min_reviews}` | Discovery search. Modes: `auto`, `name`, `url`, `sku`, `category`, `supplier`. Sorts: `best_score`, `profit_top`, `profit_pct_top`, `cheapest`, `best_rating`, `most_orders`, `fastest_shipping`, `free_shipping`, `min_reviews_100` |
| GET | `/api/discovery/history` | `?limit=25` | Recent searches |
| DELETE | `/api/discovery/history` | — | Clear search history |
| GET | `/api/imports` | — | List all drafts |
| POST | `/api/imports` | `{product_id, isolate_variants}` | Import to draft list (with optional variant isolation) |
| GET | `/api/imports/{draft_id}` | — | One draft |
| PATCH | `/api/imports/{draft_id}` | `{title?, description?, retail_price?, category?, tags?, seo_title?, seo_meta_description?, notes?}` | Save Studio edits |
| DELETE | `/api/imports/{draft_id}` | — | Delete draft (published WC products preserved) |
| DELETE | `/api/imports` | — | Clear unpublished drafts |
| GET | `/api/ai/settings` | — | AI toggles |
| PUT | `/api/ai/settings` | `{...AISettings}` | Save AI toggles |
| POST | `/api/ai/rewrite` | `{draft_id, field, target_language?, instructions?}` | Call OpenAI gpt-5.2. Fields: `title`, `description`, `seo_title`, `seo_meta_description`, `tags`, `category`, `attributes`, `specs`, `translate` |
| POST | `/api/publish` | `{draft_id, publish_mode}` | **Mock** WooCommerce publish — returns fake `wc_product_id` |
| GET | `/api/publish/logs` | `?limit=50` | Publish history |
| GET | `/api/logs` | `?limit=100` | Activity logs |
| DELETE | `/api/logs` | — | Clear logs |
| GET | `/api/v1/plugin/releases` | — | **Mock** release list |
| GET | `/api/v1/plugin/releases/latest` | — | **Mock** latest release |
| POST | `/api/maintenance/clear` | `?target=history\|drafts\|cache\|logs\|all` | Maintenance |

Full payload shapes: hit any endpoint and inspect, or see `/app/backend/server.py`.

---

## 7. MongoDB collections (prototype storage)

| Collection | Document shape (key fields) | Purpose |
| --- | --- | --- |
| `import_drafts` | `id, draft_id, is_variant_draft, parent_product_id, variant_id, product_id, sku, supplier_url, title, price, retail_price, profit_estimate, currency, category, tags[], main_image, gallery_images[], description_images[], description, specifications[], attributes[], variants[], shipping{}, stock, supplier{}, studio_edits{}, ai_history[], publish_status, wc_product_id, wc_publish_mode, created_at, updated_at` | Import List drafts (full supplier payload + Studio edits + AI history) |
| `search_history` | `id, mode, query, sort_by, result_count, created_at` | Discovery searches |
| `ai_settings` | `id="default", title_rewrite, description_cleanup, seo_title, seo_meta_description, tags_suggest, category_suggest, attributes_cleanup, specs_cleanup, translate_enabled, default_language, default_model` | Per-store AI toggles (singleton in prototype) |
| `publish_logs` | `id, draft_id, publish_mode, wc_product_id, wc_status, title, status, created_at, steps[]` | Mock publish log |
| `activity_logs` | `id, kind, message, meta{}, created_at` | Audit feed shown on Dashboard + Logs |
| `status_checks` | `id, client_name, timestamp` | Legacy starter doc (unused) |

> **Production note**: `import_drafts` and `search_history` belong on the **customer WordPress site** (PHP plugin local tables), NOT on your VPS. `ai_settings`, `publish_logs`, `activity_logs` are also WP-local. The VPS Postgres only owns `licenses`, `plugin_releases`, `cloud_logs`, optional shared supplier cache. See `HANDOFF.md` §2.

---

## 8. Mocked parts (must be replaced for production)

| Mock | Where | Replace with |
| --- | --- | --- |
| **AliExpress product capture** | `/app/backend/mock_data.py` (6 hand-crafted products) and `find_by_id` / `find_by_url` / `search_keyword` / `search_category` / `search_supplier` | Real NIPS-AI Cloud AliExpress API integration on your VPS. Keep the same payload schema so the React dashboard works unchanged. |
| **WooCommerce publish** | `POST /api/publish` in `server.py` — returns a synthetic `wc_product_id` (timestamp-derived) and a fake step log | Real WooCommerce REST API or PHP `wp_insert_post` + WC meta on the customer's WordPress site, triggered by the PHP plugin. |
| **Plugin release server** | `PLUGIN_RELEASES` constant in `server.py` + `GET /api/v1/plugin/releases[/latest]` | Real release server at `updates.nipsau.com`. ZIPs from `/opt/nips-ai-dropshipping-cloud/storage/releases/`, served by Nginx after license-key validation. WP plugin hooks into the WordPress update transient. |
| **"orders" count** | `compute_meta()` in `server.py` — `orders = feedback_count * 2.4` | Real `orders_count` field from the AliExpress API. |
| **License validation** | `GET /api/license/status` — always returns the same hardcoded license | Real Postgres `licenses` table + `X-NIPS-License-Key` header on every plugin → cloud request. |
| **Image gallery URLs** | Unsplash photos in `mock_data.py` | Real supplier image URLs returned by the AliExpress API. |

---

## 9. Production integration points (next phase, **not** in this repo)

| Component | Brief |
| --- | --- |
| **Real NIPS-AI Cloud AliExpress proxy** | Node/Express service that wraps the AliExpress Open Platform / RapidAPI / Apify provider. Owns the supplier API credentials. Exposes the same `/api/discovery/search` and exact-URL capture shape as the prototype. |
| **WordPress / WooCommerce PHP plugin** | Plugin pages: Dashboard, Supplier Modules, AliExpress Connection, Product Discovery, Import List, Product Studio, Automation Modes, Logs, Settings. Talks to the cloud over HTTPS with a `X-NIPS-License-Key` header. Stores Import List drafts, search history, studio edits **locally** on the customer site. |
| **WooCommerce publish workflow** | PHP plugin builds the WC product payload from `studio_edits` (never from raw supplier JSON), creates a draft product via `wp_insert_post` + WC meta, attaches images, then POSTs the result back to `/api/publish` for analytics. |
| **WebP image pipeline** | PHP side. Download remote supplier images → convert to WebP 800×800 (Imagick/`imagewebp`) → compress → `wp_handle_sideload` into the Media Library → store source URL in attachment meta (`_nips_source_url`) for dedupe → set featured + gallery + variant images. |
| **Real plugin update server** | Postgres `plugin_releases` table + Nginx serving ZIPs from `/opt/nips-ai-dropshipping-cloud/storage/releases/`. WP plugin filters `pre_set_site_transient_update_plugins` to surface updates inside `Plugins → Update`. Force-check button calls `/v1/plugin/releases/latest`. |
| **AI rate-limiting / abuse protection** | Express middleware per license key (e.g. 60/min, 2000/day) for `/api/ai/rewrite`. |
| **License validation middleware** | Express middleware validates `X-NIPS-License-Key` on every protected route against Postgres `licenses` table. |

See `HANDOFF.md` for the complete mapping including API surface, data model split, and release server file layout.

---

## 10. Test suite

- Backend: `backend/tests/backend_test.py` — 32 tests (last run: **32/32 passing**), covers all routes incl. real OpenAI gpt-5.2 calls and the 9-mode sort/filter logic
- Frontend: validated end-to-end by the testing agent — all `data-testid` selectors documented in `HANDOFF.md` §3 + each page's source

To run backend tests locally:

```bash
cd backend
source .venv/bin/activate
pytest tests/backend_test.py -v
```

---

## 11. How to download / export this code

> **Authoritative Emergent workflow** (from Emergent support):

1. **Primary method — "Save to GitHub"**
   Open this project in the Emergent chat interface. There is a **Save to GitHub** button. It pushes the complete codebase (frontend, backend, `memory/`, `HANDOFF.md`, `README.md`, all source files) to a GitHub repository of your choice.

2. **Secondary method — VS Code view**
   Use the VS Code view inside Emergent for direct file browsing / manual copy.

3. **What gets exported**
   - All frontend and backend code
   - `memory/` folder (PRD + test credentials)
   - `HANDOFF.md` + `README.md`
   - Config files (`package.json`, `requirements.txt`, `craco.config.js`, `tailwind.config.js`, etc.)

4. **What is excluded** (standard practice / security)
   - `backend/.env` and `frontend/.env` — recreate locally using the templates in §2 above
   - `node_modules/` — run `yarn install` after cloning
   - Python `.venv/` — run `pip install -r requirements.txt` after cloning

5. **There is no direct "Download ZIP" feature** — use Save to GitHub, then `git clone` to your machine / VPS.

6. **After cloning**, follow §2 of this README to recreate `.env` files and start the local stack.

---

## 12. Screenshots / design

Design guidelines used during the build are in `/app/design_guidelines.json`:

- Theme: light, enterprise B2B (WordPress-admin-compatible)
- Typography: **Cabinet Grotesk** (headings) + **Satoshi** (body) via Fontshare CDN
- Color tokens: white cards on `slate-50` background, blue-600 primary CTAs, emerald success, amber warning, indigo AI accents
- Layout: fixed left sidebar (`w-64`), `max-w-7xl` content container, `rounded-xl` cards with `border-slate-200 shadow-sm`
- Strict `data-testid` attributes on every interactive element

A screenshot reference set was captured during testing:
- Dashboard with KPIs + recent activity
- Discovery with exact AliExpress URL capture (1 result card)
- Discovery with keyword search + smart-sort dropdown + score badges (e.g. score 82, 77, 75, 70)

(Screenshots live in the Emergent run's automation_output folder; re-capture any time via the in-app preview URL.)

---

## 13. Final checklist

- [x] Discovery → Import List → Product Studio → Mock Publish flow working
- [x] Exact AliExpress URL capture (no keyword leakage)
- [x] Variant isolation as separate drafts
- [x] AI rewrite via OpenAI gpt-5.2 (real LLM, Emergent Universal Key)
- [x] Smart sort (9 modes) + filters + score breakdown
- [x] Mock plugin release server
- [x] Maintenance / clear endpoints (published WC products preserved)
- [x] Activity logs
- [x] License / Cloud settings page with handoff pointer
- [x] 32/32 backend tests passing, 100% frontend testing-agent pass
- [x] Developer handoff doc (`HANDOFF.md`)
- [x] This README

**No further development.** Use the Save to GitHub button to export, then proceed with your production build (Node/Express + Postgres + WordPress PHP plugin on your VPS).
