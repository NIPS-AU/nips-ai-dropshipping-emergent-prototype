import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { endpoints } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Save } from "lucide-react";

const TOGGLES = [
  { key: "title_rewrite", label: "AI title rewrite", hint: "Cleaner, shorter, benefit-led titles." },
  { key: "description_cleanup", label: "AI description cleanup", hint: "Removes supplier slang and broken phrasing." },
  { key: "seo_title", label: "SEO title generator", hint: "≤ 60 characters, search-friendly." },
  { key: "seo_meta_description", label: "SEO meta description", hint: "≤ 155 characters, single line." },
  { key: "tags_suggest", label: "Tag suggestions", hint: "Generates 6-10 high-intent tags." },
  { key: "category_suggest", label: "Category suggestion", hint: "Recommends a WooCommerce category path." },
  { key: "attributes_cleanup", label: "Attributes cleanup", hint: "Normalises attribute names/values." },
  { key: "specs_cleanup", label: "Specifications cleanup", hint: "Standardises spec names and units." },
  { key: "translate_enabled", label: "Translate / localize", hint: "Translate fields to a target language." },
];

export default function AISettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ai-settings"], queryFn: endpoints.aiSettings });
  const [state, setState] = useState(null);

  useEffect(() => { if (data) setState({ ...data }); }, [data]);

  const save = useMutation({
    mutationFn: (body) => endpoints.saveAISettings(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("AI settings saved");
    },
  });

  if (isLoading || !state) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div data-testid="ai-settings-page">
      <PageHeader
        title="AI Settings"
        description="The store owner always stays in control. AI runs only when toggled on and you click the rewrite buttons inside Product Studio."
        testid="ai-settings-header"
        actions={
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="ai-save"
            onClick={() => save.mutate(state)}
            disabled={save.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save settings
          </Button>
        }
      />

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="font-display text-lg text-slate-900">Feature toggles</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {TOGGLES.map((t) => (
              <div key={t.key} className="py-4 flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.hint}</p>
                </div>
                <Switch
                  data-testid={`toggle-${t.key}`}
                  checked={!!state[t.key]}
                  onCheckedChange={(v) => setState({ ...state, [t.key]: v })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm mt-6">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Default model</Label>
            <Input
              data-testid="ai-model"
              value={state.default_model}
              onChange={(e) => setState({ ...state, default_model: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">OpenAI model id. Default: <code>gpt-5.2</code>.</p>
          </div>
          <div>
            <Label>Default language</Label>
            <Input
              data-testid="ai-language"
              value={state.default_language}
              onChange={(e) => setState({ ...state, default_language: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">ISO-639 code, e.g. <code>en</code>, <code>es</code>, <code>de</code>.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
