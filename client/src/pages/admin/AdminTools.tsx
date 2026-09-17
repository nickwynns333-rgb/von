import { useState } from "react";
import PageShell from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Flag, Activity, BarChart3, Search, RefreshCw, CheckCircle, XCircle , Wrench } from "lucide-react";

export default function AdminTools() {
  const [logSearch, setLogSearch] = useState("");
  const [logFeature, setLogFeature] = useState("");

  // Feature Flags
  const { data: flags, refetch: refetchFlags } = trpc.adminTools.listFlags.useQuery();
  const toggleFlag = trpc.adminTools.toggleFlag.useMutation({
    onSuccess: () => { refetchFlags(); toast.success("Flag updated"); },
    onError: (e) => toast.error(e.message),
  });

  // AI Logs
  const { data: logStats } = trpc.adminTools.aiLogStats.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.adminTools.listAiLogs.useQuery({
    limit: 100,
    feature: logFeature || undefined,
  });

  const filteredLogs = (logs ?? []).filter((l) =>
    !logSearch || l.model.toLowerCase().includes(logSearch.toLowerCase()) || (l.feature ?? "").includes(logSearch)
  );

  return (
    <PageShell title="Admin Tools" subtitle="System utilities, diagnostics, and platform management tools" icon={<Wrench className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Tools</h1>
          <p className="text-muted-foreground text-sm">Feature flags, AI interaction logs, and platform monitoring</p>
        </div>
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">
            <Flag className="w-4 h-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="ai-logs">
            <Activity className="w-4 h-4 mr-2" />
            AI Interaction Logs
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            LLM Stats
          </TabsTrigger>
        </TabsList>

        {/* Feature Flags */}
        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Feature Flags</CardTitle>
              <p className="text-sm text-muted-foreground">
                Toggle features on/off per role or globally without redeployment.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flag Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Allowed Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Toggle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(flags ?? []).map((flag) => (
                    <TableRow key={flag.name}>
                      <TableCell className="font-mono text-xs">{flag.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{flag.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {flag.allowedRoles
                            ? flag.allowedRoles.map((r) => (
                                <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                              ))
                            : <span className="text-xs text-muted-foreground">all</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {flag.enabled ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Enabled</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) =>
                            toggleFlag.mutate({
                              name: flag.name,
                              enabled: checked,
                              allowedRoles: flag.allowedRoles ?? undefined,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Interaction Logs */}
        <TabsContent value="ai-logs" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by model or feature..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Filter by feature (e.g. chat)"
              value={logFeature}
              onChange={(e) => setLogFeature(e.target.value)}
              className="w-48"
            />
            <Button variant="outline" size="icon" onClick={() => refetchLogs()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No AI interactions logged yet. Interactions will appear here as users chat with agents.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[160px] truncate">{log.model}</TableCell>
                        <TableCell>
                          {log.feature && <Badge variant="outline" className="text-xs">{log.feature}</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">{(log.totalTokens ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">${parseFloat(String(log.costUsd ?? 0)).toFixed(6)}</TableCell>
                        <TableCell className="text-sm">{log.creditsDeducted ?? 0}</TableCell>
                        <TableCell className="text-sm">{log.latencyMs ? `${log.latencyMs}ms` : "—"}</TableCell>
                        <TableCell>
                          {log.success === 1 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <span title={log.errorMessage ?? ""}><XCircle className="w-4 h-4 text-red-500" /></span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM Stats */}
        <TabsContent value="stats" className="space-y-4">
          {logStats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Total Calls", value: logStats.totalCalls.toLocaleString() },
                  { label: "Total Tokens", value: logStats.totalTokens.toLocaleString() },
                  { label: "Total Cost", value: `$${logStats.totalCost.toFixed(4)}` },
                  { label: "Credits Used", value: logStats.totalCredits.toLocaleString() },
                  { label: "Success Rate", value: `${(logStats.successRate * 100).toFixed(1)}%` },
                  { label: "Avg Latency", value: `${Math.round(logStats.avgLatency)}ms` },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold mt-1">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Calls by Model</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(logStats.byModel)
                        .sort((a, b) => b[1].calls - a[1].calls)
                        .slice(0, 10)
                        .map(([model, data]) => (
                          <div key={model} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-xs truncate max-w-[200px]">{model}</span>
                            <div className="flex gap-3 text-muted-foreground text-xs">
                              <span>{data.calls} calls</span>
                              <span>{data.tokens.toLocaleString()} tokens</span>
                              <span>${data.cost.toFixed(4)}</span>
                            </div>
                          </div>
                        ))}
                      {Object.keys(logStats.byModel).length === 0 && (
                        <p className="text-sm text-muted-foreground">No data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Calls by Feature</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(logStats.byFeature)
                        .sort((a, b) => b[1] - a[1])
                        .map(([feature, count]) => (
                          <div key={feature} className="flex items-center justify-between text-sm">
                            <Badge variant="outline" className="text-xs">{feature}</Badge>
                            <span className="text-muted-foreground text-xs">{count} calls</span>
                          </div>
                        ))}
                      {Object.keys(logStats.byFeature).length === 0 && (
                        <p className="text-sm text-muted-foreground">No data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
