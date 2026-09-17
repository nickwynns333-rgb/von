import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, Brain, Eye } from "lucide-react";

export default function AdminModels() {
  const { data: models, isLoading } = trpc.admin.openRouterModels.useQuery();

  const getModelIcon = (id: string) => {
    if (id.includes("claude")) return <Brain className="w-4 h-4 text-violet-400" />;
    if (id.includes("gpt") || id.includes("o1") || id.includes("o3")) return <Zap className="w-4 h-4 text-green-400" />;
    if (id.includes("gemini")) return <Eye className="w-4 h-4 text-blue-400" />;
    return <Bot className="w-4 h-4 text-cyan-400" />;
  };

  const getProviderColor = (id: string) => {
    if (id.includes("anthropic") || id.includes("claude")) return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    if (id.includes("openai") || id.includes("gpt") || id.includes("o1")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (id.includes("google") || id.includes("gemini")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (id.includes("meta") || id.includes("llama")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-white/10 text-white/60 border-white/10";
  };

  return (
    <DashboardShell navItems={adminNavItems} title="Admin — AI Models" role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Models</h1>
            <p className="text-white/50 text-sm">
              {isLoading ? "Loading..." : `${(models as any[])?.length ?? 0} models available via OpenRouter`}
            </p>
          </div>
        </div>

        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">Available Models</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-white/40">Loading models...</div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {((models as any[]) ?? []).map((model: any) => (
                  <div key={model.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className="flex-shrink-0">{getModelIcon(model.id)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{model.name ?? model.id}</p>
                      <p className="text-xs text-white/40 truncate font-mono">{model.id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {model.context_length && (
                        <Badge className="bg-white/10 text-white/50 border-white/10 text-xs">
                          {(model.context_length / 1000).toFixed(0)}k ctx
                        </Badge>
                      )}
                      <Badge className={`border text-xs ${getProviderColor(model.id)}`}>
                        {model.id.split("/")[0] ?? "unknown"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
