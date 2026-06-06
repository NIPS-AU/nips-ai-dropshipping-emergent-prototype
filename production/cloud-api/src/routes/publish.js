import { Router } from "express";
import { q } from "../lib/db.js";
import { logActivity } from "./discovery.js";

export const router = Router();

router.post("/api/publish", async (req, res) => {
  const { draft_id, publish_mode = "draft" } = req.body || {};
  if (!draft_id) return res.status(400).json({ error: "draft_id_required" });

  const { rows } = await q(
    "SELECT * FROM import_drafts WHERE license_key=$1 AND draft_id=$2",
    [req.license.key, draft_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "draft_not_found" });
  const draft = rows[0];
  if (draft.publish_status === "published")
    return res.status(400).json({ error: "already_published" });

  // ─────────────────────────────────────────────────────────────────────────
  //  PRODUCTION INTEGRATION POINT
  //
  //  Replace this block with a call to the WordPress plugin REST endpoint
  //  on the customer storefront (looked up via licenses.domain).
  //  The plugin builds the WC product from draft.studio_edits (NOT the raw
  //  supplier JSON), downloads/WebP-converts images, attaches gallery/featured,
  //  and returns the real WC product id.
  // ─────────────────────────────────────────────────────────────────────────
  const wc_product_id = 1000 + Math.floor(Date.now() / 1000) % 90000;
  const steps = [
    "Resolved draft from Import List",
    "Mapped title, SKU, price, category, tags",
    "Built WooCommerce product payload",
    `Created WooCommerce product (mode=${publish_mode}) → ID #${wc_product_id}`,
    "Attached supplier metadata",
    "Saved NIPS import draft ID on product",
  ];

  await q(
    `INSERT INTO publish_logs(license_key, draft_id, publish_mode, wc_product_id, wc_status, title, status, steps)
     VALUES ($1,$2,$3,$4,'draft',$5,'success',$6)`,
    [req.license.key, draft_id, publish_mode, wc_product_id, draft.title, JSON.stringify(steps)]
  );
  await q(
    `UPDATE import_drafts SET publish_status='published', wc_product_id=$1, wc_publish_mode=$2, updated_at=now()
     WHERE license_key=$3 AND draft_id=$4`,
    [wc_product_id, publish_mode, req.license.key, draft_id]
  );
  await logActivity(req.license.key, "publish",
    `Published draft ${String(draft_id).slice(0,8)} → WC product #${wc_product_id} (${publish_mode})`);

  res.json({ draft_id, publish_mode, wc_product_id, wc_status: "draft", title: draft.title, status: "success", steps });
});

router.get("/api/publish/logs", async (req, res) => {
  const { rows } = await q(
    "SELECT id, draft_id, publish_mode, wc_product_id, wc_status, title, status, steps, created_at FROM publish_logs WHERE license_key=$1 ORDER BY created_at DESC LIMIT $2",
    [req.license.key, Math.min(Number(req.query.limit) || 50, 200)]
  );
  res.json(rows);
});
