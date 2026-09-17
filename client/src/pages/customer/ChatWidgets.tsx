import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Code, Settings, Trash2, Copy,
  Eye, BarChart2, Layers, Phone, Globe, Check, Palette,
  Bot, Users, ChevronRight
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";

const customerNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: <BarChart2 className="w-4 h-4" /> },
  { label: "AI Agents", href: "/dashboard#agents", icon: <Layers className="w-4 h-4" /> },
  { label: "Knowledge Base", href: "/knowledge", icon: <Layers className="w-4 h-4" /> },
  { label: "Phone Numbers", href: "/telephony", icon: <Phone className="w-4 h-4" /> },
  { label: "Chat Widgets", href: "/widgets", icon: <MessageSquare className="w-4 h-4" /> },
];

const WIDGET_THEMES = [
  { id: "dark", label: "Dark", bg: "#0f172a", accent: "#6366f1" },
  { id: "light", label: "Light", bg: "#ffffff", accent: "#6366f1" },
  { id: "blue", label: "Ocean Blue", bg: "#0c1a2e", accent: "#3b82f6" },
  { id: "green", label: "Forest", bg: "#0d1f1a", accent: "#10b981" },
  { id: "purple", label: "Purple Rain", bg: "#1a0d2e", accent: "#a855f7" },
];

const WIDGET_POSITIONS = [
  { id: "bottom-right", label: "Bottom Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "top-right", label: "Top Right" },
  { id: "top-left", label: "Top Left" },
];

export default function ChatWidgets() {
  const { user, loading, isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("Hi! 👋 How can I help you today?");
  const [placeholder, setPlaceholder] = useState("Type a message...");
  const [theme, setTheme] = useState("dark");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [agentId, setAgentId] = useState<string>("");
  const [collectEmail, setCollectEmail] = useState(false);
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const { data: widgets, refetch } = trpc.chatWidget.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: agents } = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: conversations } = trpc.chatWidget.listConversations.useQuery(
    selectedWidget ? { widgetId: selectedWidget } : { widgetId: 0 },
    { enabled: !!selectedWidget }
  );
  const { data: widgetStats } = trpc.chatWidget.getWidgetStats.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.chatWidget.create.useMutation({
    onSuccess: () => {
      toast.success("Chat widget created!");
      setCreateOpen(false);
      refetch();
      // Reset form
      setName(""); setGreeting("Hi! 👋 How can I help you today?");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.chatWidget.delete.useMutation({
    onSuccess: () => { toast.success("Widget deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.chatWidget.update.useMutation({
    onSuccess: () => refetch(),
    onError: (err: unknown) => toast.error(String(err)),
  });

  function getEmbedCode(widget: { id: number; widgetKey: string }) {
    const origin = window.location.origin;
    return `<!-- VonWork Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VonWorkWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','vw','${origin}/widget.js'));
  vw('init', '${widget.widgetKey}');
</script>
<!-- End VonWork Chat Widget -->`;
  }

  function copyEmbedCode(widget: { id: number; widgetKey: string }) {
    navigator.clipboard.writeText(getEmbedCode(widget));
    setCopiedId(widget.id);
    toast.success("Embed code copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );

  return (
    <DashboardShell navItems={customerNavItems} role="customer" title="Chat Widgets">
      <div className="space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Widgets", value: widgetStats?.active ?? 0, icon: <MessageSquare className="w-5 h-5 text-indigo-400" /> },
            { label: "Total Conversations", value: widgetStats?.total ?? 0, icon: <Users className="w-5 h-5 text-emerald-400" /> },
            { label: "Total Messages", value: widgetStats?.totalMessages ?? 0, icon: <Bot className="w-5 h-5 text-cyan-400" /> },
            { label: "Resolved", value: widgetStats?.resolved ?? 0, icon: <BarChart2 className="w-5 h-5 text-purple-400" /> },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="widgets">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="widgets">My Widgets</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="howto">Installation Guide</TabsTrigger>
          </TabsList>

          {/* ── Widgets Tab ── */}
          <TabsContent value="widgets" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Chat Widgets</h2>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <Plus className="w-4 h-4" /> Create Widget
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Chat Widget</DialogTitle>
                  </DialogHeader>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left: Config */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300">Widget Name</Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Website Support Bot"
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">AI Agent</Label>
                        <Select value={agentId} onValueChange={setAgentId}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {agents?.map((a) => (
                              <SelectItem key={a.id} value={String(a.id)} className="text-white">{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Greeting Message</Label>
                        <Textarea
                          value={greeting}
                          onChange={(e) => setGreeting(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Input Placeholder</Label>
                        <Input
                          value={placeholder}
                          onChange={(e) => setPlaceholder(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Position</Label>
                        <Select value={position} onValueChange={(v) => setPosition(v as "bottom-right" | "bottom-left" | "top-right" | "top-left")}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {WIDGET_POSITIONS.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-white">{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={collectEmail} onCheckedChange={setCollectEmail} />
                        <Label className="text-slate-300 text-sm">Collect visitor email</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={showBranding} onCheckedChange={setShowBranding} />
                        <Label className="text-slate-300 text-sm">Show "Powered by VonWork"</Label>
                      </div>
                    </div>

                    {/* Right: Theme Picker + Preview */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-300 mb-2 block">Theme</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {WIDGET_THEMES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => { setTheme(t.id); setPrimaryColor(t.accent); }}
                              className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                                theme === t.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-700"
                              }`}
                              style={{ background: t.bg, color: t.accent }}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Accent Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div>
                        <Label className="text-slate-300 mb-2 block">Preview</Label>
                        <div className="relative h-48 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
                          <div
                            className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                            style={{ background: primaryColor }}
                          >
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div className="absolute bottom-16 right-3 w-48 rounded-xl shadow-xl overflow-hidden border border-slate-600"
                            style={{ background: WIDGET_THEMES.find(t => t.id === theme)?.bg ?? "#0f172a" }}>
                            <div className="p-2 text-xs font-medium" style={{ background: primaryColor, color: "#fff" }}>
                              AI Assistant
                            </div>
                            <div className="p-2">
                              <div className="text-xs rounded-lg p-2 mb-2 max-w-[90%]"
                                style={{ background: primaryColor + "33", color: "#fff" }}>
                                {greeting.slice(0, 40)}...
                              </div>
                              <div className="flex gap-1">
                                <input className="flex-1 text-xs rounded px-2 py-1 bg-slate-700 text-slate-300 border-0 outline-none" placeholder={placeholder} readOnly />
                                <button className="text-xs px-2 py-1 rounded" style={{ background: primaryColor, color: "#fff" }}>→</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                    disabled={createMutation.isPending || !name || !agentId}
                    onClick={() => createMutation.mutate({
                      name,
                      agentId: Number(agentId),
                      greeting,
                      placeholder,
              position,
                      primaryColor,
                      collectEmail,
                      showBranding,
                    })}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Widget"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {widgets && widgets.length > 0 ? (
              <div className="space-y-3">
                {widgets.map((widget) => (
                  <Card key={widget.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: (widget.primaryColor ?? "#6366f1") + "33" }}
                          >
                            <MessageSquare className="w-5 h-5" style={{ color: widget.primaryColor ?? "#6366f1" }} />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{widget.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{widget.widgetKey}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${widget.isActive ? "border-emerald-500/30 text-emerald-400" : "border-slate-600 text-slate-500"}`}>
                                {widget.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-xs text-slate-500">{widget.position}</span>
                              <span className="text-xs text-slate-500">{widget.position}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={widget.isActive}
                            onCheckedChange={(v) => updateMutation.mutate({ id: widget.id, isActive: v })}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-300 gap-1"
                            onClick={() => copyEmbedCode(widget)}
                          >
                            {copiedId === widget.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                            {copiedId === widget.id ? "Copied!" : "Embed"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-300 gap-1"
                            onClick={() => setSelectedWidget(widget.id)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Chats
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => deleteMutation.mutate({ id: widget.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Embed Code Snippet */}
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-400 mb-2">Embed code — paste before &lt;/body&gt; on your website:</p>
                        <div className="relative">
                          <pre className="text-xs bg-slate-950 rounded-lg p-3 overflow-x-auto text-slate-300 border border-slate-800">
                            {getEmbedCode(widget)}
                          </pre>
                          <Button
                            size="sm"
                            className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 gap-1 text-xs"
                            onClick={() => copyEmbedCode(widget)}
                          >
                            {copiedId === widget.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800 border-dashed">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No chat widgets yet</p>
                  <p className="text-slate-500 text-sm mb-4">Create a widget and embed it on any website with a single &lt;script&gt; tag</p>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreateOpen(true)}>
                    Create Your First Widget
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Conversations Tab ── */}
          <TabsContent value="conversations" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Conversations</h2>
              {widgets && widgets.length > 0 && (
                <Select value={selectedWidget ? String(selectedWidget) : ""} onValueChange={(v) => setSelectedWidget(Number(v))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-48">
                    <SelectValue placeholder="Select widget" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {widgets.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)} className="text-white">{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Card key={conv.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white text-sm">
                            {conv.visitorEmail ?? `Visitor #${conv.id}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(conv.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${conv.status === "active" ? "border-emerald-500/30 text-emerald-400" : "border-slate-600 text-slate-500"}`}>
                            {conv.status}
                          </Badge>
                          <Button size="sm" variant="outline" className="border-slate-700 gap-1 text-xs">
                            <Eye className="w-3 h-3" /> View
                          </Button>
                        </div>
                      </div>
                      {conv.lastMessageAt && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-1">Last active: {new Date(conv.lastMessageAt).toLocaleString()}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800 border-dashed">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {selectedWidget ? "No conversations yet for this widget" : "Select a widget to view conversations"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Installation Guide Tab ── */}
          <TabsContent value="howto" className="space-y-4 mt-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" /> Installation Guide
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Add your AI chat widget to any website in under 2 minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Create a Widget",
                    desc: "Click 'Create Widget', choose your AI agent, customize the appearance, and click Create.",
                    color: "indigo",
                  },
                  {
                    step: "2",
                    title: "Copy the Embed Code",
                    desc: "Click the 'Embed' button on your widget card to copy the JavaScript snippet.",
                    color: "cyan",
                  },
                  {
                    step: "3",
                    title: "Paste Before </body>",
                    desc: "Open your website's HTML and paste the snippet just before the closing </body> tag. Works on any platform — WordPress, Shopify, Webflow, custom HTML.",
                    color: "emerald",
                  },
                  {
                    step: "4",
                    title: "Train Your Agent",
                    desc: "Go to Knowledge Base, upload your FAQs, product docs, or website content. Your widget will automatically use this to answer questions.",
                    color: "purple",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full bg-${item.color}-500/20 border border-${item.color}-500/30 flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-sm font-bold text-${item.color}-400`}>{item.step}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-sm font-medium text-white mb-2">Platform-specific instructions:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {["WordPress", "Shopify", "Webflow", "Squarespace", "Wix", "Custom HTML"].map((platform) => (
                      <div key={platform} className="flex items-center gap-2 text-sm text-slate-300">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                        {platform}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    For all platforms: paste the embed code in the global footer/body section of your theme or template editor.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
