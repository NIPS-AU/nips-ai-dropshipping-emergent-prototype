import { Router } from "express";
import { q } from "../lib/db.js";
import { searchAliExpress } from "../lib/aliexpress.js";
import { applySortAndFilters, flattenSupplierProduct, SORT_OPTIONS } from "../lib/scoring.js";

export const router = Router();

const URL_RE = /^https?:\/\//i;
const PURE_DIGITS = /^\d{8,}$/;

function detectMode(query) {
  const q = (query || "").trim();
  if (URL_RE.test(q)) {
    if (/aliexpress\.com|\/item\//i.test(q)) return "url";
    return "supplier";
  }
  if (PURE_DIGITS.test(q)) return "sku";
  return "name";
}

async function logActivity(license_key, kind, message, meta = {}) {
  await q(
    "INSERT INTO activity_logs(license_key, kind, message, meta) VALUES ($1,$2,$3,$4)",
    [license_key, kind, message, meta]
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  POST /v1/suppliers/aliexpress/search   ← canonical (no /api prefix)
//  POST /api/v1/suppliers/aliexpress/search  ← Emergent-routable alias
// ────────────────────────────────────────────────────────────────────────────
async function supplierSearchHandler(req, res) {
  try {
    const {
      query, platform = "aliexpress",
      shipping_from = "ALL", shipping_to = "any",
      sort = "best_score", limit = 18,
    } = req.body || {};

    if (typeof query !== "string" || query.length === 0)
      return res.status(400).json({ error: "query_required" });
    if (String(platform).toLowerCase() !== "aliexpress")
      return res.status(400).json({ error: "unsupported_platform", platform });

    // Verbatim query — DO NOT rewrite or trim.
    const mode = detectMode(query);

    const { exact, results: raw } = await searchAliExpress({
      query, mode, shippingFrom: shipping_from, shippingTo: shipping_to,
      limit: Math.max(1, Math.min(Number(limit) || 18, 60)),
    });

    const sortBy = SORT_OPTIONS.has(sort) ? sort : "best_score";
    const enriched = applySortAndFilters(raw, { sortBy });
    const clamped = enriched.slice(0, Math.max(1, Math.min(Number(limit) || 18, 60)));
    const flat = clamped.map(flattenSupplierProduct);

    if (req.license?.key) {
      await q(
        `INSERT INTO search_history(license_key, endpoint, mode, query, sort_by, shipping_from, shipping_to, result_count)
         VALUES ($1,'v1.suppliers.aliexpress.search',$2,$3,$4,$5,$6,$7)`,
        [req.license.key, mode, query, sortBy, shipping_from, shipping_to, flat.length]
      );
      await logActivity(
        req.license.key, "supplier_search",
        `AliExpress search '${query}' [${sortBy}] from=${shipping_from} to=${shipping_to} → ${flat.length} result(s)`,
        { mode }
      );
    }

    res.json({
      platform: "aliexpress",
      query,                 // verbatim
      mode,
      sort: sortBy,
      shipping_from, shipping_to,
      limit: Math.max(1, Math.min(Number(limit) || 18, 60)),
      exact_match: Boolean(exact),
      count: flat.length,
      results: flat,
    });
  } catch (err) {
    console.error("supplier_search_error", err);
    res.status(500).json({ error: "supplier_search_failed", detail: err.message });
  }
}

router.post("/v1/suppliers/aliexpress/search", supplierSearchHandler);
router.post("/api/v1/suppliers/aliexpress/search", supplierSearchHandler);

// ── Discovery history ──────────────────────────────────────────────────────
router.get("/api/discovery/history", async (req, res) => {
  const { rows } = await q(
    "SELECT id, mode, query, sort_by, result_count, created_at FROM search_history WHERE license_key=$1 ORDER BY created_at DESC LIMIT $2",
    [req.license.key, Math.min(Number(req.query.limit) || 25, 200)]
  );
  res.json(rows);
});

router.delete("/api/discovery/history", async (req, res) => {
  const { rowCount } = await q("DELETE FROM search_history WHERE license_key=$1", [req.license.key]);
  await logActivity(req.license.key, "maintenance", `Cleared search history (${rowCount} entries)`);
  res.json({ deleted: rowCount });
});

// ── Legacy /api/discovery/search ───────────────────────────────────────────
router.post("/api/discovery/search", async (req, res, next) => {
  // Forward into the canonical handler with a shape-compatible payload.
  req.body = {
    query: req.body?.query || "",
    platform: "aliexpress",
    shipping_from: "ALL",
    shipping_to: "any",
    sort: req.body?.sort_by || "best_score",
    limit: 18,
  };
  return supplierSearchHandler(req, res, next);
});

export { logActivity };
