import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bot, Zap, BarChart3, Plus, Play, Copy, Trash2,
  MessageSquare, Phone, Video, Calendar, Headphones, TrendingUp,
  ExternalLink, Info, Download,
} from "lucide-react";

const AGENT_TYPE_CONFIG = {
  receptionist: { label: "AI Receptionist", icon: <Phone className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
  outbound_caller: { label: "Outbound Caller", icon: <Phone className="w-4 h-4" />, color: "text-orange-600", bg: "bg-orange-50" },
  video_sales: { label: "Video Sales Agent", icon: <Video className="w-4 h-4" />, color: "text-violet-600", bg: "bg-violet-50" },
  chat: { label: "Chat Agent", icon: <MessageSquare className="w-4 h-4" />, color: "text-green-600", bg: "bg-green-50" },
  appointment_setter: { label: "Appointment Setter", icon: <Calendar className="w-4 h-4" />, color: "text-pink-600", bg: "bg-pink-50" },
  customer_service: { label: "Customer Service", icon: <Headphones className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
  sales_closer: { label: "Sales Closer", icon: <TrendingUp className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50" },
};

export default function CustomerDashboard() {
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);
  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto bg-[#F5F7FA] min-h-full">
      {/* Resource Dashboard */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Resource Dashboard</h2>
            <p className="text-sm text-muted-foreground">Track usage and tokens across your AI platform</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-primary font-medium">Resources</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Tokens</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceCard icon={<Zap className="w-5 h-5 text-primary" />} label="Wallet Usage" />
          <StorageCard />
          <VoiceAgentsCard />
          <ChatAgentsCard />
        </div>
      </section>

      {/* Performance Overview */}
      <section>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Performance Overview</h2>
              <p className="text-sm text-muted-foreground">Insights into your AI platform's interaction and engagement metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="month">
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Current Month</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Download className="w-3 h-3" /> Export
              </Button>
            </div>
          </div>
          <PerformanceMetrics />
        </div>
      </section>

      {/* Agents + Credits side-by-side */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AgentsPanel />
        </div>
        <div className="space-y-4">
          <CreditPacksPanel />
        </div>
      </section>
    </div>
    </DashboardLayout>
  );
}

// ─── Resource Cards ───────────────────────────────────────────────────────────

function ResourceCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  const creditsQuery = trpc.credits.balance.useQuery();
  const balance = creditsQuery.data?.balance ?? 0;
  const used = creditsQuery.data?.lifetimeUsed ?? 0;
  const total = balance + used;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon} {label}
        </div>
        <button className="text-muted-foreground hover:text-foreground"><Info className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-1">Available Balance: ${(balance / 100).toFixed(2)}</p>
      <p className="text-xs text-muted-foreground mb-3">${(used / 100).toFixed(2)} out of ${(total / 100).toFixed(2)} used</p>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StorageCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BarChart3 className="w-5 h-5 text-primary" /> Storage (Characters)
        </div>
        <button className="text-muted-foreground hover:text-foreground"><Info className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-1">Used Characters</p>
      <p className="text-xs text-muted-foreground mb-3">0 out of 124.17M used</p>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: "0%" }} />
      </div>
    </div>
  );
}

function VoiceAgentsCard() {
  const agentsQuery = trpc.agents.list.useQuery();
  const voiceCount = (agentsQuery.data ?? []).filter(a => a.type === "receptionist" || a.type === "outbound_caller").length;
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Phone className="w-5 h-5 text-primary" /> Voice Agents
        </div>
        <button className="text-muted-foreground hover:text-foreground"><Info className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-1">Used Voice Agents</p>
      <p className="text-xs text-muted-foreground mb-3">{voiceCount} out of 20 used</p>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(voiceCount / 20) * 100}%` }} />
      </div>
    </div>
  );
}

function ChatAgentsCard() {
  const agentsQuery = trpc.agents.list.useQuery();
  const chatCount = (agentsQuery.data ?? []).filter(a => a.type === "chat" || a.type === "customer_service").length;
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="w-5 h-5 text-primary" /> Chat Agents
        </div>
        <button className="text-muted-foreground hover:text-foreground"><Info className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-1">Used Chat Agents</p>
      <p className="text-xs text-muted-foreground mb-3">{chatCount} out of 20 used</p>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(chatCount / 20) * 100}%` }} />
      </div>
    </div>
  );
}

// ─── Performance Metrics ──────────────────────────────────────────────────────

function PerformanceMetrics() {
  const metrics = [
    { label: "Total conversations", value: "0" },
    { label: "Total Messages", value: "0" },
    { label: "Avg Messages per Conversation", value: "0" },
    { label: "Leads captured", value: "0" },
    { label: "Appointments Scheduled", value: "0" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map(m => (
        <div key={m.label} className="bg-background border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{m.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Agents Panel ─────────────────────────────────────────────────────────────

function AgentsPanel() {
  const agentsQuery = trpc.agents.list.useQuery();
  const deleteMutation = trpc.agents.delete.useMutation({
    onSuccess: () => { toast.success("Agent removed"); agentsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            My AI Agents ({(agentsQuery.data ?? []).length} / 20)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your AI agents and connect them to your channels</p>
        </div>
        <CreateAgentDialog onCreated={() => agentsQuery.refetch()} />
      </div>
      <div className="p-5">
        {agentsQuery.isLoading ? (
          <div className="text-muted-foreground text-sm">Loading agents...</div>
        ) : (agentsQuery.data ?? []).length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No agents yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first AI agent to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {(agentsQuery.data ?? []).map((agent) => {
              const config = AGENT_TYPE_CONFIG[agent.type as keyof typeof AGENT_TYPE_CONFIG] ?? AGENT_TYPE_CONFIG.chat;
              return (
                <div key={agent.id} className="agent-card group">
                  <div className="agent-card-header">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bg}`}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div>
                        <p className="agent-card-title">{agent.name}</p>
                        <p className={`text-xs ${config.color}`}>{config.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/agent/${agent.shareableSlug}`);
                          toast.success("Link copied!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        onClick={() => deleteMutation.mutate({ id: agent.id })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="agent-card-model">
                      {agent.model.split("/").pop()?.split(":")[0] ?? agent.model}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <AgentChatButton agent={agent} />
                      <button
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          window.open(`/agent/${agent.shareableSlug}`, "_blank");
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Chat Button ────────────────────────────────────────────────────────

function AgentChatButton({ agent }: { agent: { id: number; name: string; type: string } }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const chatMutation = trpc.agents.chat.useMutation({
    onSuccess: (data) => {
      setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
      setMessage("");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMessage = () => {
    if (!message.trim()) return;
    setHistory((h) => [...h, { role: "user", content: message }]);
    chatMutation.mutate({ agentId: agent.id, message, history });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs gap-1">
          <Play className="w-3 h-3" /> Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chat with {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-80">
          <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-secondary/30 rounded-lg mb-3">
            {history.length === 0 && (
              <p className="text-muted-foreground text-sm text-center pt-8">Send a message to test your agent</p>
            )}
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border px-3 py-2 rounded-xl">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
            />
            <Button onClick={sendMessage} disabled={chatMutation.isPending || !message.trim()}>
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Agent Dialog ──────────────────────────────────────────────────────

function CreateAgentDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "chat" as keyof typeof AGENT_TYPE_CONFIG,
    systemPrompt: "",
    personality: "professional",
    tone: "friendly",
  });

  const createMutation = trpc.agents.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Agent created! Share link: /agent/${data.slug}`);
      setOpen(false);
      setForm({ name: "", type: "chat", systemPrompt: "", personality: "professional", tone: "friendly" });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="w-3.5 h-3.5" /> New Chat Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create AI Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="form-grid-2">
            <div className="space-y-1.5">
              <Label>Agent Name *</Label>
              <Input
                placeholder="e.g. Sarah — Sales Closer"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Agent Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as keyof typeof AGENT_TYPE_CONFIG }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>System Prompt</Label>
            <Textarea
              placeholder="You are a helpful AI assistant for..."
              value={form.systemPrompt}
              onChange={(e) => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
              rows={4}
            />
          </div>
          <div className="form-grid-2">
            <div className="space-y-1.5">
              <Label>Personality</Label>
              <Select value={form.personality} onValueChange={(v) => setForm(f => ({ ...f, personality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["professional", "friendly", "empathetic", "assertive", "casual"].map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={form.tone} onValueChange={(v) => setForm(f => ({ ...f, tone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["friendly", "formal", "casual", "persuasive", "empathetic"].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Credit Packs Panel ───────────────────────────────────────────────────────

function CreditPacksPanel() {
  const [, navigate] = useLocation();
  const packs = [
    { label: "Starter Pack", credits: "1,000 credits", price: "$9.00" },
    { label: "Growth Pack", credits: "5,000 credits", price: "$39.00" },
    { label: "Power Pack", credits: "15,000 credits", price: "$99.00" },
    { label: "Enterprise Pack", credits: "50,000 credits", price: "$299.00" },
  ];
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Buy Credits
        </h3>
      </div>
      <div className="p-4 space-y-2">
        {packs.map(p => (
          <div key={p.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.credits}</p>
            </div>
            <Button size="sm" className="h-7 text-xs" onClick={() => navigate("/credits")}>
              {p.price}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
