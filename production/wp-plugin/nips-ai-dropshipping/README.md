# NIPS-AI Dropshipping · WordPress Plugin (v2.9.8)

Drop-in WordPress plugin for `alloutspares.com` (and any other licensed customer
storefront). Consumes the canonical NIPS-AI Cloud contract at
`https://api.nipsdownloads.com/v1/suppliers/aliexpress/search` and writes
Import List drafts to a local custom table on the WordPress site.

The full canonical product object flows end-to-end:
**Discovery cards → Import List → Product Studio** all read from the exact same
shape returned by the cloud — no field-name drift, no re-mapping.

---

## 1. Install

```bash
# On your workstation
cd production/wp-plugin
zip -r nips-ai-dropshipping.zip nips-ai-dropshipping
```

On the customer WordPress site:
1. **Plugins → Add New → Upload Plugin** → choose `nips-ai-dropshipping.zip` → Install.
2. **Activate** — this creates the table `{prefix}_nips_import_drafts`.
3. Open **NIPS-AI → Settings**, confirm:
   - License key (defaults to `NIPS-ADMIN-LICENSE-0001`)
   - Cloud API URL (defaults to `https://api.nipsdownloads.com`)
   - Updates URL (defaults to `https://updates.nipsdownloads.com`)
4. Open **NIPS-AI → Product Discovery** and run a search.

---

## 2. What the Discovery UI displays (canonical fields)

Every field returned by `POST /v1/suppliers/aliexpress/search` is mapped:

| Section | Fields shown on the card |
| --- | --- |
| Header | `main_image`, `gallery_images.length` (badge), `variants.length` (badge), `meta.score` (heuristic 0–100) |
| Title row | `title` |
| Price block | `price`, `retail_price`, `profit_estimate`, `profit_pct`, `currency`, `product_id` |
| Key-value grid | `sku`, `category`, `supplier.name`, `rating`, `supplier.feedback_count`, `orders`, `stock`, `shipping_method`, `free_shipping`/`shipping_price`, `shipping_from → shipping_to`, `estimated_delivery`, `specifications.length`, `attributes.length`, `description_images.length` |
| Tags | first 6 of `tags[]` |
| Footer | `product_url`/`supplier_url` link, **Raw payload** toggle (full canonical JSON per card), **Isolate variants** toggle (when `variants.length > 0`), **Import to List** primary action |
| Debug panel (toggle) | full request + full response, Copy-to-clipboard for both |

Above the result grid there is a meta bar showing **exact query echoed by the cloud** (so you can verify your verbatim query made it through byte-for-byte), the search `mode`, `sort` and `count`.

---

## 3. Import List + Product Studio (same product object)

- **Import List** (`Admin → NIPS-AI → Import List`) lists every draft using the
  same canonical object stored in the `payload` column. Each card shows
  `main_image`, `title`, `sku`, `product_id`, `price`/`retail_price`/`profit`,
  shipping summary, supplier name, and a "Raw" toggle showing the full draft
  payload.
- **Product Studio** (`Admin → NIPS-AI → Product Studio`) loads exactly **one**
  draft by uuid (link from Import List), inflates the canonical object,
  overlays any `studio_edits`, and exposes:
  - Summary panel with all read-only fields (product_id, sku, supplier_url,
    supplier name + rating, orders, stock, shipping method/price/route/ETA)
  - Live price + profit preview
  - Editable: title, retail_price, category, tags, seo_title,
    seo_meta_description, description
  - Gallery + description images
  - Variants block (with variant images, sku, price, stock)
  - Specifications table + attributes chips
  - Raw payload toggle for the whole draft

Saving sends only the edited fields to `wp_ajax_nips_patch_draft`, which stores
them as JSON in the `studio_edits` column — the original cloud payload remains
intact in `payload`. Undoing an AI rewrite is therefore lossless.

---

## 4. Verbatim query — implementation notes

The text input value is read **without** `trim()` or `sanitize_text_field()`.
The PHP AJAX handler uses `wp_unslash()` only (to undo WordPress's magic
slashes). The cloud client passes the bytes straight into the JSON body via
`wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`.

The response's `query` field is shown back to the operator in the meta bar
as **"Query echoed by cloud"** so they can verify byte-equality at a glance.

If you ever need to compare locally, the raw card-level payload (each result's
own JSON, not the wrapper) is available via the per-card **Raw** toggle.

---

## 5. AJAX endpoints (admin-ajax.php)

All require `manage_woocommerce` capability and the nonce `nips_ai_ds_nonce`.

| Action | Method | Body | Purpose |
| --- | --- | --- | --- |
| `nips_supplier_search` | POST | query, shipping_from, shipping_to, sort, limit | Calls the cloud, normalises each result, returns `{request, exact_query_received, mode, sort, count, results[], raw_response}` |
| `nips_import_draft` | POST | product_id, isolate_variants, product (JSON) | Writes 1 or N drafts |
| `nips_list_drafts` | POST | — | Lists drafts (inflated canonical objects) |
| `nips_get_draft` | GET  | draft_uuid | One inflated draft |
| `nips_patch_draft` | POST | draft_uuid, edits (JSON) | Updates `studio_edits` |
| `nips_delete_draft` | POST | draft_uuid | Removes draft (WC product NOT touched) |
| `nips_clear_drafts` | POST | — | Removes all unpublished drafts |

---

## 6. File map

```
nips-ai-dropshipping/
├── nips-ai-dropshipping.php           ← Main plugin file
├── uninstall.php
├── includes/
│   ├── class-nips-plugin.php           ← Bootstrap + activation (creates table)
│   ├── class-nips-product-mapper.php   ← Canonical product object (single source of truth)
│   ├── class-nips-cloud-client.php     ← wp_remote_post → /v1/suppliers/aliexpress/search
│   ├── class-nips-drafts-store.php     ← Custom table CRUD
│   └── class-nips-admin.php            ← Menu, pages, AJAX handlers, asset enqueue
├── admin/
│   ├── views/
│   │   ├── dashboard.php
│   │   ├── discovery.php               ← Discovery UI markup
│   │   ├── import-list.php
│   │   ├── product-studio.php
│   │   └── settings.php
│   └── assets/
│       ├── css/admin.css               ← All admin styles
│       └── js/
│           ├── discovery.js            ← Discovery search + render + import
│           ├── import-list.js
│           └── product-studio.js
└── languages/                          ← (translations placeholder)
```

---

## 7. Drop-in update strategy (existing plugin)

If you already have a NIPS-AI plugin folder on the customer site, the files
that matter for **this Discovery UI update** are:

1. `includes/class-nips-product-mapper.php` — canonical fields + normaliser
2. `includes/class-nips-cloud-client.php` — verbatim-query supplier search
3. `includes/class-nips-admin.php` — adds `ajax_supplier_search` handler
4. `admin/views/discovery.php` — markup for the new Discovery page
5. `admin/assets/js/discovery.js` — Discovery behaviour
6. `admin/assets/css/admin.css` — styles

Copy those six files over (keeping your existing folder name / main plugin
file). Make sure your main plugin file `require_once`'s the three include
classes and calls `NIPS_Admin::init()` on `plugins_loaded`. The Import List
and Product Studio files in this package are bonus — they consume the same
canonical product object so the contract stays consistent end-to-end.

---

## 8. CORS / network requirements

The plugin uses **server-to-server** calls (`wp_remote_post`) from the
WordPress backend to the cloud, so the customer's browser never hits the cloud
directly and **CORS is not involved** at the plugin layer.

CORS still matters at `https://dropshipping.nips.live` (the React dashboard),
which is handled by the cloud Nginx config in `production/cloud-api/nginx/`.

---

## 9. Versioning + updater

`Update URI: https://updates.nipsdownloads.com` is declared in the main plugin
header. A future v2.9.9 of this plugin should ship the matching WP-update
transient hook (`pre_set_site_transient_update_plugins`) so the "Plugins →
Update" screen surfaces new releases from your release server.

Until then, you can manually upload the new ZIP from
`https://updates.nipsdownloads.com/v1/plugin/releases/download?version=X.X.X&license_key=NIPS-ADMIN-LICENSE-0001`.
