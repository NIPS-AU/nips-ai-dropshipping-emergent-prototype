import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, KeyRound, Shield, Trash2, History } from "lucide-react";
import { toast } from "sonner";

export default function CloudSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["license"], queryFn: endpoints.licenseStatus });

  const maint = useMutation({
    mutationFn: endpoints.maintenance,
    onSuccess: (res) => {
      toast.success(`Cleared: ${Object.keys(res.deleted).join(", ") || "nothing"}`);
      qc.invalidateQueries();
    },
  });

  return (
    <div data-testid="cloud-page">
      <PageHeader
        title="Cloud & License"
        description="License status, cloud connection and maintenance tools. In production this also configures the WordPress plugin updater."
        testid="cloud-header"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <h2 className="font-display text-lg text-slate-900">Cloud connection</h2>
              <Badge className="ml-auto bg-emerald-600 text-white">Online</Badge>
            </div>
            <Row label="API endpoint" value="https://api.nipsau.com" />
            <Row label="Updates endpoint" value="https://updates.nipsau.com" />
            <Row label="Plugin version (prototype)" value="2.9.6-prototype" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <h2 className="font-display text-lg text-slate-900">License</h2>
              <Badge className="ml-auto bg-blue-600 text-white">{data?.plan || "—"}</Badge>
            </div>
            <Row label="Key" value={data?.key || "—"} mono />
            <Row label="Domain" value={data?.domain || "—"} />
            <Row label="Issued" value={data?.issued_at || "—"} />
            <Row label="Expires" value={data?.expires_at || "—"} />
            <Row label="Features" value={(data?.features || []).join(", ")} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm mt-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-amber-600" />
            <h2 className="font-display text-lg text-slate-900">Maintenance tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MaintBtn label="Clear search history" target="history" onClick={(t) => maint.mutate(t)} icon={History} />
            <MaintBtn label="Clear Import List drafts" target="drafts" onClick={(t) => maint.mutate(t)} icon={Trash2} />
            <MaintBtn label="Clear activity logs" target="logs" onClick={(t) => maint.mutate(t)} icon={Trash2} />
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Maintenance only clears prototype data. Published WooCommerce products are always preserved.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm mt-6">
        <CardContent className="p-6 text-sm text-slate-600 space-y-2">
          <h2 className="font-display text-lg text-slate-900">Production architecture map</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>WordPress plugin</strong> (PHP) on customer site: stores Import List drafts, search history, studio edits, WooCommerce product links.</li>
            <li><strong>NIPS-AI Cloud API</strong> on your VPS (Node.js/Express + PostgreSQL, behind Nginx, Dockerised): license validation, supplier API proxy, AI rewrites, release server.</li>
            <li><strong>Release server</strong> at <code>updates.nipsau.com</code>: serves plugin ZIPs from <code>/opt/nips-ai-dropshipping-cloud/storage/releases</code>.</li>
            <li><strong>Customer data</strong> always stays on the WordPress site unless cloud sync is explicitly enabled.</li>
          </ul>
          <p className="pt-2 text-xs text-slate-500">
            Full developer handoff document: <code className="font-mono">/app/HANDOFF.md</code> — covers data model mapping, scoring port, publish flow, release server and rate-limiting recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function MaintBtn({ label, target, onClick, icon: Icon }) {
  return (
    <Button
      variant="outline"
      data-testid={`maint-${target}`}
      onClick={() => onClick(target)}
      className="justify-start"
    >
      <Icon className="w-4 h-4 mr-2" /> {label}
    </Button>
  );
}
