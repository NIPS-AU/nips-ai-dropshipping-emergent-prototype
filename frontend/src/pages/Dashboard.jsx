import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Cloud, KeyRound, Inbox, Package, Sparkles, Search } from "lucide-react";
import { formatDate } from "@/lib/format";

function Kpi({ label, value, icon: Icon, hint, tone = "blue", testid }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Card data-testid={testid} className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-display font-bold text-slate-900">{value}</p>
            {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
          </div>
          <div className={`w-10 h-10 grid place-items-center rounded-xl ${toneMap[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: endpoints.dashboardStats,
    refetchInterval: 15_000,
  });

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        testid="dashboard-header"
        title="Dashboard"
        description="Overview of your NIPS-AI Dropshipping Cloud connection, license and dropshipping pipeline."
        actions={
          <>
            <Button asChild variant="outline" data-testid="dashboard-cta-discovery">
              <Link to="/discovery">
                <Search className="w-4 h-4 mr-2" />
                Find products
              </Link>
            </Button>
            <Button asChild data-testid="dashboard-cta-imports" className="bg-blue-600 hover:bg-blue-700">
              <Link to="/imports">
                Open Import List
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Kpi
          testid="kpi-cloud"
          label="Cloud Connection"
          value={data?.cloud?.status === "connected" ? "Connected" : isLoading ? "…" : "Offline"}
          hint={data ? `${data.cloud.endpoint} · ${data.cloud.latency_ms}ms` : "—"}
          tone="emerald"
          icon={Cloud}
        />
        <Kpi
          testid="kpi-license"
          label="License"
          value={data?.license?.plan || "—"}
          hint={data?.license?.key}
          tone="blue"
          icon={KeyRound}
        />
        <Kpi
          testid="kpi-drafts"
          label="Import Drafts"
          value={data?.counters?.import_drafts ?? 0}
          hint="Stored on customer site in production"
          tone="amber"
          icon={Inbox}
        />
        <Kpi
          testid="kpi-published"
          label="Published (mock)"
          value={data?.counters?.published_mock ?? 0}
          hint="Mock WooCommerce drafts created"
          tone="slate"
          icon={Package}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-900">Recent activity</h2>
              <Button asChild variant="ghost" size="sm" data-testid="dashboard-view-logs">
                <Link to="/logs">
                  View all
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.recent_activity || []).length === 0 && (
                <p className="text-sm text-slate-500 py-6">
                  No activity yet. Try a product search or import an AliExpress URL to get started.
                </p>
              )}
              {(data?.recent_activity || []).map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{log.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.created_at)}</p>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 capitalize">
                    {log.kind?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="font-display text-xl font-semibold text-slate-900">Quick start</h2>
            </div>
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">1</span>
                <span>Paste an AliExpress product URL in <Link to="/discovery" className="text-blue-600 hover:underline">Product Discovery</Link>.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">2</span>
                <span>Click <em>Import to List</em> to save the exact product as a draft.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">3</span>
                <span>Open the draft in <em>Product Studio</em>, run AI rewrites, then mock-publish.</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
