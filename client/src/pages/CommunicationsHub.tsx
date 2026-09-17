import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare, Phone, Mail, Globe, Instagram, Send,
  Bot, UserCheck, RefreshCw, Plus, Search, CheckCheck,
  Clock, Archive, Zap
} from "lucide-react";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <span className="text-green-500 font-bold text-xs">WA</span>,
  sms: <Phone className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  webchat: <Globe className="w-3 h-3" />,
  instagram: <Instagram className="w-3 h-3" />,
  telegram: <span className="text-blue-400 font-bold text-xs">TG</span>,
  facebook: <span className="text-blue-600 font-bold text-xs">FB</span>,
  voice: <Phone className="w-3 h-3 text-purple-400" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
  sms: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  email: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  webchat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  telegram: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  facebook: "bg-blue-600/10 text-blue-500 border-blue-600/20",
  voice: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const AGENT_LABELS: Record<string, string> = {
  ai_receptionist: "AI Receptionist",
  ai_sales: "AI Sales",
  ai_support: "AI Support",
  ai_collections: "AI Collections",
  human: "Human Agent",
};

export default function CommunicationsHub() {
  const { user } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "snoozed" | "resolved" | "spam" | "all">("open");
  const [channelFilter, setChannelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConv, setNewConv] = useState({ contactName: "", contactPhone: "", contactEmail: "", channelType: "webchat" as any, subject: "", initialMessage: "" });

  const { data: conversations = [], refetch: refetchConvs } = trpc.communications.listConversations.useQuery({
    status: statusFilter,
    channelType: channelFilter === "all" ? undefined : channelFilter,
    search: search || undefined,
  }, { refetchInterval: 10000 });

  const { data: messages = [], refetch: refetchMsgs } = trpc.communications.getMessages.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId, refetchInterval: 10000 }
  );

  const sendMsg = trpc.communications.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessageText("");
      refetchMsgs();
      refetchConvs();
      if (data.dispatched) {
        toast.success(`Sent via ${(data.channel ?? "channel").toUpperCase()}`);
      } else if (data.error) {
        toast.warning(`Saved — not dispatched: ${data.error}`, { duration: 6000 });
      }
    },
    onError: (err) => toast.error(`Send failed: ${err.message}`),
  });

  const createConv = trpc.communications.createConversation.useMutation({
    onSuccess: (data) => {
      setNewConvOpen(false);
      setSelectedConvId(data.conversationId);
      refetchConvs();
      toast.success("Conversation created");
    },
    onError: () => toast.error("Failed to create conversation"),
  });

  const updateStatus = trpc.communications.updateStatus.useMutation({
    onSuccess: () => { refetchConvs(); toast.success("Status updated"); },
  });

  const aiRoute = trpc.communications.aiRoute.useMutation({
    onSuccess: (data) => {
      refetchConvs();
      toast.success(`Assigned to ${AGENT_LABELS[data.assignedTo] ?? data.assignedTo}: ${data.reason}`);
    },
    onError: () => toast.error("AI routing failed"),
  });

  const aiReply = trpc.communications.aiReply.useMutation({
    onSuccess: () => { refetchMsgs(); refetchConvs(); toast.success("AI reply sent"); },
    onError: () => toast.error("AI reply failed"),
  });

  const humanHandoff = trpc.communications.setHumanHandoff.useMutation({
    onSuccess: () => { refetchConvs(); toast.success("Conversation assigned to a human agent."); },
    onError: (error) => toast.error(`Handoff failed: ${error.message}`),
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in to access Communications Hub.</div>;

  return (
    <DashboardLayout>
    <div className="flex h-[calc(100vh-4rem)] bg-[#F5F7FA]">
      {/* Sidebar — conversation list */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="border-b" style={{ background: "linear-gradient(135deg, #1A6FFF 0%, #3B8BFF 60%, #5BA3FF 100%)" }}><div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-white"><MessageSquare className="w-4 h-4" /> Inbox</h2>
            <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-white text-primary hover:bg-white/90 border-0 h-7 text-xs"><Plus className="w-3 h-3 mr-1" />New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Contact name" value={newConv.contactName} onChange={e => setNewConv(p => ({ ...p, contactName: e.target.value }))} />
                  <Input placeholder="Phone" value={newConv.contactPhone} onChange={e => setNewConv(p => ({ ...p, contactPhone: e.target.value }))} />
                  <Input placeholder="Email" value={newConv.contactEmail} onChange={e => setNewConv(p => ({ ...p, contactEmail: e.target.value }))} />
                  <Select value={newConv.channelType} onValueChange={v => setNewConv(p => ({ ...p, channelType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["whatsapp", "sms", "email", "webchat", "instagram", "telegram", "facebook", "voice"].map(c => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Subject (optional)" value={newConv.subject} onChange={e => setNewConv(p => ({ ...p, subject: e.target.value }))} />
                  <Textarea placeholder="Initial message (optional)" value={newConv.initialMessage} onChange={e => setNewConv(p => ({ ...p, initialMessage: e.target.value }))} rows={3} />
                  <Button className="w-full" onClick={() => createConv.mutate(newConv)} disabled={createConv.isPending}>
                    {createConv.isPending ? "Creating..." : "Create Conversation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3 h-3 text-muted-foreground" />
            <Input className="pl-7 h-8 text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["open", "snoozed", "resolved", "all"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${statusFilter === s ? "bg-white text-primary border-white" : "border-white/30 text-white/80 hover:border-white/60"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", "whatsapp", "sms", "email", "webchat"].map(c => (
              <button key={c} onClick={() => setChannelFilter(c)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${channelFilter === c ? "bg-white text-primary border-white" : "border-white/30 text-white/80 hover:border-white/60"}`}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div></div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No conversations yet
            </div>
          )}
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => setSelectedConvId(conv.id)}
              className={`w-full text-left p-3 border-b hover:bg-accent/50 transition-colors ${selectedConvId === conv.id ? "bg-accent" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${CHANNEL_COLORS[conv.channelType] ?? ""}`}>
                      {CHANNEL_ICONS[conv.channelType]}
                    </span>
                    <span className="font-medium text-sm truncate">{(conv as any).contact?.name ?? "Unknown"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.subject ?? "No subject"}</p>
                  {conv.assignedTo && (
                    <p className="text-xs text-primary/70 mt-0.5 flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" />{AGENT_LABELS[conv.assignedTo]}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={conv.status === "open" ? "default" : "secondary"} className="text-xs px-1 py-0">{conv.status}</Badge>
                  {conv.unreadCount! > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main — message thread */}
      <div className="flex-1 flex flex-col">
        {!selectedConvId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">or create a new one to get started</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{(selectedConv as any)?.contact?.name ?? "Unknown Contact"}</h3>
                <p className="text-xs text-muted-foreground">{selectedConv?.channelType} · {selectedConv?.subject ?? "No subject"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => aiRoute.mutate({ conversationId: selectedConvId })} disabled={aiRoute.isPending}>
                  <Zap className="w-3 h-3 mr-1" />{aiRoute.isPending ? "Routing..." : "AI Route"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => aiReply.mutate({ conversationId: selectedConvId })} disabled={aiReply.isPending}>
                  <Bot className="w-3 h-3 mr-1" />{aiReply.isPending ? "Generating..." : "AI Reply"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => humanHandoff.mutate({ conversationId: selectedConvId, mode: "human" })} disabled={humanHandoff.isPending}>
                  <UserCheck className="w-3 h-3 mr-1" />{humanHandoff.isPending ? "Assigning..." : "Human handoff"}
                </Button>
                <Select value={selectedConv?.status ?? "open"} onValueChange={v => updateStatus.mutate({ conversationId: selectedConvId, status: v as any })}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="snoozed">Snoozed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">No messages yet</div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    msg.direction === "outbound"
                      ? msg.sender === "ai" ? "bg-primary/20 text-primary-foreground border border-primary/30" : "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {msg.sender === "ai" && (
                      <p className="text-xs text-primary/70 mb-1 flex items-center gap-1"><Bot className="w-3 h-3" />AI Agent</p>
                    )}
                    <p>{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs opacity-60">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                      {msg.direction === "outbound" && (
                        <span className={`text-xs ${msg.status === "failed" ? "text-red-400" : msg.status === "delivered" ? "text-green-400" : "opacity-50"}`}>
                          {msg.status === "failed" ? "✗ failed" : msg.status === "delivered" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (messageText.trim()) sendMsg.mutate({ conversationId: selectedConvId, content: messageText.trim() });
                    }
                  }}
                  rows={2}
                  className="resize-none"
                />
                <Button
                  onClick={() => { if (messageText.trim()) sendMsg.mutate({ conversationId: selectedConvId, content: messageText.trim() }); }}
                  disabled={sendMsg.isPending || !messageText.trim()}
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for new line</p>
                {selectedConv && (selectedConv.channelType === "sms" || selectedConv.channelType === "whatsapp") && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${CHANNEL_COLORS[selectedConv.channelType]}`}>
                    {CHANNEL_ICONS[selectedConv.channelType]}
                    <span className="ml-1">{selectedConv.channelType === "whatsapp" ? "WhatsApp" : "SMS"} · Telnyx</span>
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
