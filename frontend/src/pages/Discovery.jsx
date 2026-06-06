import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";
import {
  Search as SearchIcon, Link as LinkIcon, Tag, Box, Globe, Sparkles, Trash2,
  History as HistoryIcon, Truck, Layers, TrendingUp, Star, ShoppingCart,
  Zap, Trophy, Info, ExternalLink, ChevronDown, ChevronRight, Code2, Copy,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SUPPLIER_SEARCH_URL = `${BACKEND_URL}/v1/suppliers/aliexpress/search`;

const MODES = [
  { value: "auto", label: "Auto Detect", icon: Sparkles },
  { value: "name", label: "Product Name", icon: Tag },
  { value: "url", label: "Product URL", icon: LinkIcon },
  { value: "sku", label: "SKU / Product ID", icon: Box },
  { value: "category", label: "Category", icon: Layers },
  { value: "supplier", label: "Supplier URL", icon: Globe },
];

const SORTS = [
  { value: "best_score", label: "Best dropshipping score", icon: Trophy, group: "Smart" },
  { value: "profit_pct_top", label: "Highest profit %", icon: TrendingUp, group: "Smart" },
  { value: "profit_top", label: "Highest estimated profit", icon: TrendingUp, group: "Smart" },
  { value: "cheapest", label: "Cheapest supplier price", icon: Tag, group: "Price" },
  { value: "best_rating", label: "Best supplier rating", icon: Star, group: "Trust" },
  { value: "most_orders", label: "Most orders / sales", icon: ShoppingCart, group: "Trust" },
  { value: "fastest_shipping", label: "Fastest shipping", icon: Zap, group: "Logistics" },
  { value: "free_shipping", label: "Free shipping only", icon: Truck, group: "Logistics" },
  { value: "min_reviews_100", label: "100+ reviews only", icon: Star, group: "Trust" },
];

const SHIPPING_FROM = [
  { value: "any", label: "Any country" },
  { value: "CN", label: "China (CN)" },
  { value: "US", label: "United States (US)" },
  { value: "UK", label: "United Kingdom (UK)" },
  { value: "DE", label: "Germany (DE)" },
  { value: "ES", label: "Spain (ES)" },
  { value: "AU", label: "Australia (AU)" },
  { value: "TR", label: "Türkiye (TR)" },
];

const SHIPPING_TO = [
  { value: "any", label: "Any country" },
  { value: "US", label: "United States (US)" },
  { value: "UK", label: "United Kingdom (UK)" },
  { value: "AU", label: "Australia (AU)" },
  { value: "DE", label: "Germany (DE)" },
  { value: "FR", label: "France (FR)" },
  { value: "CA", label: "Canada (CA)" },
  { value: "NL", label: "Netherlands (NL)" },
  { value: "ES", label: "Spain (ES)" },
];

function ScoreRing({ score }) {
  if (score === undefined || score === null) return null;
  const n = Number(score);
  const c = n >= 75 ? "text-emerald-600" : n >= 55 ? "text-blue-600" : "text-amber-600";
  return (
    <div
      data-testid="product-score"
      className={`inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold ${c}`}
      title="Prototype dropshipping score — heuristic only"
    >
      <Trophy className="w-3 h-3" />
      {n.toFixed(0)}
    </div>
  );
}

/** Defensive field reader — supports both prototype and real cloud payloads. */
function pickProduct(p) {
  const supplier = p.supplier || {};
  const meta = p.meta || {};
  const shipping = p.shipping || {};
  return {
    product_id: p.product_id ?? p.id ?? "",
    sku: p.sku ?? "",
    title: p.title ?? p.name ?? "",
    product_url: p.product_url ?? p.supplier_url ?? "",
    supplier_url: p.supplier_url ?? p.product_url ?? "",
    supplier_name: supplier.name ?? p.supplier_name ?? "",
    supplier_store_url: supplier.store_url ?? p.supplier_store_url ?? "",
    supplier_rating: supplier.rating ?? p.supplier_rating ?? meta.rating ?? 0,
    price: Number(p.price ?? 0),
    retail_price: Number(p.retail_price ?? 0),
    profit_estimate: Number(
      p.profit_estimate ?? ((p.retail_price ?? 0) - (p.price ?? 0))
    ),
    currency: p.currency ?? "USD",
    category: p.category ?? "",
    tags: p.tags ?? [],
    main_image: p.main_image ?? (p.gallery_images || [])[0] ?? "",
    gallery_images: p.gallery_images ?? [],
    description_images: p.description_images ?? [],
    variants: p.variants ?? [],
    specifications: p.specifications ?? [],
    attributes: p.attributes ?? [],
    shipping_method: shipping.method ?? p.shipping_method ?? "",
    shipping_price: Number(shipping.price ?? p.shipping_price ?? 0),
    shipping_from: shipping.from_country ?? p.shipping_from ?? "",
    shipping_to: shipping.to_country ?? p.shipping_to ?? "",
    estimated_delivery: shipping.estimated_delivery ?? p.estimated_delivery ?? "",
    has_shipping: shipping.has_shipping ?? p.has_shipping ?? false,
    stock: p.stock ?? 0,
    rating: p.rating ?? supplier.rating ?? meta.rating ?? 0,
    orders: p.orders ?? meta.orders ?? supplier.feedback_count ?? 0,
    score: meta.score,
    profit_pct: meta.profit_pct,
    feedback_count: meta.feedback_count ?? supplier.feedback_count ?? 0,
    free_shipping: meta.free_shipping ?? (Number(shipping.price ?? 0) === 0 && (shipping.has_shipping ?? false)),
    shipping_days_min: meta.shipping_days_min,
  };
}

function ProductCard({ raw, onImport, isolate, setIsolate }) {
  const p = pickProduct(raw);
  const variants = p.variants || [];
  return (
    <Card data-testid={`discovery-card-${p.product_id}`} className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-slate-100">
        {p.main_image ? (
          <img src={p.main_image} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300 text-xs">No image</div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {variants.length > 0 && (
            <Badge className="bg-blue-600 text-white">{variants.length} variants</Badge>
          )}
          <Badge className="bg-white text-slate-700 border border-slate-200">
            {(p.gallery_images || []).length} images
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          {p.score !== undefined && <ScoreRing score={p.score} />}
        </div>
      </div>
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-base font-medium text-slate-900 line-clamp-2 leading-snug">{p.title}</h3>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-display font-bold text-blue-600">
              {formatCurrency(p.price, p.currency)}
            </div>
            <div className="text-xs text-slate-500">
              Retail {formatCurrency(p.retail_price, p.currency)} ·{" "}
              <span className="text-emerald-700 font-semibold">
                +{formatCurrency(p.profit_estimate, p.currency)}
              </span>
              {p.profit_pct !== undefined && ` (${p.profit_pct}%)`}
            </div>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[11px] font-mono">
            {p.product_id}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" />
            {Number(p.rating).toFixed(1)} · {Number(p.feedback_count).toLocaleString()} reviews
          </div>
          <div className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3 text-slate-400" />
            {Number(p.orders).toLocaleString()} orders
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3 text-slate-400" />
            {p.free_shipping ? "Free shipping" : (p.shipping_price ? formatCurrency(p.shipping_price) : "—")}
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-slate-400" />
            {p.estimated_delivery || (p.shipping_days_min ? `from ${p.shipping_days_min}d` : "—")}
          </div>
          <div className="col-span-2 truncate" title={`${p.supplier_name} · ${p.shipping_from}→${p.shipping_to}`}>
            {p.supplier_name} {p.shipping_from && `· ${p.shipping_from}→${p.shipping_to || "—"}`}
          </div>
        </div>

        {(p.product_url || p.supplier_url) && (
          <div className="text-[11px] text-slate-500">
            <a
              href={p.product_url || p.supplier_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-blue-600 truncate max-w-full"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{p.product_url || p.supplier_url}</span>
            </a>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
            <Checkbox
              data-testid={`isolate-${p.product_id}`}
              checked={!!isolate[p.product_id]}
              onCheckedChange={(v) => setIsolate({ ...isolate, [p.product_id]: !!v })}
              disabled={variants.length === 0}
            />
            Isolate variants
          </label>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            data-testid={`import-btn-${p.product_id}`}
            onClick={() => onImport(p)}
          >
            Import to List
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RawPayloadPanel({ requestBody, response, requestUrl }) {
  const [open, setOpen] = useState(true);
  const copy = (label, text) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`);
  };
  if (!response) return null;
  return (
    <Card className="border-slate-200 shadow-sm mt-6" data-testid="raw-payload-panel">
      <CardContent className="p-0">
        <button
          type="button"
          data-testid="raw-payload-toggle"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
        >
          <span className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <Code2 className="w-4 h-4 text-slate-500" />
            Developer / debug — full JSON response
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 ml-2">
              {Array.isArray(response?.results) ? `${response.results.length} item(s)` : "—"}
            </Badge>
          </span>
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {open && (
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 font-semibold">POST {requestUrl}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-slate-500"
                  data-testid="copy-request"
                  onClick={() => copy("Request", JSON.stringify(requestBody, null, 2))}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy request
                </Button>
              </div>
              <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
                {JSON.stringify(requestBody, null, 2)}
              </pre>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Response body</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-slate-500"
                data-testid="copy-response"
                onClick={() => copy("Response", JSON.stringify(response, null, 2))}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy response
              </Button>
            </div>
            <pre className="raw-payload" data-testid="raw-payload-json">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Discovery() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState("auto");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("best_score");
  const [shippingFrom, setShippingFrom] = useState("any");
  const [shippingTo, setShippingTo] = useState("any");
  const [filterFree, setFilterFree] = useState(false);
  const [filterMinReviews, setFilterMinReviews] = useState(0);
  const [data, setData] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [isolate, setIsolate] = useState({});

  const { data: history } = useQuery({ queryKey: ["history"], queryFn: endpoints.discoveryHistory });

  const buildPayload = () => ({
    query, // exact user-typed query, never modified
    platform: "aliexpress",
    shipping_from: shippingFrom,
    shipping_to: shippingTo,
    sort: sortBy,
    limit: 18,
    // Extra hints (ignored by clouds that don't use them):
    mode,
    filter_free_shipping: filterFree,
    filter_min_reviews: filterMinReviews,
  });

  const normaliseResponse = (raw) => {
    // Accept multiple shapes from the production cloud:
    // 1) { results: [...], count, exact_match, ... }
    // 2) { data: [...] }
    // 3) [ ... ] (bare array)
    if (Array.isArray(raw)) return { results: raw, count: raw.length, exact_match: false };
    if (Array.isArray(raw?.results)) return raw;
    if (Array.isArray(raw?.data)) return { ...raw, results: raw.data, count: raw.count ?? raw.data.length };
    if (Array.isArray(raw?.products)) return { ...raw, results: raw.products, count: raw.count ?? raw.products.length };
    return { results: [], count: 0, exact_match: false, raw };
  };

  const search = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      setLastRequest(payload);
      setLastError(null);
      const { data: resp } = await axios.post(SUPPLIER_SEARCH_URL, payload, {
        timeout: 30000,
        headers: { "Content-Type": "application/json" },
      });
      return { raw: resp, normalised: normaliseResponse(resp) };
    },
    onSuccess: ({ raw, normalised }) => {
      setData({ raw, normalised });
      qc.invalidateQueries({ queryKey: ["history"] });
      if (normalised.exact_match) toast.success("Exact product captured", { description: normalised.results[0]?.title });
      else toast.message(`${normalised.count} result(s) returned`);
    },
    onError: (e) => {
      const detail = e?.response?.data
        ? (typeof e.response.data === "string" ? e.response.data : JSON.stringify(e.response.data, null, 2))
        : (e?.message || "Unknown error");
      setLastError({ status: e?.response?.status, detail, code: e?.code });
      setData({ raw: e?.response?.data ?? null, normalised: { results: [], count: 0, exact_match: false } });
      toast.error("Supplier search failed", { description: e?.response?.status ? `HTTP ${e.response.status}` : e?.message });
    },
  });

  const importMut = useMutation({
    mutationFn: ({ product_id, isolate_variants }) =>
      endpoints.createImport({ product_id, isolate_variants }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["imports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Added to Import List", {
        description: `${res.inserted?.length || 0} draft(s) saved`,
        action: { label: "Open Import List", onClick: () => navigate("/imports") },
      });
    },
    onError: (e) => toast.error("Import failed", { description: e?.message }),
  });

  const onImport = (p) =>
    importMut.mutate({ product_id: p.product_id, isolate_variants: !!isolate[p.product_id] });

  const runSearch = () => search.mutate();
  const onSortChange = (v) => { setSortBy(v); if (data) setTimeout(() => search.mutate(), 0); };
  const onShipFromChange = (v) => { setShippingFrom(v); if (data) setTimeout(() => search.mutate(), 0); };
  const onShipToChange = (v) => { setShippingTo(v); if (data) setTimeout(() => search.mutate(), 0); };
  const onFreeChange = (v) => { setFilterFree(v); if (data) setTimeout(() => search.mutate(), 0); };
  const onMinReviewsChange = (v) => { setFilterMinReviews(v ? 100 : 0); if (data) setTimeout(() => search.mutate(), 0); };

  return (
    <div data-testid="discovery-page">
      <PageHeader
        title="Product Discovery"
        description="Search supplier products by name, URL, SKU, category or supplier store. Requests are sent verbatim to the NIPS-AI Cloud at api.nipsdownloads.com."
        testid="discovery-header"
      />

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger data-testid="discovery-mode" className="md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex items-center gap-2">
                      <m.icon className="w-3.5 h-3.5" />
                      {m.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              data-testid="discovery-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder='Search verbatim, e.g. "Makita Cordless Charger & Battery", or paste an AliExpress URL'
              className="flex-1 h-11"
            />
            <Button
              data-testid="discovery-search-btn"
              onClick={runSearch}
              disabled={search.isPending || !query.trim()}
              className="bg-blue-600 hover:bg-blue-700 h-11 px-6"
            >
              <SearchIcon className="w-4 h-4 mr-2" />
              {search.isPending ? "Searching…" : "Search"}
            </Button>
          </div>

          {/* Shipping + sort + filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">Ship from</span>
              <Select value={shippingFrom} onValueChange={onShipFromChange}>
                <SelectTrigger data-testid="shipping-from" className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_FROM.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">Ship to</span>
              <Select value={shippingTo} onValueChange={onShipToChange}>
                <SelectTrigger data-testid="shipping-to" className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_TO.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">Sort</span>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger data-testid="discovery-sort" className="h-9 w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value} data-testid={`sort-${s.value}`}>
                      <div className="flex items-center gap-2">
                        <s.icon className="w-3.5 h-3.5" />
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
              <label className="flex items-center gap-2 select-none">
                <Switch data-testid="filter-free-shipping" checked={filterFree} onCheckedChange={onFreeChange} />
                Free shipping
              </label>
              <label className="flex items-center gap-2 select-none">
                <Switch data-testid="filter-min-reviews" checked={filterMinReviews >= 100} onCheckedChange={onMinReviewsChange} />
                100+ reviews
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="score-explain-trigger" className="h-8 text-slate-500">
                    <Info className="w-3.5 h-3.5 mr-1" />
                    Score
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 text-xs leading-relaxed" align="end">
                  <p className="font-semibold text-slate-800 mb-2">Prototype dropshipping score</p>
                  <p className="text-slate-500 mb-2">
                    Heuristic 0–100 combining profit margin, supplier rating, review count,
                    shipping speed, free-shipping flag, image count, variant completeness and content quality.
                  </p>
                  <p className="text-amber-700 mt-2 text-[11px]">
                    Prototype only — not a real revenue prediction.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span>
              Endpoint: <code className="font-mono">POST {SUPPLIER_SEARCH_URL}</code>
            </span>
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-3.5 h-3.5" />
              <span>{history?.length || 0} past searches</span>
              {(history?.length || 0) > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="discovery-clear-history"
                  onClick={async () => {
                    await endpoints.clearDiscoveryHistory();
                    qc.invalidateQueries({ queryKey: ["history"] });
                    toast.success("Search history cleared");
                  }}
                  className="h-7 text-slate-500 hover:text-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear history
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {lastError && (
        <Card className="border-red-200 bg-red-50 mt-6" data-testid="discovery-error">
          <CardContent className="p-5 text-sm">
            <p className="font-semibold text-red-800 mb-1">
              Cloud API error{lastError.status ? ` · HTTP ${lastError.status}` : ""}
              {lastError.code ? ` · ${lastError.code}` : ""}
            </p>
            <pre className="font-mono text-[11px] text-red-700 whitespace-pre-wrap max-h-48 overflow-auto">
              {typeof lastError.detail === "string" ? lastError.detail : JSON.stringify(lastError.detail, null, 2)}
            </pre>
            <p className="text-[11px] text-red-700 mt-2">
              Request sent to <code className="font-mono">{SUPPLIER_SEARCH_URL}</code>. Verify the route exists on api.nipsdownloads.com and CORS is enabled for the frontend origin.
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="mt-8" data-testid="discovery-results">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              {data.normalised.exact_match ? "Exact product captured" : `${data.normalised.count} result(s)`}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                query: &ldquo;{lastRequest?.query}&rdquo;
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                {shippingFrom} → {shippingTo}
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                Sort: {(SORTS.find((s) => s.value === sortBy) || {}).label || sortBy}
              </Badge>
            </div>
          </div>
          {data.normalised.results.length === 0 ? (
            <p className="text-sm text-slate-500" data-testid="no-results">
              No products returned for the current query/filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.normalised.results.map((p, idx) => (
                <ProductCard
                  key={p.product_id ?? p.id ?? idx}
                  raw={p}
                  onImport={onImport}
                  isolate={isolate}
                  setIsolate={setIsolate}
                />
              ))}
            </div>
          )}

          <RawPayloadPanel
            requestBody={lastRequest}
            response={data.raw}
            requestUrl={SUPPLIER_SEARCH_URL}
          />
        </div>
      )}

      {!data && (
        <div className="mt-12 text-center text-slate-500" data-testid="discovery-empty">
          <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-3 text-sm">Run a search above to query the NIPS-AI Cloud supplier API.</p>
        </div>
      )}
    </div>
  );
}
