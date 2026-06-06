import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { endpoints } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import {
  ArrowLeft, ExternalLink, Sparkles, Loader2, Check, Undo2, CloudUpload, Truck, Tag, Box, FileCode2,
} from "lucide-react";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "images", label: "Images" },
  { value: "variants", label: "Variants" },
  { value: "shipping", label: "Shipping" },
  { value: "specs", label: "Specs & Attributes" },
  { value: "description", label: "Description" },
  { value: "seo", label: "SEO" },
  { value: "raw", label: "Raw Payload" },
];

function AIButton({ field, draftId, onResult, label = "AI Rewrite" }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      data-testid={`ai-rewrite-${field}`}
      className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true);
          const res = await endpoints.aiRewrite({ draft_id: draftId, field });
          onResult(res);
          toast.success("AI suggestion ready", { description: `Field: ${field}` });
        } catch (e) {
          toast.error("AI rewrite failed", { description: e?.response?.data?.detail || e?.message });
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
      {label}
    </Button>
  );
}

export default function ProductStudio() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: draft, isLoading, error } = useQuery({
    queryKey: ["draft", draftId],
    queryFn: () => endpoints.getImport(draftId),
    enabled: !!draftId,
  });

  // local field state
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState("overview");
  const [aiResult, setAiResult] = useState(null); // { field, suggestion }
  const [publishMode, setPublishMode] = useState("draft");
  const [showPublish, setShowPublish] = useState(false);
  const [publishLog, setPublishLog] = useState(null);

  useEffect(() => {
    if (draft) {
      setForm({
        title: draft.title || "",
        description: draft.description || "",
        retail_price: draft.retail_price ?? 0,
        category: draft.category || "",
        tags: (draft.tags || []).join(", "),
        seo_title: draft.studio_edits?.seo_title || draft.title || "",
        seo_meta_description: draft.studio_edits?.seo_meta_description || "",
      });
    }
  }, [draft]);

  const save = useMutation({
    mutationFn: (payload) => endpoints.patchImport(draftId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["draft", draftId] });
      qc.invalidateQueries({ queryKey: ["imports"] });
      toast.success("Draft saved");
    },
    onError: (e) => toast.error("Save failed", { description: e?.message }),
  });

  const publish = useMutation({
    mutationFn: () => endpoints.publish({ draft_id: draftId, publish_mode: publishMode }),
    onSuccess: (log) => {
      setPublishLog(log);
      qc.invalidateQueries({ queryKey: ["draft", draftId] });
      qc.invalidateQueries({ queryKey: ["imports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Mock-published as WooCommerce ${log.publish_mode}`, {
        description: `WC product #${log.wc_product_id}`,
      });
    },
    onError: (e) => toast.error("Publish failed", { description: e?.response?.data?.detail || e?.message }),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading draft…</p>;
  if (error)
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-sm text-red-700">
          Draft not found. <Link to="/imports" className="underline">Back to Import List</Link>
        </CardContent>
      </Card>
    );
  if (!draft || !form) return null;

  const onSave = () => {
    const payload = {
      title: form.title,
      description: form.description,
      retail_price: Number(form.retail_price) || 0,
      category: form.category,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      seo_title: form.seo_title,
      seo_meta_description: form.seo_meta_description,
    };
    save.mutate(payload);
  };

  const applyAI = () => {
    if (!aiResult) return;
    const { field, suggestion } = aiResult;
    if (field === "title") setForm({ ...form, title: suggestion.trim() });
    else if (field === "description") setForm({ ...form, description: suggestion });
    else if (field === "seo_title") setForm({ ...form, seo_title: suggestion.trim() });
    else if (field === "seo_meta_description") setForm({ ...form, seo_meta_description: suggestion.trim() });
    else if (field === "tags") {
      try {
        const arr = JSON.parse(suggestion);
        setForm({ ...form, tags: Array.isArray(arr) ? arr.join(", ") : suggestion });
      } catch {
        setForm({ ...form, tags: suggestion });
      }
    } else if (field === "category") setForm({ ...form, category: suggestion.trim() });
    setAiResult(null);
    toast.success(`Applied AI suggestion to ${field}`);
  };

  const variants = draft.variants || [];
  const profit = (Number(form.retail_price) || 0) - (Number(draft.price) || 0);

  return (
    <div data-testid="studio-page" className="fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
        <Link to="/imports" className="hover:text-blue-600 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Import List
        </Link>
        <span>/</span>
        <span className="text-slate-700">Product Studio</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 truncate">
            {form.title}
          </h1>
          <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-slate-500">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono">{draft.sku}</Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono">ID {draft.product_id}</Badge>
            {draft.is_variant_draft && <Badge className="bg-indigo-600 text-white">Isolated variant</Badge>}
            <a href={draft.supplier_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-blue-600">
              Supplier URL <ExternalLink className="w-3 h-3" />
            </a>
            {draft.publish_status === "published" && (
              <Badge className="bg-emerald-600 text-white">Published as WC #{draft.wc_product_id}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSave} disabled={save.isPending} data-testid="studio-save">
            {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save draft
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="studio-publish-open"
            onClick={() => setShowPublish(true)}
          >
            <CloudUpload className="w-4 h-4 mr-2" />
            Publish to WooCommerce
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left rail summary */}
        <Card className="col-span-12 lg:col-span-4 border-slate-200 shadow-sm h-fit lg:sticky lg:top-6">
          <CardContent className="p-5 space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={draft.main_image} alt={draft.title} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-400">Supplier price</p>
                <p className="text-lg font-display font-bold text-slate-900">
                  {formatCurrency(draft.price, draft.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-400">Retail price</p>
                <p className="text-lg font-display font-bold text-blue-700">
                  {formatCurrency(form.retail_price, draft.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 col-span-2">
                <p className="text-[11px] uppercase tracking-widest text-emerald-700">Profit estimate</p>
                <p className="text-xl font-display font-bold text-emerald-700">
                  {formatCurrency(profit, draft.currency)}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />{draft.shipping?.method} · {draft.shipping?.estimated_delivery}</div>
              <div className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5" />Stock: {draft.stock?.toLocaleString?.()}</div>
              <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />{draft.category}</div>
              <div>Supplier: <span className="text-slate-700">{draft.supplier?.name}</span> · ★ {draft.supplier?.rating}</div>
            </div>
          </CardContent>
        </Card>

        {/* Right work area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-white border border-slate-200 p-1 rounded-xl overflow-x-auto whitespace-nowrap flex-nowrap justify-start max-w-full">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  data-testid={`tab-${t.value}`}
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Title</Label>
                      <AIButton field="title" draftId={draftId} onResult={setAiResult} />
                    </div>
                    <Input
                      data-testid="studio-title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Retail price ({draft.currency})</Label>
                      <Input
                        data-testid="studio-retail"
                        type="number"
                        step="0.01"
                        value={form.retail_price}
                        onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Supplier price (read-only)</Label>
                      <Input value={draft.price} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Category</Label>
                      <AIButton field="category" draftId={draftId} onResult={setAiResult} label="Suggest" />
                    </div>
                    <Input
                      data-testid="studio-category"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tags (comma separated)</Label>
                      <AIButton field="tags" draftId={draftId} onResult={setAiResult} label="Suggest tags" />
                    </div>
                    <Input
                      data-testid="studio-tags"
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">
                    Gallery ({(draft.gallery_images || []).length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(draft.gallery_images || []).map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {i === 0 && <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-[10px]">Featured</Badge>}
                      </div>
                    ))}
                  </div>
                  {(draft.description_images || []).length > 0 && (
                    <>
                      <p className="text-xs uppercase tracking-widest text-slate-400 mt-6 mb-3">
                        Description images
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(draft.description_images || []).map((src, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variants" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  {variants.length === 0 && <p className="text-sm text-slate-500">No variants on this draft.</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {variants.map((v) => (
                      <div key={v.variant_id} className="rounded-xl border border-slate-200 overflow-hidden flex">
                        <div className="w-24 h-24 bg-slate-100 shrink-0">
                          <img src={v.image} alt={v.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{v.title}</p>
                          <p className="text-xs text-slate-500 font-mono truncate">{v.sku}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-base font-display font-bold text-blue-600">{formatCurrency(v.price)}</span>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">Stock {v.stock}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 grid grid-cols-2 gap-4 text-sm">
                  <Info label="Has shipping" value={draft.shipping?.has_shipping ? "Yes" : "No"} />
                  <Info label="Method" value={draft.shipping?.method || "—"} />
                  <Info label="From → To" value={`${draft.shipping?.from_country} → ${draft.shipping?.to_country}`} />
                  <Info label="Shipping price" value={draft.shipping?.price ? formatCurrency(draft.shipping.price) : "Free"} />
                  <Info label="Estimated delivery" value={draft.shipping?.estimated_delivery || "—"} />
                  <Info label="Stock" value={draft.stock?.toLocaleString?.()} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specs" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg text-slate-900">Specifications</h3>
                      <AIButton field="specs" draftId={draftId} onResult={setAiResult} label="Clean up" />
                    </div>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {(draft.specifications || []).map((s, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                          <span className="text-slate-500">{s.name}</span>
                          <span className="text-slate-800 font-medium">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg text-slate-900">Attributes</h3>
                      <AIButton field="attributes" draftId={draftId} onResult={setAiResult} label="Clean up" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(draft.attributes || []).map((a, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                          <p className="text-xs uppercase tracking-widest text-slate-400">{a.name}</p>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {a.values.map((v, j) => (
                              <Badge key={j} variant="secondary" className="bg-blue-50 text-blue-700">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="description" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <AIButton field="description" draftId={draftId} onResult={setAiResult} label="AI cleanup" />
                  </div>
                  <Textarea
                    data-testid="studio-description"
                    rows={14}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="font-mono text-xs"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>SEO title</Label>
                      <AIButton field="seo_title" draftId={draftId} onResult={setAiResult} />
                    </div>
                    <Input
                      data-testid="studio-seo-title"
                      value={form.seo_title}
                      onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta description</Label>
                      <AIButton field="seo_meta_description" draftId={draftId} onResult={setAiResult} />
                    </div>
                    <Textarea
                      data-testid="studio-seo-meta"
                      rows={3}
                      value={form.seo_meta_description}
                      onChange={(e) => setForm({ ...form, seo_meta_description: e.target.value })}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-widest text-slate-400">Search preview</p>
                    <p className="text-base text-blue-700 mt-1 truncate">{form.seo_title || form.title}</p>
                    <p className="text-xs text-emerald-700">https://your-store.com/product/{(form.title||"").toLowerCase().replace(/\s+/g,"-").slice(0,40)}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {form.seo_meta_description || form.description?.slice(0, 155)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
                    <FileCode2 className="w-4 h-4" /> Debug-only — never inserted into product description.
                  </div>
                  <pre className="raw-payload" data-testid="raw-payload">{JSON.stringify(draft, null, 2)}</pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* AI suggestion preview */}
      <Dialog open={!!aiResult} onOpenChange={(o) => !o && setAiResult(null)}>
        <DialogContent className="max-w-2xl" data-testid="ai-preview-dialog">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI suggestion — {aiResult?.field}
            </DialogTitle>
            <DialogDescription>
              Review the suggestion before applying. You can always undo by editing the field manually.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 max-h-72 overflow-auto whitespace-pre-wrap text-sm">
            {aiResult?.suggestion}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiResult(null)} data-testid="ai-discard">
              <Undo2 className="w-4 h-4 mr-2" /> Discard
            </Button>
            <Button onClick={applyAI} className="bg-blue-600 hover:bg-blue-700" data-testid="ai-apply">
              <Check className="w-4 h-4 mr-2" /> Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog */}
      <Dialog open={showPublish} onOpenChange={(o) => { setShowPublish(o); if (!o) setPublishLog(null); }}>
        <DialogContent className="max-w-xl" data-testid="publish-dialog">
          <DialogHeader>
            <DialogTitle>Publish to WooCommerce (mock)</DialogTitle>
            <DialogDescription>
              This prototype simulates WooCommerce publishing. In production this calls the WordPress plugin to create the product on the customer's store.
            </DialogDescription>
          </DialogHeader>
          {!publishLog ? (
            <div className="space-y-3">
              <Label>Publish mode</Label>
              <Select value={publishMode} onValueChange={setPublishMode}>
                <SelectTrigger data-testid="publish-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">WooCommerce draft (recommended)</SelectItem>
                  <SelectItem value="simple">Simple product</SelectItem>
                  <SelectItem value="variable">Variable product</SelectItem>
                  <SelectItem value="isolated_variants">Isolated variants</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Import List draft is preserved until publish succeeds.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Badge className="bg-emerald-600 text-white">Created WC product #{publishLog.wc_product_id}</Badge>
              <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                {publishLog.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
          <DialogFooter>
            {!publishLog ? (
              <>
                <Button variant="outline" onClick={() => setShowPublish(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="publish-confirm"
                  onClick={() => publish.mutate()}
                  disabled={publish.isPending}
                >
                  {publish.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
                  Confirm publish
                </Button>
              </>
            ) : (
              <Button onClick={() => { setShowPublish(false); setPublishLog(null); navigate("/imports"); }} data-testid="publish-done">Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-1">{value}</p>
    </div>
  );
}
