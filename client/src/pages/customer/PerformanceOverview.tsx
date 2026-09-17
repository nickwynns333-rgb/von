import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { customerNavItems, DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Phone,
  Bot,
  Zap,
  Users,
  Calendar,
  Download,
  RefreshCw,
  Target,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";

// ─── Mini bar chart component ─────────────────────────────────────────────────
function MiniBarChart({ data, color = "#22d3ee" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.7 + (i / data.length) * 0.3 }}
        />
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  iconColor,
  sparkData,
  sparkColor,
}: {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
  sparkData?: number[];
  sparkColor?: string;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card className="bg-[#0f0f1a] border-white/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
        <div className="text-xs text-white/40">{label}</div>
        {changeLabel && <div className="text-xs text-white/20 mt-0.5">{changeLabel}</div>}
        {sparkData && (
          <div className="mt-3">
            <MiniBarChart data={sparkData} color={sparkColor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Horizontal bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/40">{value.toLocaleString()}</span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PerformanceOverview() {
  const { isAuthenticated, loading } = useAuth();
  const [dateRange, setDateRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const agentsQuery = trpc.agents.list.useQuery(undefined, { enabled: !!isAuthenticated });
  const creditsQuery = trpc.credits.balance.useQuery(undefined, { enabled: !!isAuthenticated });

  const agents = (agentsQuery.data ?? []) as any[];
  const chatAgents = agents.filter((a: any) => a.type === "chat" || a.type === "customer_service" || a.type === "sales_closer");
  const voiceAgents = agents.filter((a: any) => a.type === "receptionist" || a.type === "outbound_caller" || a.type === "appointment_setter");

  // Simulated sparkline data (would come from real analytics in production)
  const weekSpark = [12, 18, 15, 22, 19, 28, 31];
  const callSpark = [5, 8, 6, 11, 9, 14, 12];
  const creditSpark = [200, 350, 280, 420, 380, 510, 460];

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardShell navItems={customerNavItems} title="Performance Overview" role="customer">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Performance Overview</h2>
            <p className="text-white/40 text-sm mt-1">Track your AI agents, campaigns, and platform usage</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                <SelectItem value="7d" className="text-white">Last 7 days</SelectItem>
                <SelectItem value="30d" className="text-white">Last 30 days</SelectItem>
                <SelectItem value="90d" className="text-white">Last 90 days</SelectItem>
                <SelectItem value="current_month" className="text-white">This month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-white/60 hover:text-white bg-transparent"
              onClick={() => { agentsQuery.refetch(); creditsQuery.refetch(); }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Overview</TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Agents</TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Campaigns</TabsTrigger>
            <TabsTrigger value="credits" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Credits</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total Conversations"
                value="—"
                change={12}
                changeLabel="vs last period"
                icon={<MessageSquare className="w-4 h-4" />}
                iconColor="bg-green-500/10 text-green-400"
                sparkData={weekSpark}
                sparkColor="#4ade80"
              />
              <StatCard
                label="AI Calls Made"
                value="—"
                change={8}
                changeLabel="vs last period"
                icon={<Phone className="w-4 h-4" />}
                iconColor="bg-cyan-500/10 text-cyan-400"
                sparkData={callSpark}
                sparkColor="#22d3ee"
              />
              <StatCard
                label="Credits Used"
                value={(creditsQuery.data?.lifetimeUsed ?? 0).toLocaleString()}
                icon={<Zap className="w-4 h-4" />}
                iconColor="bg-violet-500/10 text-violet-400"
                sparkData={creditSpark}
                sparkColor="#a78bfa"
              />
              <StatCard
                label="Active Agents"
                value={agents.length}
                icon={<Bot className="w-4 h-4" />}
                iconColor="bg-orange-500/10 text-orange-400"
              />
            </div>

            {/* Agent breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#0f0f1a] border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/70">Agent Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HBar label="Chat Agents" value={chatAgents.length} max={Math.max(agents.length, 1)} color="#4ade80" />
                  <HBar label="Voice Agents" value={voiceAgents.length} max={Math.max(agents.length, 1)} color="#22d3ee" />
                  <HBar label="Video Sales Agents" value={agents.filter((a: any) => a.type === "video_sales").length} max={Math.max(agents.length, 1)} color="#a78bfa" />
                  <HBar label="Appointment Setters" value={agents.filter((a: any) => a.type === "appointment_setter").length} max={Math.max(agents.length, 1)} color="#f472b6" />
                </CardContent>
              </Card>

              <Card className="bg-[#0f0f1a] border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-white/70">Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Credit Balance", value: (creditsQuery.data?.balance ?? 0).toLocaleString(), status: (creditsQuery.data?.balance ?? 0) > 100 ? "good" : "warn" },
                    { label: "Active Chat Agents", value: chatAgents.length.toString(), status: chatAgents.length > 0 ? "good" : "neutral" },
                    { label: "Active Voice Agents", value: voiceAgents.length.toString(), status: voiceAgents.length > 0 ? "good" : "neutral" },
                    { label: "Knowledge Bases", value: "—", status: "neutral" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                      <span className="text-sm text-white/50">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{row.value}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          row.status === "good" ? "bg-green-400" :
                          row.status === "warn" ? "bg-yellow-400" : "bg-white/20"
                        }`} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <Card className="bg-gradient-to-br from-cyan-500/5 to-violet-500/5 border-cyan-500/10">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "View Usage Details", href: "/dashboard/usage", icon: <BarChart3 className="w-4 h-4" /> },
                    { label: "Buy Credits", href: "/dashboard/credits", icon: <Zap className="w-4 h-4" /> },
                    { label: "Create Agent", href: "/dashboard/agents", icon: <Bot className="w-4 h-4" /> },
                    { label: "Launch Campaign", href: "/dashboard/data-marketplace", icon: <Target className="w-4 h-4" /> },
                  ].map((a) => (
                    <a
                      key={a.href}
                      href={a.href}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-all"
                    >
                      {a.icon} {a.label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4">
            <div className="space-y-3">
              {agents.length === 0 ? (
                <Card className="bg-[#0f0f1a] border-white/5">
                  <CardContent className="py-12 text-center">
                    <Bot className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">No agents created yet</p>
                    <a href="/dashboard/agents" className="text-cyan-400 text-xs hover:underline mt-2 inline-block">Create your first agent →</a>
                  </CardContent>
                </Card>
              ) : (
                agents.map((agent: any) => (
                  <Card key={agent.id} className="bg-[#0f0f1a] border-white/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{agent.name}</div>
                            <div className="text-xs text-white/40 capitalize">{agent.type?.replace("_", " ")}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-white/40">Conversations</div>
                            <div className="text-sm font-medium text-white">—</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-white/40">Avg Rating</div>
                            <div className="text-sm font-medium text-white flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400" /> —
                            </div>
                          </div>
                          <Badge className="text-xs border-0 bg-green-500/20 text-green-400">Active</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-4">
            <Card className="bg-[#0f0f1a] border-white/5">
              <CardContent className="py-12 text-center">
                <Target className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Campaign analytics coming soon</p>
                <p className="text-white/20 text-xs mt-1">Launch a campaign from the Data Marketplace to see stats here</p>
                <a href="/dashboard/data-marketplace" className="text-cyan-400 text-xs hover:underline mt-2 inline-block">Go to Data Marketplace →</a>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Current Balance"
                value={(creditsQuery.data?.balance ?? 0).toLocaleString()}
                icon={<Zap className="w-4 h-4" />}
                iconColor="bg-cyan-500/10 text-cyan-400"
              />
              <StatCard
                label="Lifetime Used"
                value={(creditsQuery.data?.lifetimeUsed ?? 0).toLocaleString()}
                icon={<TrendingUp className="w-4 h-4" />}
                iconColor="bg-violet-500/10 text-violet-400"
              />
              <StatCard
                label="Lifetime Purchased"
                value={(creditsQuery.data?.lifetimePurchased ?? 0).toLocaleString()}
                icon={<BarChart3 className="w-4 h-4" />}
                iconColor="bg-green-500/10 text-green-400"
              />
            </div>
            <Card className="bg-[#0f0f1a] border-white/5">
              <CardContent className="py-10 text-center">
                <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Detailed credit transaction history</p>
                <a href="/dashboard/credits" className="text-cyan-400 text-xs hover:underline mt-2 inline-block">View full credit history →</a>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
