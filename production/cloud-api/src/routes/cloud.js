import { Router } from "express";
import { q } from "../lib/db.js";

export const router = Router();

// ── GET /api/dashboard/stats ───────────────────────────────────────────────
router.get("/api/dashboard/stats", async (req, res) => {
  const licenseKey = req.license.key;
  const [drafts, published, recent] = await Promise.all([
    q("SELECT count(*)::int AS c FROM import_drafts WHERE license_key=$1", [licenseKey]),
    q("SELECT count(*)::int AS c FROM publish_logs WHERE license_key=$1 AND status='success'", [licenseKey]),
    q("SELECT id, kind, message, meta, created_at FROM activity_logs WHERE license_key=$1 ORDER BY created_at DESC LIMIT 8", [licenseKey]),
  ]);
  res.json({
    license: {
      status: req.license.valid ? "active" : "inactive",
      plan: req.license.plan,
      key: req.license.key,
      expires_at: req.license.expires_at,
    },
    cloud: {
      status: "connected",
      endpoint: (process.env.PUBLIC_API_URL || "https://api.nipsdownloads.com").replace(/^https?:\/\//, ""),
      latency_ms: 0,
      version: process.env.npm_package_version || "1.0.0",
    },
    counters: {
      import_drafts: drafts.rows[0].c,
      published_mock: published.rows[0].c,
    },
    recent_activity: recent.rows,
  });
});

// ── GET /api/license/status ────────────────────────────────────────────────
router.get("/api/license/status", async (req, res) => {
  const lic = req.license;
  const last4 = (lic.key || "").split("-").pop() || "";
  res.json({
    key: lic.key,
    key_last4: last4,
    key_masked: `NIPS-•••-${last4}`,
    valid: Boolean(lic.valid),
    plan: lic.plan,
    plan_label: lic.plan_label || lic.plan,
    domain: lic.domain,
    issued_at: lic.issued_at,
    expires_at: lic.expires_at,
    features: lic.features || [],
  });
});

// ── GET /api/logs ──────────────────────────────────────────────────────────
router.get("/api/logs", async (req, res) => {
  const { rows } = await q(
    "SELECT id, kind, message, meta, created_at FROM activity_logs WHERE license_key=$1 ORDER BY created_at DESC LIMIT $2",
    [req.license.key, Math.min(Number(req.query.limit) || 100, 500)]
  );
  res.json(rows);
});

router.delete("/api/logs", async (req, res) => {
  const { rowCount } = await q("DELETE FROM activity_logs WHERE license_key=$1", [req.license.key]);
  res.json({ deleted: rowCount });
});

// ── GET /api/maintenance ───────────────────────────────────────────────────
router.get("/api/maintenance", (_req, res) => {
  res.json({
    available_targets: ["history", "saved", "drafts", "cache", "logs", "all"],
    descriptions: {
      history: "Clear Discovery search history",
      saved: "Clear saved searches (placeholder for future module)",
      drafts: "Clear unpublished Import List drafts — preserves published WC products",
      cache: "Clear temporary image cache (placeholder)",
      logs: "Clear activity logs",
      all: "Clear all of the above (published WC products always preserved)",
    },
    endpoint: "POST /api/maintenance/clear?target={target}",
  });
});

router.post("/api/maintenance/clear", async (req, res) => {
  const target = String(req.query.target || "").toLowerCase();
  if (!["history","saved","drafts","cache","logs","all"].includes(target))
    return res.status(400).json({ error: "invalid_target" });
  const out = {};
  if (["history","all"].includes(target)) {
    const r = await q("DELETE FROM search_history WHERE license_key=$1", [req.license.key]);
    out.search_history = r.rowCount;
  }
  if (["drafts","all"].includes(target)) {
    const r = await q("DELETE FROM import_drafts WHERE license_key=$1 AND publish_status<>'published'", [req.license.key]);
    out.import_drafts = r.rowCount;
  }
  if (["logs","all"].includes(target)) {
    const r = await q("DELETE FROM activity_logs WHERE license_key=$1", [req.license.key]);
    out.activity_logs = r.rowCount;
  }
  res.json({ target, deleted: out });
});
