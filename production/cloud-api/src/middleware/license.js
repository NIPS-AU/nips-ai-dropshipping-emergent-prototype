import { q } from "../lib/db.js";

const REQUIRED = (process.env.LICENSE_REQUIRED || "true").toLowerCase() === "true";
const HEADER = (process.env.LICENSE_HEADER || "X-NIPS-License-Key").toLowerCase();

// Routes that NEVER require a license (public health, releases metadata, etc.)
const PUBLIC_PATHS = new Set([
  "/",
  "/healthz",
  "/v1/plugin/releases",
  "/v1/plugin/releases/latest",
  "/api/v1/plugin/releases",
  "/api/v1/plugin/releases/latest",
]);

export async function licenseMiddleware(req, res, next) {
  // Allow CORS preflight through.
  if (req.method === "OPTIONS") return next();

  if (PUBLIC_PATHS.has(req.path)) return next();

  const key = req.headers[HEADER] || req.query.license_key;
  if (!key) {
    if (!REQUIRED) {
      // Initial bring-up: attach the admin license so downstream routes work.
      req.license = { key: "NIPS-ADMIN-LICENSE-0001", plan: "Business", domain: "alloutspares.com" };
      return next();
    }
    return res.status(401).json({ error: "missing_license_key", header: HEADER });
  }

  const { rows } = await q("SELECT * FROM licenses WHERE key=$1 AND valid=true", [key]);
  if (rows.length === 0) return res.status(403).json({ error: "invalid_license_key" });

  const lic = rows[0];
  if (new Date(lic.expires_at).getTime() < Date.now()) {
    return res.status(403).json({ error: "expired_license_key" });
  }
  req.license = lic;
  next();
}
