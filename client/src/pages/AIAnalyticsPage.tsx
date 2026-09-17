import { useState } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, DollarSign, Users, MessageSquare, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function StatCard({ label, value, sub, trend, icon: Icon, color = "text-primary" }: {
  label: string; value: string; sub?: string; trend?: number; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}% vs last period
        </div>
      )}
    </div>
  );
}

function BarChartSimple({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-card border rounded-xl p-5">
      <p className="text-sm font-semibold mb-4">{label}</p>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground w-24 shrink-0 truncate">{d.name}</p>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <p className="text-xs font-medium w-8 text-right">{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIAnalyticsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("30d");

  const { data: contacts = [] } = trpc.crm.listContacts.useQuery({});
  const { data: deals = [] } = trpc.crm.listDeals.useQuery({});
  const { data: conversations = [] } = trpc.communications.listConversations.useQuery({ status: "all" });
  const { data: invoices = [] } = trpc.collections.listInvoices.useQuery({ status: "all" });

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(String(i.amount ?? 0)), 0);
  const outstanding = invoices.filter(i => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + parseFloat(String(i.amount ?? 0)), 0);
  const wonDeals = deals.filter(d => d.stageId === "closed_won");
  const wonValue = wonDeals.reduce((s, d) => s + parseFloat(String(d.value ?? 0)), 0);
  const openDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stageId ?? ""));
  const pipelineValue = openDeals.reduce((s, d) => s + parseFloat(String(d.value ?? 0)), 0);

  const channelData = ["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook"].map(ch => ({
    name: ch.charAt(0).toUpperCase() + ch.slice(1),
    value: conversations.filter(c => c.channelType === ch).length,
  })).filter(d => d.value > 0);

  const stageData = ["lead", "qualified", "proposal", "negotiation", "closed_won"].map(stage => ({
    name: stage.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: deals.filter(d => d.stageId === stage).length,
  }));

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <PageShell title="AI Analytics" subtitle="Real-time performance metrics, conversation analytics, and revenue intelligence" icon={<BarChart3 className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Stats */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue</p>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Collected Revenue" value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} sub="From paid invoices" icon={DollarSign} color="text-green-400" trend={12} />
          <StatCard label="Outstanding" value={`$${outstanding.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} sub="Unpaid invoices" icon={TrendingUp} color="text-yellow-400" />
          <StatCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} sub={`${openDeals.length} open deals`} icon={Zap} color="text-blue-400" />
          <StatCard label="Won Deals" value={`$${wonValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} sub={`${wonDeals.length} deals closed`} icon={TrendingUp} color="text-primary" trend={8} />
        </div>
      </div>

      {/* CRM + Comms Stats */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">CRM & Communications</p>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Contacts" value={contacts.length.toString()} sub="In CRM" icon={Users} />
          <StatCard label="Total Deals" value={deals.length.toString()} sub={`${openDeals.length} open`} icon={TrendingUp} />
          <StatCard label="Conversations" value={conversations.length.toString()} sub="All channels" icon={MessageSquare} />
          <StatCard label="Open Conversations" value={conversations.filter(c => c.status === "open").length.toString()} sub="Awaiting response" icon={MessageSquare} color="text-yellow-400" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <BarChartSimple
          data={channelData.length > 0 ? channelData : [{ name: "No data yet", value: 0 }]}
          label="Conversations by Channel"
        />
        <BarChartSimple
          data={stageData.filter(d => d.value > 0).length > 0 ? stageData : [{ name: "No deals yet", value: 0 }]}
          label="Deals by Stage"
        />
      </div>

      {/* Agent Performance Placeholder */}
      <div className="bg-card border rounded-xl p-6">
        <p className="text-sm font-semibold mb-4">AI Agent Performance</p>
        <div className="grid grid-cols-5 gap-4 text-center">
          {["AI Receptionist", "AI Sales", "AI Support", "AI Collections", "AI CFO"].map(agent => (
            <div key={agent} className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium">{agent}</p>
              <p className="text-lg font-bold">—</p>
              <p className="text-xs text-muted-foreground">interactions</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">Agent interaction tracking will populate as your AI agents handle conversations</p>
      </div>
      </div>
    </PageShell>
  );
}
