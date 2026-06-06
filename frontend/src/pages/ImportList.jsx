import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, truncate } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useState } from "react";
import { ExternalLink, FileText, Trash2, Inbox, PenSquare, Eye, Truck, Layers } from "lucide-react";

function DraftCard({ d, onPreview, onDelete }) {
  return (
    <Card
      data-testid={`draft-card-${d.draft_id}`}
      className="border-slate-200 shadow-sm overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <img src={d.main_image} alt={d.title} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {d.is_variant_draft && (
            <Badge className="bg-indigo-600 text-white">Variant draft</Badge>
          )}
          <Badge className="bg-white text-slate-700 border border-slate-200">
            {(d.gallery_images || []).length} images
          </Badge>
        </div>
        {d.publish_status === "published" && (
          <Badge className="absolute bottom-3 right-3 bg-emerald-600 text-white">
            Published #{d.wc_product_id}
          </Badge>
        )}
      </div>
      <CardContent className="p-5 flex-1 flex flex-col gap-3">
        <h3 className="text-base font-medium text-slate-900 line-clamp-2 leading-snug">{d.title}</h3>

        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-slate-500">
          <div>SKU<br /><span className="font-mono text-slate-700">{truncate(d.sku, 24)}</span></div>
          <div>Product ID<br /><span className="font-mono text-slate-700">{d.product_id}</span></div>
          <div>Variants<br /><span className="text-slate-700">{(d.variants || []).length}</span></div>
          <div>Stock<br /><span className="text-slate-700">{d.stock?.toLocaleString?.() || "—"}</span></div>
        </div>

        <div className="flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <div className="text-lg font-display font-bold text-blue-600">
              {formatCurrency(d.price, d.currency)}
            </div>
            <div className="text-[11px] text-slate-500">
              Retail {formatCurrency(d.retail_price, d.currency)} · profit{" "}
              <span className="text-emerald-700 font-semibold">{formatCurrency(d.profit_estimate, d.currency)}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            <div className="flex items-center gap-1 justify-end"><Truck className="w-3 h-3" /> {d.shipping?.estimated_delivery || "—"}</div>
            <div>{d.supplier?.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 flex-1" data-testid={`open-studio-${d.draft_id}`}>
            <Link to={`/studio/${d.draft_id}`}>
              <PenSquare className="w-3.5 h-3.5 mr-2" /> Open in Studio
            </Link>
          </Button>
          <Button size="sm" variant="outline" data-testid={`preview-payload-${d.draft_id}`} onClick={() => onPreview(d)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" data-testid={`delete-draft-${d.draft_id}`} onClick={() => onDelete(d)}>
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
          <span>Created {formatDate(d.created_at)}</span>
          <a href={d.supplier_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-blue-600">
            Supplier <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImportList() {
  const qc = useQueryClient();
  const { data: drafts = [], isLoading } = useQuery({ queryKey: ["imports"], queryFn: endpoints.listImports });
  const [preview, setPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const del = useMutation({
    mutationFn: (id) => endpoints.deleteImport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["imports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Draft deleted — WooCommerce products preserved");
      setConfirmDelete(null);
    },
  });

  const clearAll = useMutation({
    mutationFn: endpoints.clearImports,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["imports"] });
      toast.success(`Cleared ${res.deleted} draft(s)`);
    },
  });

  return (
    <div data-testid="imports-page">
      <PageHeader
        title="Import List"
        description="Temporary supplier drafts waiting for review. Deleting a draft never touches your published WooCommerce products."
        testid="imports-header"
        actions={
          <>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {drafts.length} draft(s)
            </Badge>
            {drafts.length > 0 && (
              <Button
                variant="outline"
                data-testid="imports-clear-all"
                onClick={() => clearAll.mutate()}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear unpublished
              </Button>
            )}
          </>
        }
      />

      {isLoading && <p className="text-sm text-slate-500">Loading drafts…</p>}

      {!isLoading && drafts.length === 0 && (
        <Card className="border-dashed border-slate-300 bg-white">
          <CardContent className="py-16 text-center">
            <Inbox className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="mt-3 font-display text-lg text-slate-800">No drafts yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Find a supplier product and click <em>Import to List</em> to save it here.
            </p>
            <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700" data-testid="imports-empty-discovery">
              <Link to="/discovery">Open Product Discovery</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {drafts.map((d) => (
          <DraftCard
            key={d.draft_id}
            d={d}
            onPreview={setPreview}
            onDelete={setConfirmDelete}
          />
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl" data-testid="preview-payload-dialog">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-4 h-4" /> Raw Payload — debug preview
            </DialogTitle>
            <DialogDescription>
              For debugging only. This raw payload is never inserted into product descriptions.
            </DialogDescription>
          </DialogHeader>
          <pre className="raw-payload">{preview ? JSON.stringify(preview, null, 2) : ""}</pre>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent data-testid="delete-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>
              The Import List draft will be removed from the prototype database.
              Any WooCommerce product already published from this draft is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              data-testid="confirm-delete-btn"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => del.mutate(confirmDelete.draft_id)}
            >
              Delete draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
