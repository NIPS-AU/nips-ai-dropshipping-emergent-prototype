import { Router } from "express";
import { q } from "../lib/db.js";
import { logActivity } from "./discovery.js";
import { searchAliExpress } from "../lib/aliexpress.js";

export const router = Router();

function nowIso() { return new Date().toISOString(); }

function buildDraftFromProduct(product, isolatedVariant) {
  const base = {
    is_variant_draft: false,
    parent_product_id: null,
    variant_id: null,
    product_id: product.product_id,
    sku: product.sku,
    supplier_url: product.supplier_url,
    product_url: product.product_url || product.supplier_url,
    title: product.title,
    price: product.price,
    retail_price: product.retail_price,
    profit_estimate: product.profit_estimate,
    currency: product.currency,
    category: product.category,
    tags: product.tags || [],
    main_image: product.main_image,
    gallery_images: product.gallery_images || [],
    description_images: product.description_images || [],
    description: product.description,
    specifications: product.specifications || [],
    attributes: product.attributes || [],
    variants: product.variants || [],
    shipping: product.shipping || {},
    stock: product.stock || 0,
    supplier: product.supplier || {},
  };
  if (isolatedVariant) {
    base.is_variant_draft = true;
    base.parent_product_id = product.product_id;
    base.variant_id = isolatedVariant.variant_id;
    base.title = `${product.title} — ${isolatedVariant.title}`;
    base.sku = isolatedVariant.sku;
    base.price = isolatedVariant.price;
    base.retail_price = isolatedVariant.retail_price ?? product.retail_price;
    base.profit_estimate = Number((base.retail_price - base.price).toFixed(2));
    base.main_image = isolatedVariant.image || product.main_image;
    base.variants = [];
  }
  return base;
}

async function insertDraft(license_key, d) {
  const { rows } = await q(
    `INSERT INTO import_drafts(
       license_key, is_variant_draft, parent_product_id, variant_id, product_id, sku,
       supplier_url, product_url, title, price, retail_price, profit_estimate, currency,
       category, tags, main_image, gallery_images, description_images, description,
       specifications, attributes, variants, shipping, stock, supplier
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
     RETURNING draft_id`,
    [
      license_key, d.is_variant_draft, d.parent_product_id, d.variant_id, d.product_id, d.sku,
      d.supplier_url, d.product_url, d.title, d.price, d.retail_price, d.profit_estimate, d.currency,
      d.category, JSON.stringify(d.tags), d.main_image,
      JSON.stringify(d.gallery_images), JSON.stringify(d.description_images), d.description,
      JSON.stringify(d.specifications), JSON.stringify(d.attributes), JSON.stringify(d.variants),
      JSON.stringify(d.shipping), d.stock, JSON.stringify(d.supplier),
    ]
  );
  return rows[0].draft_id;
}

// ── POST /api/imports ──────────────────────────────────────────────────────
router.post("/api/imports", async (req, res) => {
  const { product_id, isolate_variants = false } = req.body || {};
  if (!product_id) return res.status(400).json({ error: "product_id_required" });

  const { results } = await searchAliExpress({ query: product_id, mode: "sku", limit: 1 });
  const product = results[0];
  if (!product) return res.status(404).json({ error: "product_not_found" });

  const inserted = [];
  if (isolate_variants && (product.variants || []).length > 0) {
    for (const v of product.variants) {
      const d = buildDraftFromProduct(product, v);
      inserted.push(await insertDraft(req.license.key, d));
    }
    await logActivity(req.license.key, "import",
      `Imported '${product.title}' as ${inserted.length} isolated variant drafts`);
  } else {
    const d = buildDraftFromProduct(product);
    inserted.push(await insertDraft(req.license.key, d));
    await logActivity(req.license.key, "import", `Imported '${product.title}' to Import List`);
  }
  res.json({ inserted });
});

// ── GET /api/imports ──────────────────────────────────────────────────────
router.get("/api/imports", async (req, res) => {
  const { rows } = await q(
    "SELECT * FROM import_drafts WHERE license_key=$1 ORDER BY created_at DESC LIMIT 500",
    [req.license.key]
  );
  res.json(rows);
});

// ── GET /api/imports/:draft_id ────────────────────────────────────────────
router.get("/api/imports/:draft_id", async (req, res) => {
  const { rows } = await q(
    "SELECT * FROM import_drafts WHERE license_key=$1 AND draft_id=$2",
    [req.license.key, req.params.draft_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "draft_not_found" });
  res.json(rows[0]);
});

// ── PATCH /api/imports/:draft_id ──────────────────────────────────────────
router.patch("/api/imports/:draft_id", async (req, res) => {
  const { rows: existing } = await q(
    "SELECT * FROM import_drafts WHERE license_key=$1 AND draft_id=$2",
    [req.license.key, req.params.draft_id]
  );
  if (existing.length === 0) return res.status(404).json({ error: "draft_not_found" });
  const cur = existing[0];

  const allowed = ["title","description","retail_price","category","tags","seo_title","seo_meta_description","notes"];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

  const studio_edits = { ...(cur.studio_edits || {}), ...patch };
  const setPairs = [];
  const vals = [];
  let i = 1;
  if (patch.title !== undefined) { setPairs.push(`title=$${i++}`); vals.push(patch.title); }
  if (patch.description !== undefined) { setPairs.push(`description=$${i++}`); vals.push(patch.description); }
  if (patch.retail_price !== undefined) {
    setPairs.push(`retail_price=$${i++}`); vals.push(patch.retail_price);
    setPairs.push(`profit_estimate=$${i++}`); vals.push(Number((Number(patch.retail_price) - Number(cur.price)).toFixed(2)));
  }
  if (patch.category !== undefined) { setPairs.push(`category=$${i++}`); vals.push(patch.category); }
  if (patch.tags !== undefined) { setPairs.push(`tags=$${i++}`); vals.push(JSON.stringify(patch.tags)); }
  setPairs.push(`studio_edits=$${i++}`); vals.push(JSON.stringify(studio_edits));
  setPairs.push(`updated_at=now()`);

  vals.push(req.license.key, req.params.draft_id);
  const sql = `UPDATE import_drafts SET ${setPairs.join(", ")} WHERE license_key=$${i++} AND draft_id=$${i} RETURNING *`;
  const { rows } = await q(sql, vals);
  await logActivity(req.license.key, "studio_edit", `Updated draft ${String(req.params.draft_id).slice(0,8)}: ${Object.keys(patch).join(", ")}`);
  res.json(rows[0]);
});

// ── DELETE /api/imports/:draft_id ─────────────────────────────────────────
router.delete("/api/imports/:draft_id", async (req, res) => {
  const { rows } = await q(
    "DELETE FROM import_drafts WHERE license_key=$1 AND draft_id=$2 RETURNING wc_product_id, title",
    [req.license.key, req.params.draft_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "draft_not_found" });
  await logActivity(req.license.key, "delete_draft", `Deleted Import List draft '${rows[0].title || ""}'`);
  res.json({ deleted: true, wc_product_preserved: rows[0].wc_product_id !== null });
});

// ── DELETE /api/imports  (clear unpublished) ───────────────────────────────
router.delete("/api/imports", async (req, res) => {
  const { rowCount } = await q(
    "DELETE FROM import_drafts WHERE license_key=$1 AND publish_status<>'published'",
    [req.license.key]
  );
  await logActivity(req.license.key, "maintenance", `Cleared ${rowCount} Import List drafts (published preserved)`);
  res.json({ deleted: rowCount });
});
