// AliExpress adapter — plug your real integration into searchAliExpress().
//
// This module is the ONLY place that talks to the supplier API. The rest of
// the cloud (routes, scoring, persistence) does not care which provider you
// use — RapidAPI, Apify, AliExpress Open Platform, your own scraper, etc.
//
// The returned items MUST match the rich payload shape (see flattenSupplierProduct
// in lib/scoring.js). At minimum each item needs:
//   product_id, sku, title, supplier_url, price, retail_price, profit_estimate,
//   currency, category, tags[], main_image, gallery_images[], description_images[],
//   description, specifications[], attributes[], variants[], shipping{},
//   stock, supplier{}
//
// All other fields (rating, orders, meta) are derived by lib/scoring.js.

import "dotenv/config";

const PROVIDER = (process.env.ALIEXPRESS_PROVIDER || "mock").toLowerCase();

/**
 * @param {Object} params
 * @param {string} params.query              - verbatim user query (do NOT rewrite)
 * @param {"name"|"url"|"sku"} params.mode   - autodetected by the route
 * @param {string} [params.shippingFrom]     - ISO country or "ALL"
 * @param {string} [params.shippingTo]       - ISO country or "any"
 * @param {number} [params.limit]            - 1..60
 * @returns {Promise<{ exact: ?object, results: object[] }>}
 */
export async function searchAliExpress(params) {
  switch (PROVIDER) {
    case "mock":
      return mockSearch(params);
    case "rapidapi":
      return rapidApiSearch(params);
    case "apify":
      return apifyActorSearch(params);
    case "aliexpress-open":
      return aliexpressOpenSearch(params);
    default:
      throw new Error(`Unknown ALIEXPRESS_PROVIDER: ${PROVIDER}`);
  }
}

// ─── Mock provider (catalogue parity with the Emergent prototype) ───────────
import mockCatalog from "./aliexpress.mock.js";

function mockSearch({ query, mode, shippingFrom = "ALL", limit = 18 }) {
  const all = mockCatalog;
  const idMatch = (p, id) => p.product_id === id || (p.sku || "").endsWith(id);

  if (mode === "url") {
    const m = /\/item\/(\d+)/.exec(query) || /(\d{10,})/.exec(query);
    const pid = m?.[1];
    const exact = pid ? all.find((p) => idMatch(p, pid)) : null;
    if (exact) return { exact, results: [exact] };
    if (pid) {
      const base = { ...all[0], product_id: pid, sku: `AE-${pid}`, supplier_url: query };
      return { exact: base, results: [base] };
    }
    return { exact: null, results: [] };
  }
  if (mode === "sku") {
    const pid = query.trim();
    const exact = all.find((p) => idMatch(p, pid));
    if (exact) return { exact, results: [exact] };
  }

  const q = (query || "").toLowerCase();
  let hits = q
    ? all.filter((p) => {
        const hay = `${p.title} ${p.category} ${(p.tags || []).join(" ")} ${p.description}`.toLowerCase();
        return hay.includes(q);
      })
    : all.slice();
  if (hits.length === 0) hits = all.slice();

  const shipFromUpper = (shippingFrom || "").toUpperCase();
  if (shipFromUpper && !["ALL", "ANY"].includes(shipFromUpper)) {
    hits = hits.filter((p) => (p.shipping?.from_country || "").toUpperCase() === shipFromUpper);
  }

  return { exact: null, results: hits.slice(0, Math.max(1, Math.min(limit, 60))) };
}

// ─── RapidAPI provider stub ────────────────────────────────────────────────
async function rapidApiSearch(/* params */) {
  // Implement using your RapidAPI AliExpress endpoint.
  // 1. Call the endpoint with the verbatim `query`.
  // 2. Map each provider item to the rich payload shape documented above.
  // 3. Return { exact: null|object, results: [...] }.
  throw new Error("rapidApiSearch not implemented — fill in src/lib/aliexpress.js");
}

// ─── Apify actor provider stub ─────────────────────────────────────────────
async function apifyActorSearch(/* params */) {
  throw new Error("apifyActorSearch not implemented — fill in src/lib/aliexpress.js");
}

// ─── AliExpress Open Platform provider stub ────────────────────────────────
async function aliexpressOpenSearch(/* params */) {
  throw new Error("aliexpressOpenSearch not implemented — fill in src/lib/aliexpress.js");
}
