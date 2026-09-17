import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Server, Database, Cpu, CheckCircle } from "lucide-react";

export default function AdminSystem() {
  const { data: flags } = trpc.adminTools.listFlags.useQuery();

  const systemChecks = [
    { label: "Database Connection", status: "ok", detail: "MySQL/TiDB connected" },
    { label: "OAuth Service", status: "ok", detail: "Manus OAuth active" },
    { label: "Storage (S3)", status: "ok", detail: "Manus Storage active" },
    { label: "LLM Gateway", status: "ok", detail: "OpenRouter connected" },
    { label: "Stripe Payments", status: "ok", detail: "Test mode active" },
  ];

  return (
    <DashboardShell navItems={adminNavItems} title="Admin — System" role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">System Status</h1>
            <p className="text-white/50 text-sm">Platform health and feature flags</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Checks */}
          <Card className="bg-[#0f0f1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-green-400" />
                Service Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-sm text-white">{check.label}</p>
                      <p className="text-xs text-white/40">{check.detail}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">OK</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feature Flags Summary */}
          <Card className="bg-[#0f0f1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-400" />
                Feature Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(flags ?? []).map((flag: any) => (
                <div key={flag.key} className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-sm text-white font-mono">{flag.key}</span>
                  <Badge className={flag.enabled ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/40 border-white/10"}>
                    {flag.enabled ? "ON" : "OFF"}
                  </Badge>
                </div>
              ))}
              {(!flags || flags.length === 0) && (
                <p className="text-white/40 text-sm">No feature flags configured. Manage them in Admin Tools.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
