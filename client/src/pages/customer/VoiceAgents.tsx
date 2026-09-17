import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Phone, PhoneIncoming, PhoneOutgoing, Plus, Settings, Trash2,
  Bot, Zap, Calendar, Copy, ExternalLink, Mic,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

const VOICE_TYPES = [
  { id: "receptionist", label: "AI Receptionist", desc: "Handles inbound calls, answers questions, routes callers", icon: <PhoneIncoming className="w-5 h-5" /> },
  { id: "outbound_caller", label: "Outbound Caller", desc: "Makes outbound calls for campaigns, follow-ups, reminders", icon: <PhoneOutgoing className="w-5 h-5" /> },
  { id: "appointment_setter", label: "Appointment Setter", desc: "Books appointments and manages calendar scheduling", icon: <Calendar className="w-5 h-5" /> },
];

const VOICE_OPTIONS = [
  { id: "alloy", label: "Alloy (Neutral)" },
  { id: "echo", label: "Echo (Male)" },
  { id: "fable", label: "Fable (British)" },
  { id: "onyx", label: "Onyx (Deep Male)" },
  { id: "nova", label: "Nova (Female)" },
  { id: "shimmer", label: "Shimmer (Soft Female)" },
];

const TYPE_COLORS: Record<string, { text: string; bg: string; badge: string }> = {
  receptionist: { text: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  outbound_caller: { text: "text-orange-600", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700" },
  appointment_setter: { text: "text-pink-600", bg: "bg-pink-50", badge: "bg-pink-100 text-pink-700" },
};

export default function VoiceAgents() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState("receptionist");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [voice, setVoice] = useState("nova");
  const [greeting, setGreeting] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const agentsQuery = trpc.agents.list.useQuery(undefined, { enabled: !!isAuthenticated });
  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Voice agent created");
      setCreateOpen(false);
      resetForm();
      agentsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.agents.delete.useMutation({
    onSuccess: () => { toast.success("Agent deleted"); agentsQuery.refetch(); setSelectedAgent(null); },
    onError: (e) => toast.error(e.message),
  });

  const allAgents = (agentsQuery.data ?? []) as any[];
  const voiceAgents = allAgents.filter((a: any) =>
    ["receptionist", "outbound_caller", "appointment_setter"].includes(a.type)
  );
  const filtered = activeTab === "all" ? voiceAgents : voiceAgents.filter((a: any) => a.type === activeTab);

  function resetForm() {
    setName(""); setAgentType("receptionist"); setSystemPrompt(""); setVoice("nova"); setGreeting(""); setIsActive(true);
  }

  function handleCreate() {
    if (!name.trim()) { toast.error("Agent name is required"); return; }
    createMutation.mutate({
      name: name.trim(),
      type: agentType as any,
      systemPrompt: systemPrompt || `You are a professional AI ${agentType.replace("_", " ")} named ${name}. Be helpful, concise, and professional.`,
      model: "openai/gpt-4o",
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
            <h1 className="text-xl font-semibold text-white">Voice Agents</h1>
            <p className="text-sm text-white/70 mt-0.5">AI-powered phone agents for inbound reception, outbound campaigns, and appointment booking</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-white/90 font-semibold gap-1.5">
                <Plus className="w-4 h-4" /> New Voice Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Voice Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Agent Type</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {VOICE_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setAgentType(t.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          agentType === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className={`mt-0.5 ${agentType === t.id ? "text-primary" : "text-muted-foreground"}`}>{t.icon}</div>
                        <div>
                          <div className={`text-sm font-medium ${agentType === t.id ? "text-primary" : "text-foreground"}`}>{t.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="space-y-1.5">
                    <Label>Agent Name *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dental Receptionist" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Voice</Label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Greeting Message</Label>
                  <Input value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Thank you for calling! How can I help?" />
                </div>
                <div className="space-y-1.5">
                  <Label>System Prompt (optional)</Label>
                  <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Describe how this agent should behave..." rows={3} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Active immediately</Label>
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
          { label: "Total Agents", value: voiceAgents.length, icon: <Bot className="w-4 h-4 text-primary" /> },
          { label: "Active", value: voiceAgents.filter((a: any) => a.isActive).length, icon: <Zap className="w-4 h-4 text-green-600" /> },
          { label: "Inbound", value: voiceAgents.filter((a: any) => a.type === "receptionist").length, icon: <PhoneIncoming className="w-4 h-4 text-blue-600" /> },
          { label: "Outbound", value: voiceAgents.filter((a: any) => a.type === "outbound_caller").length, icon: <PhoneOutgoing className="w-4 h-4 text-orange-600" /> },
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

      {/* Tab nav */}
      <div className="tab-nav">
        {[
          { id: "all", label: "All Agents" },
          { id: "receptionist", label: "Receptionists" },
          { id: "outbound_caller", label: "Outbound" },
          { id: "appointment_setter", label: "Appointment" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`tab-nav-item ${activeTab === t.id ? "active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main content: table + right panel */}
      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden">
          {agentsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No voice agents yet</p>
              <p className="text-muted-foreground text-sm mt-1">Create your first AI voice agent to get started</p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" /> Create Voice Agent
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Model</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent: any) => {
                  const colors = TYPE_COLORS[agent.type] ?? { text: "text-muted-foreground", bg: "bg-secondary", badge: "bg-secondary text-muted-foreground" };
                  const isSelected = selectedAgent?.id === agent.id;
                  return (
                    <tr
                      key={agent.id}
                      onClick={() => setSelectedAgent(isSelected ? null : agent)}
                      className={`border-b border-border cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-secondary/40"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                            <Phone className={`w-4 h-4 ${colors.text}`} />
                          </div>
                          <span className="font-medium text-foreground">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                          {agent.type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {agent.model?.split("/").pop()?.split(":")[0] ?? "GPT-4o"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border-0 ${agent.isActive ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>
                          {agent.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => { navigator.clipboard.writeText(agent.id.toString()); toast.success("ID copied"); }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => { if (confirm("Delete this agent?")) deleteMutation.mutate({ id: agent.id }); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel — agent detail */}
        {selectedAgent && (
          <div className="w-72 shrink-0 bg-card border border-border rounded-lg p-5 space-y-4 self-start">
            <div className="flex items-center gap-3">
              {(() => {
                const colors = TYPE_COLORS[selectedAgent.type] ?? { text: "text-muted-foreground", bg: "bg-secondary", badge: "" };
                return (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                    <Phone className={`w-5 h-5 ${colors.text}`} />
                  </div>
                );
              })()}
              <div>
                <p className="font-semibold text-foreground">{selectedAgent.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedAgent.type?.replace("_", " ")}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={`text-xs border-0 ${selectedAgent.isActive ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>
                  {selectedAgent.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground font-medium text-xs">{selectedAgent.model?.split("/").pop()?.split(":")[0] ?? "GPT-4o"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agent ID</span>
                <span className="text-foreground font-mono text-xs">{selectedAgent.id}</span>
              </div>
            </div>
            {selectedAgent.systemPrompt && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">System Prompt</p>
                <p className="text-xs text-foreground bg-secondary/50 rounded p-2 line-clamp-4">{selectedAgent.systemPrompt}</p>
              </div>
            )}
            <div className="space-y-2 pt-2">
              <Button size="sm" className="w-full gap-1.5" onClick={() => navigate(`/dashboard/agents/${selectedAgent.id}`)}>
                <Settings className="w-3.5 h-3.5" /> Configure Agent
              </Button>
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => window.open(`/agent/${selectedAgent.shareableSlug}`, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5" /> Open Agent
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
