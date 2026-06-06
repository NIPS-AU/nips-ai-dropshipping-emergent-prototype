// Smart scoring + sort/filter port of /app/backend/server.py → compute_meta()
// Pure arithmetic, no I/O. Keep weights in sync with the prototype.

export const SORT_OPTIONS = new Set([
  "cheapest",
  "profit_top",
  "profit_pct_top",
  "best_rating",
  "most_orders",
  "fastest_shipping",
  "free_shipping",
  "min_reviews_100",
  "best_score",
]);

export function parseShippingMinDays(s) {
  if (!s) return 30;
  const m = /(\d+)\s*-\s*(\d+)/.exec(s);
  if (m) return parseInt(m[1], 10);
  const m2 = /(\d+)/.exec(s);
  return m2 ? parseInt(m2[1], 10) : 30;
}

export const SCORE_WEIGHTS = {
  profit: 0.30,
  rating: 0.15,
  reviews: 0.15,
  shipping: 0.10,
  free_shipping: 0.10,
  images: 0.05,
  variants: 0.05,
  quality: 0.10,
};

export function computeMeta(p) {
  const price = Number(p?.price || 0);
  const retail = Number(p?.retail_price || 0);
  const profit = retail - price;
  const profit_pct = price ? (profit / price) * 100 : 0;

  const supplier = p?.supplier || {};
  const rating = Number(supplier.rating || 0);
  const feedback = Number(supplier.feedback_count || 0);

  const images = (p?.gallery_images || []).length;
  const variants = (p?.variants || []).length;
  const specs = (p?.specifications || []).length;
  const descLen = (p?.description || "").length;

  const ship = p?.shipping || {};
  const shipDays = parseShippingMinDays(ship.estimated_delivery);
  const shipPrice = Number(ship.price || 0);
  const freeShip = shipPrice === 0 && Boolean(ship.has_shipping);

  // Prototype-derived synthetic orders count.
  // PRODUCTION: replace with real `orders_count` from the AliExpress provider.
  const orders = p?.orders ?? Math.round(feedback * 2.4);

  const nProfit = Math.min(Math.max(profit_pct / 300, 0), 1);
  const nRating = Math.min(Math.max(rating / 5, 0), 1);
  const nReviews = Math.min(Math.log10(feedback + 1) / 5, 1);
  const nShip = Math.max(0, 1 - shipDays / 30);
  const nImages = Math.min(images / 8, 1);
  const nVariants = Math.min(variants / 3, 1);
  const nQuality =
    Math.min(descLen / 600, 1) * 0.5 + Math.min(specs / 8, 1) * 0.5;

  const w = SCORE_WEIGHTS;
  const score =
    w.profit * nProfit +
    w.rating * nRating +
    w.reviews * nReviews +
    w.shipping * nShip +
    w.free_shipping * (freeShip ? 1 : 0) +
    w.images * nImages +
    w.variants * nVariants +
    w.quality * nQuality;

  return {
    score: Math.round(score * 100 * 10) / 10,
    profit_pct: Math.round(profit_pct * 10) / 10,
    shipping_days_min: shipDays,
    free_shipping: freeShip,
    orders,
    rating,
    feedback_count: feedback,
    score_breakdown: {
      profit_margin: round3(nProfit),
      rating: round3(nRating),
      reviews: round3(nReviews),
      shipping_speed: round3(nShip),
      free_shipping: freeShip ? 1 : 0,
      images: round3(nImages),
      variants: round3(nVariants),
      content_quality: round3(nQuality),
      weights: w,
    },
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export function enrich(p) {
  return { ...p, meta: computeMeta(p) };
}

export function applySortAndFilters(items, { sortBy, filterFree = false, filterMinReviews = 0 } = {}) {
  let rows = items.map(enrich);

  let key = sortBy;
  if (key === "free_shipping") {
    rows = rows.filter((r) => r.meta.free_shipping);
    key = "best_score";
  }
  if (key === "min_reviews_100") {
    rows = rows.filter((r) => r.meta.feedback_count >= 100);
    key = "best_score";
  }
  if (filterFree) rows = rows.filter((r) => r.meta.free_shipping);
  if (filterMinReviews > 0)
    rows = rows.filter((r) => r.meta.feedback_count >= filterMinReviews);

  const keyFns = {
    cheapest: [(r) => Number(r.price || 0), false],
    profit_top: [(r) => Number(r.profit_estimate ?? (r.retail_price - r.price) ?? 0), true],
    profit_pct_top: [(r) => Number(r.meta.profit_pct || 0), true],
    best_rating: [(r) => Number(r.meta.rating || 0), true],
    most_orders: [(r) => Number(r.meta.orders || 0), true],
    fastest_shipping: [(r) => Number(r.meta.shipping_days_min || 99), false],
    best_score: [(r) => Number(r.meta.score || 0), true],
  };
  const [fn, reverse] = keyFns[key] || keyFns.best_score;
  rows.sort((a, b) => (reverse ? fn(b) - fn(a) : fn(a) - fn(b)));
  return rows;
}

// Flatten the rich supplier product into the public v1 contract.
export function flattenSupplierProduct(p) {
  const meta = p.meta || {};
  const supplier = p.supplier || {};
  const shipping = p.shipping || {};

  const variants = (p.variants || []).map((v) => ({
    variant_id: v.variant_id,
    sku: v.sku,
    title: v.title,
    image: v.image,
    price: v.price,
    retail_price: v.retail_price,
    attributes: v.attributes || {},
    stock: v.stock,
  }));

  return {
    product_id: p.product_id,
    sku: p.sku,
    title: p.title,
    product_url: p.product_url || p.supplier_url,
    supplier_url: p.supplier_url || p.product_url,
    price: p.price,
    retail_price: p.retail_price,
    profit_estimate: p.profit_estimate,
    profit_pct: meta.profit_pct,
    currency: p.currency,
    category: p.category,
    tags: p.tags || [],
    main_image: p.main_image,
    gallery_images: p.gallery_images || [],
    description_images: p.description_images || [],
    description: p.description,
    specifications: p.specifications || [],
    attributes: p.attributes || [],
    variants,
    shipping_method: shipping.method,
    shipping_price: shipping.price,
    shipping_from: shipping.from_country,
    shipping_to: shipping.to_country,
    estimated_delivery: shipping.estimated_delivery,
    has_shipping: shipping.has_shipping,
    free_shipping: meta.free_shipping,
    rating: supplier.rating ?? meta.rating,
    orders: meta.orders,
    stock: p.stock,
    supplier: {
      name: supplier.name,
      store_url: supplier.store_url,
      rating: supplier.rating,
      feedback_count: supplier.feedback_count,
      country: supplier.country,
    },
    meta,
  };
}
