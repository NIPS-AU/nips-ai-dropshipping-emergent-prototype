import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Package2 } from "lucide-react";

export default function Releases() {
  const { data: releases = [], isLoading } = useQuery({ queryKey: ["releases"], queryFn: endpoints.releases });

  return (
    <div data-testid="releases-page">
      <PageHeader
        title="Plugin Releases"
        description="Mock release server. In production this is served by updates.nipsau.com and integrates with WordPress plugin update transients."
        testid="releases-header"
      />

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="space-y-3">
        {releases.map((r) => (
          <Card key={r.version} className="border-slate-200 shadow-sm" data-testid={`release-${r.version}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
                <Package2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-slate-900">v{r.version}</span>
                  {r.is_latest && <Badge className="bg-emerald-600 text-white">Latest</Badge>}
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 capitalize">{r.channel}</Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">{r.notes}</p>
                <p className="text-xs text-slate-400 mt-1">Released {r.released_at} · {r.size_kb} KB</p>
              </div>
              <Button asChild variant="outline" data-testid={`release-download-${r.version}`}>
                <a href={r.download_url} target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
