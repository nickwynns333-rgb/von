import { trpc } from "@/lib/trpc";
import { DashboardShell, agencyNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Bot, TrendingUp } from "lucide-react";

export default function AgencyAnalytics() {
  const { data: clients } = trpc.agency.clients.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();

  const totalClients = (clients ?? []).length;
  const totalAgents = (agents ?? []).length;

  const stats = [
    { label: "Total Clients", value: totalClients, icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Active Agents", value: totalAgents, icon: Bot, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Conversations (30d)", value: "—", icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Revenue (30d)", value: "—", icon: BarChart3, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <DashboardShell navItems={agencyNavItems} title="Agency — Analytics" role="agency">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Agency Analytics</h1>
            <p className="text-white/50 text-sm">Performance metrics across all your clients</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">Client Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {totalClients === 0 ? (
              <div className="p-6 text-center text-white/40">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No clients yet. Invite clients to see their activity here.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {(clients ?? []).map((client: any) => (
                  <div key={client.id} className="flex items-center gap-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      {(client.name ?? client.email ?? "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{client.name ?? client.email}</p>
                    </div>
                    <p className="text-xs text-white/30">Active</p>
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
