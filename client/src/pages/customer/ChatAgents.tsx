import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Settings, Trash2, Copy, Bot,
  Headphones, TrendingUp, Search, ExternalLink,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

const CHAT_TYPES = [
  { id: "chat", label: "Chat Agent", desc: "General-purpose chat agent for websites and apps", icon: <MessageSquare className="w-5 h-5" /> },
  { id: "customer_service", label: "Customer Service", desc: "Handles support tickets, FAQs, and escalations", icon: <Headphones className="w-5 h-5" /> },
  { id: "sales_closer", label: "Sales Closer", desc: "Engages visitors, qualifies leads, closes deals", icon: <TrendingUp className="w-5 h-5" /> },
];

const AGENT_COLORS: Record<string, { text: string; bg: string; badge: string }> = {
  chat: { text: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-700" },
  customer_service: { text: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  sales_closer: { text: "text-amber-600", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700" },
};

export default function ChatAgents() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState("chat");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("openai/gpt-4o");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const agentsQuery = trpc.agents.list.useQuery(undefined, { enabled: !!isAuthenticated });
  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Chat agent created");
      setCreateOpen(false);
      resetForm();
      agentsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.agents.delete.useMutation({
    onSuccess: () => { toast.success("Agent deleted"); agentsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const allAgents = (agentsQuery.data ?? []) as any[];
  const chatAgents = allAgents.filter((a: any) =>
    ["chat", "customer_service", "sales_closer"].includes(a.type)
  );
  const filtered = chatAgents.filter((a: any) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || a.type === filterType;
    return matchSearch && matchType;
  });

  function resetForm() {
    setName(""); setAgentType("chat"); setSystemPrompt(""); setModel("openai/gpt-4o");
  }

  function handleCreate() {
    if (!name.trim()) { toast.error("Agent name is required"); return; }
    createMutation.mutate({
      name: name.trim(),
      type: agentType as any,
      systemPrompt: systemPrompt || `You are a helpful AI assistant named ${name}. Be friendly, concise, and professional.`,
      model,
    });
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Chat Agents</h1>
            <p className="text-sm text-white/70 mt-0.5">Deploy AI chat agents on your website, app, or any channel</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-white/90 font-semibold gap-1.5">
                <Plus className="w-4 h-4" /> New Chat Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Chat Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Agent Type</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {CHAT_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setAgentType(t.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          agentType === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 bg-background"
                        }`}
                      >
                        <div className={`mt-0.5 ${agentType === t.id ? "text-primary" : "text-muted-foreground"}`}>
                          {t.icon}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${agentType === t.id ? "text-primary" : "text-foreground"}`}>
                            {t.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Agent Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Bot, Sales Assistant" />
                </div>
                <div className="space-y-1.5">
                  <Label>AI Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai/gpt-4o">GPT-4o (Recommended)</SelectItem>
                      <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                      <SelectItem value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="x-ai/grok-3">GROK-3</SelectItem>
                      <SelectItem value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>System Prompt (optional)</Label>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Describe how this agent should behave..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Agent"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: chatAgents.length, icon: <Bot className="w-4 h-4 text-primary" /> },
          { label: "Chat", value: chatAgents.filter((a: any) => a.type === "chat").length, icon: <MessageSquare className="w-4 h-4 text-green-600" /> },
          { label: "Support", value: chatAgents.filter((a: any) => a.type === "customer_service").length, icon: <Headphones className="w-4 h-4 text-blue-600" /> },
          { label: "Sales", value: chatAgents.filter((a: any) => a.type === "sales_closer").length, icon: <TrendingUp className="w-4 h-4 text-amber-600" /> },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="customer_service">Support</SelectItem>
            <SelectItem value="sales_closer">Sales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agents Grid */}
      {agentsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-16 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">
            {search ? "No agents match your search" : "No chat agents yet"}
          </p>
          {!search && (
            <>
              <p className="text-muted-foreground text-sm mt-1">Create your first AI chat agent to get started</p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" /> Create Chat Agent
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent: any) => {
            const colors = AGENT_COLORS[agent.type] ?? { text: "text-muted-foreground", bg: "bg-secondary", badge: "bg-secondary text-muted-foreground" };
            return (
              <div key={agent.id} className="agent-card group">
                <div className="agent-card-header">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                      <MessageSquare className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="agent-card-title">{agent.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        {agent.type?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                </div>

                {agent.systemPrompt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-3">
                    {agent.systemPrompt}
                  </p>
                )}

                <p className="agent-card-model mt-2">
                  Model: {agent.model ?? "GPT-4o"}
                </p>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                  >
                    <Settings className="w-3 h-3" /> Configure
                  </Button>
                  <button
                    className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(agent.id.toString());
                      toast.success("Agent ID copied");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => window.open(`/agent/${agent.shareableSlug}`, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    onClick={() => {
                      if (confirm("Delete this agent?")) deleteMutation.mutate({ id: agent.id });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
