import { Router } from "express";
import { q } from "../lib/db.js";
import { logActivity } from "./discovery.js";
import { runLlm } from "../lib/ai.js";

export const router = Router();

async function getSettings(license_key) {
  const { rows } = await q("SELECT * FROM ai_settings WHERE license_key=$1", [license_key]);
  if (rows.length === 0) {
    await q("INSERT INTO ai_settings(license_key) VALUES ($1) ON CONFLICT DO NOTHING", [license_key]);
    const seeded = await q("SELECT * FROM ai_settings WHERE license_key=$1", [license_key]);
    return seeded.rows[0];
  }
  return rows[0];
}

router.get("/api/ai/settings", async (req, res) => {
  res.json(await getSettings(req.license.key));
});

router.put("/api/ai/settings", async (req, res) => {
  const cols = [
    "title_rewrite","description_cleanup","seo_title","seo_meta_description",
    "tags_suggest","category_suggest","attributes_cleanup","specs_cleanup",
    "translate_enabled","default_language","default_model",
  ];
  const patch = {};
  for (const c of cols) if (req.body[c] !== undefined) patch[c] = req.body[c];

  const setPairs = Object.keys(patch).map((c, i) => `${c}=$${i + 2}`);
  const vals = Object.values(patch);
  await q(
    `INSERT INTO ai_settings(license_key) VALUES ($1) ON CONFLICT (license_key) DO NOTHING`,
    [req.license.key]
  );
  if (setPairs.length > 0) {
    await q(
      `UPDATE ai_settings SET ${setPairs.join(", ")}, updated_at=now() WHERE license_key=$1`,
      [req.license.key, ...vals]
    );
  }
  await logActivity(req.license.key, "ai_settings", "AI toggles updated");
  res.json(await getSettings(req.license.key));
});

router.post("/api/ai/rewrite", async (req, res) => {
  const { draft_id, field, target_language, instructions } = req.body || {};
  if (!draft_id || !field) return res.status(400).json({ error: "draft_id_and_field_required" });

  const { rows } = await q(
    "SELECT * FROM import_drafts WHERE license_key=$1 AND draft_id=$2",
    [req.license.key, draft_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "draft_not_found" });
  const draft = rows[0];

  const settings = await getSettings(req.license.key);
  const model = settings.default_model || "gpt-5.2";

  let content;
  if (field === "translate") content = draft.description || "";
  else if (field === "title") content = draft.title || "";
  else if (field === "description") content = draft.description || "";
  else if (field === "seo_title" || field === "seo_meta_description")
    content = `${draft.title || ""}\n\n${draft.description || ""}`;
  else if (field === "tags")
    content = `Title: ${draft.title}\nCategory: ${draft.category}\nDescription: ${(draft.description || "").slice(0, 1200)}`;
  else if (field === "category")
    content = `Title: ${draft.title}\nDescription: ${(draft.description || "").slice(0, 800)}`;
  else if (field === "attributes") content = JSON.stringify(draft.attributes || []);
  else if (field === "specs") content = JSON.stringify(draft.specifications || []);
  else return res.status(400).json({ error: "unsupported_field", field });

  let suggestion;
  try {
    suggestion = await runLlm({ field, content, model, language: target_language });
  } catch (e) {
    console.error("ai_rewrite_failed", e);
    return res.status(502).json({ error: "ai_provider_error", detail: e.message });
  }

  const history = draft.ai_history || [];
  history.push({ field, before: String(content).slice(0, 4000), after: suggestion, applied: false, model, created_at: new Date().toISOString() });
  await q(
    "UPDATE import_drafts SET ai_history=$1, updated_at=now() WHERE license_key=$2 AND draft_id=$3",
    [JSON.stringify(history), req.license.key, draft_id]
  );
  await logActivity(req.license.key, "ai_rewrite", `AI rewrite '${field}' on draft ${String(draft_id).slice(0,8)}`);
  res.json({ field, model, suggestion });
});
