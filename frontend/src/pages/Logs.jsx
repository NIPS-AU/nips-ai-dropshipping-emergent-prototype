import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Trash2, ScrollText } from "lucide-react";
import { toast } from "sonner";

export default function Logs() {
  const qc = useQueryClient();
  const { data: logs = [], isLoading } = useQuery({ queryKey: ["logs"], queryFn: endpoints.logs, refetchInterval: 15_000 });

  const clear = useMutation({
    mutationFn: endpoints.clearLogs,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      toast.success(`Cleared ${res.deleted} log entries`);
    },
  });

  return (
    <div data-testid="logs-page">
      <PageHeader
        title="Activity Logs"
        description="All actions across discovery, imports, AI rewrites, publishes and maintenance."
        testid="logs-header"
        actions={
          <Button variant="outline" data-testid="logs-clear" onClick={() => clear.mutate()}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear logs
          </Button>
        }
      />

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">When</th>
                <th className="text-left px-6 py-3 font-semibold">Kind</th>
                <th className="text-left px-6 py-3 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">Loading…</td></tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                    <ScrollText className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="mt-2">No activity yet.</p>
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                  <td className="px-6 py-3">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 capitalize">
                      {l.kind?.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-slate-800">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
