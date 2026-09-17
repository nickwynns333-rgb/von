import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customerNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { Wallet, Database, Phone, MessageSquare, Download, Info, TrendingUp, Users, Calendar, Zap } from "lucide-react";
import { toast } from "sonner";

function UsageMeter({ label, used, total, icon, color }: { label: string; used: number | string; total: number | string; icon: React.ReactNode; color: string }) {
  const pct = typeof used === "number" && typeof total === "number" && total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
            <span className="font-semibold text-gray-800 text-sm">{label}</span>
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Info className="w-4 h-4" /></button>
        </div>
        {typeof used === "string" ? (
          <div className="text-2xl font-bold text-gray-900 mb-1">{used}</div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-1">{used.toLocaleString()} out of {total.toLocaleString()} used</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${color.replace("bg-", "bg-").replace("/10", "").replace("text-", "bg-")}`} style={{ width: `${pct}%`, background: color.includes("blue") ? "#2563eb" : color.includes("green") ? "#16a34a" : color.includes("purple") ? "#9333ea" : "#0891b2" }} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const STAT_CARDS = [
  { key: "totalConversations", label: "Total conversations" },
  { key: "totalMessages", label: "Total Messages" },
  { key: "avgMessagesPerConversation", label: "Avg Messages per Conversation" },
  { key: "leadsCaptured", label: "Leads captured" },
  { key: "appointmentsScheduled", label: "Appointments Scheduled" },
  { key: "inputTokens", label: "Input Tokens" },
  { key: "outputTokens", label: "Output Tokens" },
];

export default function ResourceDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [dateRange, setDateRange] = useState("current_month");
  const [comparison, setComparison] = useState("none");
  const [subAccountFilter, setSubAccountFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"resources" | "tokens">("resources");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const creditsQuery = trpc.credits.balance.useQuery(undefined, { enabled: !!isAuthenticated });
  const agentsQuery = trpc.agents.list.useQuery(undefined, { enabled: !!isAuthenticated });
  // usageQuery removed - credits.usage not in router

  const agents = agentsQuery.data ?? [];
  const chatAgents = agents.filter((a: any) => a.type === "chat");
  const voiceAgents = agents.filter((a: any) => a.type === "receptionist" || a.type === "outbound_caller");
  const balance = creditsQuery.data?.balance ?? 0;
  const usedCredits = creditsQuery.data?.lifetimeUsed ?? 0;

  // Compute character storage from usage logs
  const totalCharsUsed = creditsQuery.data?.lifetimeUsed ?? 0;
  const totalCharsLimit = 124_170_000;

  const handleExport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Conversations", "0"],
      ["Total Messages", "0"],
      ["Avg Messages/Conversation", "0"],
      ["Leads Captured", "0"],
      ["Appointments Scheduled", "0"],
      ["Input Tokens", "0"],
      ["Output Tokens", "0"],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vonwork-performance-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Performance report exported");
  };

  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <DashboardShell navItems={customerNavItems} title="Dashboard" role="customer">
      <div className="space-y-6">
        {/* Resource Dashboard header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Resource Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track usage and tokens across your AI platform</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("resources")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "resources" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              Resources
            </button>
            <button
              onClick={() => setActiveTab("tokens")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "tokens" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              Tokens
            </button>
          </div>
        </div>

        {/* Usage meters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageMeter
            label="Wallet Usage"
            used={`Available Balance: $${(balance / 100).toFixed(2)}`}
            total={0}
            icon={<Wallet className="w-4 h-4 text-blue-600" />}
            color="bg-blue-500/10 text-blue-600"
          />
          <UsageMeter
            label="Storage (Characters)"
            used={totalCharsUsed}
            total={totalCharsLimit}
            icon={<Database className="w-4 h-4 text-cyan-600" />}
            color="bg-cyan-500/10 text-cyan-600"
          />
          <UsageMeter
            label="Voice Agents"
            used={voiceAgents.length}
            total={20}
            icon={<Phone className="w-4 h-4 text-purple-600" />}
            color="bg-purple-500/10 text-purple-600"
          />
          <UsageMeter
            label="Chat Agents"
            used={chatAgents.length}
            total={20}
            icon={<MessageSquare className="w-4 h-4 text-green-600" />}
            color="bg-green-500/10 text-green-600"
          />
        </div>

        {/* Performance Overview */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Performance Overview</h3>
                <p className="text-sm text-gray-500">Insights into your AI platform's interaction and engagement metrics</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Current Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={comparison} onValueChange={setComparison}>
                  <SelectTrigger className="w-36 h-8 text-xs bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Comparison</SelectItem>
                    <SelectItem value="previous_period">Previous Period</SelectItem>
                    <SelectItem value="previous_year">Previous Year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={subAccountFilter} onValueChange={setSubAccountFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white border-gray-300">
                    <SelectValue placeholder="Filter Sub Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub Accounts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white border-gray-300">
                    <SelectValue placeholder="Filter Chat Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chat Agents</SelectItem>
                    {agents.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleExport} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
                  <Download className="w-3 h-3" /> Export
                </Button>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 divide-x divide-y sm:divide-y-0 divide-gray-100">
            {[
              { label: "Total conversations", value: 0, icon: <MessageSquare className="w-4 h-4 text-blue-500" /> },
              { label: "Total Messages", value: 0, icon: <Zap className="w-4 h-4 text-cyan-500" /> },
              { label: "Avg Messages per Conversation", value: 0, icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
              { label: "Leads captured", value: 0, icon: <Users className="w-4 h-4 text-purple-500" /> },
              { label: "Appointments Scheduled", value: 0, icon: <Calendar className="w-4 h-4 text-orange-500" /> },
              { label: "Input Tokens", value: 0, icon: <Database className="w-4 h-4 text-gray-500" /> },
              { label: "Output Tokens", value: 0, icon: <Database className="w-4 h-4 text-gray-400" /> },
            ].map((stat) => (
              <div key={stat.label} className="p-4 text-center">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Chat Agents", href: "/dashboard/agents", icon: <MessageSquare className="w-5 h-5 text-blue-600" />, count: chatAgents.length },
            { label: "Voice Agents", href: "/telephony", icon: <Phone className="w-5 h-5 text-purple-600" />, count: voiceAgents.length },
            { label: "Knowledge Bases", href: "/knowledge", icon: <Database className="w-5 h-5 text-cyan-600" />, count: 0 },
            { label: "Credits Balance", href: "/dashboard/credits", icon: <Wallet className="w-5 h-5 text-green-600" />, count: `$${(balance / 100).toFixed(2)}` },
          ].map((item) => (
            <a key={item.label} href={item.href} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                {item.icon}
              </div>
              <div>
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="text-lg font-bold text-gray-900">{item.count}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
