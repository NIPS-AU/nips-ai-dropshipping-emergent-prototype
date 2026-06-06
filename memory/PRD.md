# NIPS-AI Dropshipping — PRD (Prototype)

## Original problem statement
Build a production-ready SaaS-style WooCommerce dropshipping plugin and cloud dashboard called NIPS-AI Dropshipping. Customer installs a PHP WordPress plugin that talks to a managed cloud API (api.nipsau.com). Cloud owns supplier API connections, licensing, AI rewrite, release/update server. Workflow: Discovery → Import List (drafts) → Product Studio (editor + AI) → Publish to WooCommerce (draft/simple/variable/isolated variants).

Production stack: WordPress (PHP) plugin + Node/Express + PostgreSQL on VPS + Nginx + Docker, release/update server at updates.nipsau.com.

Emergent prototype stack: React + FastAPI + MongoDB cloud dashboard that **simulates** the workflow (no PHP plugin deployed here).

## User personas
- **Store owner** — runs a WooCommerce store. Wants to find supplier products, AI-clean them and publish to their store as drafts.
- **NIPS-AI admin** — manages the cloud, licenses, plugin releases.

## Core requirements (static)
1. Cloud dashboard simulating NIPS-AI Cloud API.
2. Unified Product Discovery (auto-detect, name, URL, SKU, category, supplier URL).
3. Exact AliExpress URL capture returning one product, not keyword results.
4. Import List drafts (separate from Product Studio).
5. Product Studio editor with tabs (Overview, Images, Variants, Shipping, Specs/Attributes, Description, SEO, Raw Payload).
6. AI rewrite controls per field with before/after dialog.
7. AI Settings toggles (store owner stays in control).
8. Mock WooCommerce publish (draft / simple / variable / isolated variants).
9. Variant isolation as separate draft products.
10. Activity logs, plugin release list, license / cloud / maintenance page.

## What's been implemented — 2026-02-12 (v2.9.6 prototype)
- **Backend (FastAPI + MongoDB)** — `/app/backend/server.py`
  - Dashboard stats, license status
  - Discovery search (auto-detect + 5 modes) with exact AliExpress URL capture
  - Search history (persisted, clearable)
  - Import drafts CRUD with variant isolation
  - AI settings + AI rewrite via Emergent Universal Key (OpenAI gpt-5.2)
  - Mock publish endpoint with publish log
  - Activity logs + maintenance/clear endpoints
  - Mock plugin release server (`/v1/plugin/releases/latest`, list)
- **Mock catalog** — `/app/backend/mock_data.py` with 6 supplier products (full schema: variants, attributes, specs, shipping, gallery)
- **Frontend (React + Tailwind + shadcn)**:
  - Dashboard layout with fixed left sidebar
  - Pages: Dashboard, Discovery, ImportList, ProductStudio, AISettings, Logs, CloudSettings, Releases
  - Cabinet Grotesk + Satoshi fonts via Fontshare
  - Blue primary CTAs, white cards on slate-50 background
  - Toast notifications via sonner
  - AI before/after dialog, mock publish dialog with WC product id

## Prioritized backlog
- **P1** — Real AliExpress capture (replace mock with NIPS-AI Cloud supplier proxy)
- **P1** — Image import pipeline (WebP 800x800, dedupe on attachment meta)
- **P1** — WordPress PHP plugin source (delivered as downloadable code, not deployed)
- **P2** — AI streaming (SSE) for description rewrite
- **P2** — Variant publish as one variable WooCommerce product
- **P2** — Supplier card/list module
- **P2** — Translate UI (target language selector)
- **P3** — Saved searches, cheap/high margin sort options
- **P3** — Auth (currently single-tenant prototype, no login)

## Architecture map (production)
- WordPress plugin (PHP) on customer site: Import List drafts, search history, studio edits, WooCommerce product links stored locally
- NIPS-AI Cloud API on VPS (Node/Express + PostgreSQL): license validation, supplier API proxy, AI rewrite, release server
- Release server (updates.nipsau.com): plugin ZIPs from /opt/nips-ai-dropshipping-cloud/storage/releases
- Customer data stays on the customer's site unless cloud sync explicitly enabled

## Next action items
- Wire real AliExpress capture provider when ready
- Build PHP plugin source bundle (separate deliverable, not deployable in Emergent)
- Image WebP pipeline + media library dedupe (v2.9.8)
- Variable product publish (v2.9.9)
