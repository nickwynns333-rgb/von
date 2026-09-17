import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, DollarSign, Bot, TrendingUp } from "lucide-react";

export default function AdminAnalytics() {
  const { data: users } = trpc.admin.users.useQuery({ limit: 200, offset: 0 });
  const { data: aiLogStats } = trpc.adminTools.aiLogStats.useQuery();

  const totalUsers = users?.length ?? 0;
  const adminCount = users?.filter((u: any) => u.role === "admin").length ?? 0;
  const agencyCount = users?.filter((u: any) => u.role === "agency").length ?? 0;
  const userCount = totalUsers - adminCount - agencyCount;

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Agency Accounts", value: agencyCount, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Standard Users", value: userCount, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "AI Calls (Total)", value: (aiLogStats as any)?.totalCalls ?? 0, icon: Bot, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Avg Latency (ms)", value: Math.round((aiLogStats as any)?.avgLatencyMs ?? 0), icon: BarChart3, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Total Tokens Used", value: ((aiLogStats as any)?.totalTokens ?? 0).toLocaleString(), icon: DollarSign, color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <DashboardShell navItems={adminNavItems} title="Admin — Analytics" role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
            <p className="text-white/50 text-sm">Real-time platform usage and performance metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-[#0f0f1a] border-white/10">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-white/50 text-xs mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Breakdown */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Standard Users", count: userCount, total: totalUsers, color: "bg-blue-500" },
                { label: "Agency Accounts", count: agencyCount, total: totalUsers, color: "bg-violet-500" },
                { label: "Admins", count: adminCount, total: totalUsers, color: "bg-red-500" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{row.label}</span>
                    <span className="text-gray-800 font-medium">{row.count}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.color} rounded-full transition-all duration-500`}
                      style={{ width: row.total > 0 ? `${(row.count / row.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Usage by Model */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">AI Usage by Model</CardTitle>
          </CardHeader>
          <CardContent>
            {(aiLogStats as any)?.byModel && Object.keys((aiLogStats as any).byModel).length > 0 ? (
              <div className="space-y-2">
                {Object.entries((aiLogStats as any).byModel).map(([model, count]: [string, any]) => (
                  <div key={model} className="flex items-center justify-between p-2 rounded bg-white/5">
                    <span className="text-sm text-white font-mono truncate">{model}</span>
                    <span className="text-cyan-400 font-bold text-sm">{count} calls</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm">No AI usage data yet. Usage will appear here as users interact with agents.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
