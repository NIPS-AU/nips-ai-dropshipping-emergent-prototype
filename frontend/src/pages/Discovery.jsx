import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";
import {
  Search as SearchIcon, Link as LinkIcon, Tag, Box, Globe, Sparkles, Trash2,
  History as HistoryIcon, Truck, Layers, TrendingUp, Star, ShoppingCart,
  Zap, Trophy, Info,
} from "lucide-react";

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

function ScoreRing({ score }) {
  const c = score >= 75 ? "text-emerald-600" : score >= 55 ? "text-blue-600" : "text-amber-600";
  return (
    <div
      data-testid="product-score"
      className={`inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold ${c}`}
      title="Prototype dropshipping score — heuristic only"
    >
      <Trophy className="w-3 h-3" />
      {score.toFixed(0)}
    </div>
  );
}

function ProductCard({ p, onImport, isolate, setIsolate }) {
  const variants = p.variants || [];
  const meta = p.meta || {};
  return (
    <Card data-testid={`discovery-card-${p.product_id}`} className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-slate-100">
        <img src={p.main_image} alt={p.title} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {variants.length > 0 && (
            <Badge className="bg-blue-600 text-white">{variants.length} variants</Badge>
          )}
          <Badge className="bg-white text-slate-700 border border-slate-200">
            {(p.gallery_images || []).length} images
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          {meta.score !== undefined && <ScoreRing score={meta.score} />}
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
              </span>{" "}
              ({meta.profit_pct ?? 0}%)
            </div>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[11px] font-mono">
            {p.product_id}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" />
            {meta.rating?.toFixed(1)} · {meta.feedback_count?.toLocaleString?.()} reviews
          </div>
          <div className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3 text-slate-400" />
            {meta.orders?.toLocaleString?.()} orders
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3 text-slate-400" />
            {meta.free_shipping ? "Free shipping" : formatCurrency(p.shipping?.price)}
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-slate-400" />
            from {meta.shipping_days_min}d
          </div>
        </div>

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

export default function Discovery() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState("auto");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("best_score");
  const [filterFree, setFilterFree] = useState(false);
  const [filterMinReviews, setFilterMinReviews] = useState(0);
  const [data, setData] = useState(null);
  const [isolate, setIsolate] = useState({});

  const { data: history } = useQuery({ queryKey: ["history"], queryFn: endpoints.discoveryHistory });

  const search = useMutation({
    mutationFn: () => endpoints.discoverySearch({
      mode,
      query,
      sort_by: sortBy,
      filter_free_shipping: filterFree,
      filter_min_reviews: filterMinReviews,
    }),
    onSuccess: (res) => {
      setData(res);
      qc.invalidateQueries({ queryKey: ["history"] });
      if (res.exact_match) toast.success("Exact product captured", { description: res.results[0]?.title });
      else toast.message(`${res.count} result(s) for ${res.mode.toUpperCase()} search`);
    },
    onError: (e) => toast.error("Search failed", { description: e?.message }),
  });

  const importMut = useMutation({
    mutationFn: ({ product_id, isolate_variants }) =>
      endpoints.createImport({ product_id, isolate_variants }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["imports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Added to Import List", {
        description: `${res.inserted.length} draft(s) saved`,
        action: { label: "Open Import List", onClick: () => navigate("/imports") },
      });
    },
    onError: (e) => toast.error("Import failed", { description: e?.message }),
  });

  const onImport = (p) => importMut.mutate({ product_id: p.product_id, isolate_variants: !!isolate[p.product_id] });
  const runSearch = () => search.mutate();

  // re-run when sort/filter changes if we already have results
  const onSortChange = (v) => { setSortBy(v); if (data) search.mutate(); };
  const onFreeChange = (v) => { setFilterFree(v); if (data) setTimeout(() => search.mutate(), 0); };

  return (
    <div data-testid="discovery-page">
      <PageHeader
        title="Product Discovery"
        description="Search supplier products by name, URL, SKU, category or supplier store. Pasting an AliExpress product URL returns the exact product."
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
              placeholder="Search products, paste AliExpress URL, or enter SKU…"
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

          {/* Smart sort + filters bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-400">Sort</span>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger data-testid="discovery-sort" className="h-9 w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value} data-testid={`sort-${s.value}`}>
                      <div className="flex items-center gap-2">
                        <s.icon className="w-3.5 h-3.5" />
                        <span>{s.label}</span>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] ml-2">
                          {s.group}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
              <label className="flex items-center gap-2 select-none">
                <Switch
                  data-testid="filter-free-shipping"
                  checked={filterFree}
                  onCheckedChange={onFreeChange}
                />
                Free shipping
              </label>
              <label className="flex items-center gap-2 select-none">
                <Switch
                  data-testid="filter-min-reviews"
                  checked={filterMinReviews >= 100}
                  onCheckedChange={(v) => {
                    setFilterMinReviews(v ? 100 : 0);
                    if (data) setTimeout(() => search.mutate(), 0);
                  }}
                />
                100+ reviews
              </label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="score-explain-trigger" className="h-8 text-slate-500">
                    <Info className="w-3.5 h-3.5 mr-1" />
                    How is the score calculated?
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 text-xs leading-relaxed" align="end">
                  <p className="font-semibold text-slate-800 mb-2">Prototype dropshipping score</p>
                  <p className="text-slate-500 mb-2">
                    Heuristic 0–100 score combining profit margin, supplier rating, review count,
                    shipping speed, free-shipping flag, image count, variant completeness and content quality.
                  </p>
                  <ul className="space-y-0.5 text-slate-600">
                    <li>· Profit margin · 30%</li>
                    <li>· Supplier rating · 15%</li>
                    <li>· Review count · 15%</li>
                    <li>· Shipping speed · 10%</li>
                    <li>· Free shipping · 10%</li>
                    <li>· Content quality · 10%</li>
                    <li>· Images · 5%</li>
                    <li>· Variant completeness · 5%</li>
                  </ul>
                  <p className="text-amber-700 mt-2 text-[11px]">
                    Prototype only — not a real revenue prediction.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span>
              Try: <code className="font-mono">https://www.aliexpress.com/item/1005007250240074.html</code>
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

      {data && (
        <div className="mt-8" data-testid="discovery-results">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              {data.exact_match ? "Exact product captured" : `${data.count} result(s)`}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 capitalize">
                {data.mode} search
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                Sort: {(SORTS.find((s) => s.value === data.sort_by) || {}).label || data.sort_by}
              </Badge>
            </div>
          </div>
          {data.count === 0 ? (
            <p className="text-sm text-slate-500" data-testid="no-results">
              No products match the current filters. Try removing a filter.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.results.map((p) => (
                <ProductCard
                  key={p.product_id}
                  p={p}
                  onImport={onImport}
                  isolate={isolate}
                  setIsolate={setIsolate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!data && (
        <div className="mt-12 text-center text-slate-500" data-testid="discovery-empty">
          <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-3 text-sm">Run a search above to see supplier products from the NIPS-AI Cloud catalog.</p>
        </div>
      )}
    </div>
  );
}
