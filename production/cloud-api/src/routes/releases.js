import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { q } from "../lib/db.js";

export const router = Router();

const RELEASES_DIR = process.env.RELEASES_DIR || "/opt/nips-ai-dropshipping-cloud/storage/releases";
const UPDATES_BASE = process.env.PUBLIC_UPDATES_URL || "https://updates.nipsdownloads.com";

function decorate(row) {
  const license = "NIPS-ADMIN-LICENSE-0001";  // download URL is license-bound at click time
  return {
    version: row.version,
    channel: row.channel,
    released_at: typeof row.released_at === "string" ? row.released_at : row.released_at?.toISOString?.().slice(0,10),
    notes: row.notes,
    size_kb: row.size_kb,
    is_latest: row.is_latest,
    download_url: `${UPDATES_BASE}/v1/plugin/releases/download?version=${encodeURIComponent(row.version)}&license_key=${license}`,
  };
}

router.get(["/api/v1/plugin/releases", "/v1/plugin/releases"], async (_req, res) => {
  const { rows } = await q("SELECT * FROM plugin_releases ORDER BY released_at DESC");
  res.json(rows.map(decorate));
});

router.get(["/api/v1/plugin/releases/latest", "/v1/plugin/releases/latest"], async (_req, res) => {
  const { rows } = await q("SELECT * FROM plugin_releases WHERE is_latest=true AND channel='stable' LIMIT 1");
  if (rows.length === 0) return res.status(404).json({ error: "no_latest_release" });
  res.json(decorate(rows[0]));
});

// Real download — license_key required (passed as query, like the prototype URL).
router.get(["/api/v1/plugin/releases/download", "/v1/plugin/releases/download"], async (req, res) => {
  const { version, license_key } = req.query;
  if (!version || !license_key)
    return res.status(400).json({ error: "version_and_license_key_required" });

  const lic = await q("SELECT * FROM licenses WHERE key=$1 AND valid=true", [license_key]);
  if (lic.rows.length === 0) return res.status(403).json({ error: "invalid_license_key" });

  const rel = await q("SELECT * FROM plugin_releases WHERE version=$1", [version]);
  if (rel.rows.length === 0) return res.status(404).json({ error: "version_not_found" });

  const filePath = path.join(RELEASES_DIR, rel.rows[0].file_path);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ error: "release_file_missing", path: filePath });
  }
  res.download(filePath, rel.rows[0].file_path);
});
