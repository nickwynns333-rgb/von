import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { customerNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Settings, BookOpen, Wrench, MessageSquare, Palette, Plug, BarChart3, Bot, Save, ChevronRight, Wand2, HelpCircle, RotateCcw, X, Play } from "lucide-react";
import { StreamingChatDemo } from "@/components/StreamingChatDemo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const TABS = [
  { id: "chat_agent", label: "Chat Agent", icon: <Bot className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  { id: "knowledge_base", label: "Knowledge Base", icon: <BookOpen className="w-4 h-4" /> },
  { id: "tools", label: "Tools", icon: <Wrench className="w-4 h-4" /> },
  { id: "conversations", label: "Conversations", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
  { id: "integrations", label: "Integrations", icon: <Plug className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "test_chat", label: "Test Chat", icon: <Play className="w-4 h-4" /> },
];

const SETTINGS_SUBTABS = ["General", "Human Handoff Settings", "Unknown Answer Notifications", "Message Rate Limits"];

const OPENROUTER_MODELS = [
  { id: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (Free)", cost: "Free" },
  { id: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B", cost: "~$0.0001 / message" },
  { id: "mistralai/mistral-nemo", label: "Mistral Nemo", cost: "~$0.0003 / message" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", cost: "~$0.0015 / message" },
  { id: "openai/gpt-4o", label: "GPT-4o", cost: "~$0.0109 / message" },
  { id: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet", cost: "~$0.0180 / message" },
  { id: "x-ai/grok-3", label: "GROK-3", cost: "~$0.0131 / message" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", cost: "~$0.0004 / message" },
];

export default function AgentEditor() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const agentId = params?.id ? parseInt(params.id) : null;

  const [activeTab, setActiveTab] = useState("chat_agent");
  const [settingsSubTab, setSettingsSubTab] = useState("General");

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [primaryModel, setPrimaryModel] = useState("openai/gpt-4o");
  const [alternativeModel, setAlternativeModel] = useState("x-ai/grok-3");
  const [supportEmail, setSupportEmail] = useState("");
  const [temperature, setTemperature] = useState(0);
  const [kbSearchResults, setKbSearchResults] = useState("5");
  const [humanHandoffEnabled, setHumanHandoffEnabled] = useState(false);
  const [humanHandoffKeywords, setHumanHandoffKeywords] = useState("");
  const [unknownAnswerEnabled, setUnknownAnswerEnabled] = useState(false);
  const [unknownAnswerEmail, setUnknownAnswerEmail] = useState("");
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [rateLimitPerHour, setRateLimitPerHour] = useState("60");

  // Chat Agent feature toggles (stored in agent.config)
  const [showDataSources, setShowDataSources] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [enableAudio, setEnableAudio] = useState(false);
  const [enableVision, setEnableVision] = useState(false);
  const [llmTitles, setLlmTitles] = useState(false);
  const [enableStreaming, setEnableStreaming] = useState(true);

  // AI Prompt Builder dialog
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [builderBizName, setBuilderBizName] = useState("");
  const [builderIndustry, setBuilderIndustry] = useState("general");
  const [builderGoal, setBuilderGoal] = useState("");
  const [builderTone, setBuilderTone] = useState<"professional" | "friendly" | "assertive" | "empathetic" | "casual">("friendly");
  const [builderAgentName, setBuilderAgentName] = useState("");
  const [builderExtra, setBuilderExtra] = useState("");

  // Appearance
  const [widgetColor, setWidgetColor] = useState("#2563eb");
  const [widgetPosition, setWidgetPosition] = useState("bottom-right");
  const [botAvatar, setBotAvatar] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! How can I help you today?");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const agentQuery = trpc.agents.get.useQuery(
    { id: agentId! },
    { enabled: !!agentId && !!isAuthenticated }
  );

  useEffect(() => {
    if (agentQuery.data) {
      const a = agentQuery.data as any;
      setName(a.name ?? "");
      setDisplayName(a.displayName ?? a.name ?? "");
      setSystemPrompt(a.systemPrompt ?? "");
      setPrimaryModel(a.model ?? "openai/gpt-4o");
      setSupportEmail(a.supportEmail ?? "");
      // Load feature toggles from config
      const cfg = (a.config as Record<string, unknown>) ?? {};
      setShowDataSources(!!cfg.showDataSources);
      setDebugMode(!!cfg.debugMode);
      setEnableAudio(!!cfg.enableAudio);
      setEnableVision(!!cfg.enableVision);
      setLlmTitles(!!cfg.llmTitles);
      setEnableStreaming(cfg.enableStreaming !== false);
    }
  }, [agentQuery.data]);

  const updateMutation = trpc.agents.update.useMutation({
    onSuccess: () => toast.success("Agent saved successfully"),
    onError: () => toast.error("Failed to save agent"),
  });

  const handleSave = () => {
    if (!agentId) return;
    updateMutation.mutate({
      id: agentId,
      name,
      systemPrompt,
      model: primaryModel,
      config: { showDataSources, debugMode, enableAudio, enableVision, llmTitles, enableStreaming },
    });
  };

  const promptTemplatesQuery = trpc.promptTemplates.list.useQuery({ agentType: "chat" });
  const buildWithAIMutation = trpc.promptTemplates.buildWithAI.useMutation({
    onSuccess: (data) => {
      setSystemPrompt(data.prompt);
      setPromptBuilderOpen(false);
      toast.success("AI-generated prompt applied!");
    },
    onError: () => toast.error("Failed to generate prompt"),
  });

  // Save as Template dialog
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateIndustry, setTemplateIndustry] = useState("general");
  const saveTemplateMutation = trpc.promptTemplates.save.useMutation({
    onSuccess: () => {
      setSaveTemplateOpen(false);
      setTemplateName("");
      toast.success("Prompt saved to template library!");
      promptTemplatesQuery.refetch();
    },
    onError: () => toast.error("Failed to save template"),
  });

  const convQuery = trpc.chatWidget.listConversations.useQuery(
    { widgetId: agentId! },
    { enabled: !!agentId && activeTab === "conversations" && !!isAuthenticated }
  );

  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const agentName = agentQuery.data ? (agentQuery.data as any).name : `Agent #${agentId}`;

  return (
    <DashboardShell navItems={customerNavItems} title={`Update ${agentName}`} role="customer">
      <div className="max-w-5xl mx-auto space-y-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/dashboard/agents")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Settings className="w-5 h-5 text-gray-600" />
          <h1 className="text-lg font-bold text-gray-900">Update {agentName}</h1>
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-200 bg-white rounded-t-xl">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6">

          {/* ── Chat Agent tab ── */}
          {activeTab === "chat_agent" && (
            <TooltipProvider>
            <div className="space-y-6">

              {/* Base System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold text-gray-900">Base System Prompt</Label>
                    <span className="text-red-500 text-sm">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>The system prompt defines your agent's personality, goals, and behavior. Be specific about what the agent should and should not do.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Select Prompt dropdown */}
                    <Select
                      value=""
                      onValueChange={(val) => {
                        const tpl = promptTemplatesQuery.data?.find(t => String(t.id) === val);
                        if (tpl) { setSystemPrompt(tpl.content); toast.success(`Loaded: ${tpl.name}`); }
                      }}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs border-gray-300">
                        <SelectValue placeholder="Select Prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        {(promptTemplatesQuery.data ?? []).map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-gray-300">|</span>
                    {/* AI Prompt Builder */}
                    <button
                      onClick={() => setPromptBuilderOpen(true)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      AI Prompt Builder
                    </button>
                    <span className="text-gray-300">|</span>
                    <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700" onClick={(e) => { e.preventDefault(); toast.info("FAQs coming soon"); }}>FAQs</a>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => { setSystemPrompt(""); toast.success("Prompt reset"); }}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                </div>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are Alexa, a friendly yet assertive AI assistant designed to help business owners explore how AI Agents can benefit their business..."
                  className="min-h-[260px] text-sm border-gray-300 focus:border-blue-500 resize-y leading-relaxed"
                />
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                {([
                  { key: "showDataSources", label: "Show Data Sources", desc: "Display which knowledge base sources were used to generate a response", value: showDataSources, setter: setShowDataSources },
                  { key: "debugMode", label: "Debug Mode", desc: "Show internal reasoning and tool calls in the chat interface (useful for testing)", value: debugMode, setter: setDebugMode },
                  { key: "enableAudio", label: "Enable Audio Features", desc: "Allow the agent to process and respond with voice/audio messages", value: enableAudio, setter: setEnableAudio },
                  { key: "enableVision", label: "Enable Vision Features", desc: "Allow the agent to analyze and respond to images sent by users", value: enableVision, setter: setEnableVision },
                  { key: "llmTitles", label: "LLM-Driven Conversation Titles", desc: "Automatically generate descriptive titles for each conversation using AI", value: llmTitles, setter: setLlmTitles },
                  { key: "enableStreaming", label: "Enable Streaming", desc: "Stream responses token-by-token for a faster, more natural feel", value: enableStreaming, setter: setEnableStreaming },
                ] as const).map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{toggle.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs"><p>{toggle.desc}</p></TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={toggle.value}
                      onCheckedChange={(v) => (toggle.setter as (v: boolean) => void)(v)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                ))}
              </div>

              {/* Update button + Save as Template */}
              <div className="pt-2 flex items-center gap-3">
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {updateMutation.isPending ? "Saving..." : "Update Chat Agent"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-gray-600 border-gray-300"
                  onClick={() => { setTemplateName(""); setSaveTemplateOpen(true); }}
                  disabled={!systemPrompt.trim()}
                >
                  <Save className="w-3.5 h-3.5" />
                  Save as Template
                </Button>
              </div>

            </div>

            {/* Save as Template Dialog */}
            <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Save className="w-5 h-5 text-blue-600" />
                    Save as Template
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-sm text-gray-500">Save this prompt to your template library so you can reuse it across other agents.</p>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Template Name *</label>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Dentist Office Receptionist"
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Industry</label>
                    <select
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={templateIndustry}
                      onChange={e => setTemplateIndustry(e.target.value)}
                    >
                      <option value="general">General</option>
                      <option value="dental">Dental</option>
                      <option value="medical">Medical</option>
                      <option value="legal">Legal</option>
                      <option value="real_estate">Real Estate</option>
                      <option value="hvac">HVAC / Plumbing</option>
                      <option value="roofing">Roofing</option>
                      <option value="ecommerce">E-Commerce</option>
                      <option value="saas">SaaS / Tech</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 max-h-24 overflow-y-auto font-mono">
                    {systemPrompt.slice(0, 200)}{systemPrompt.length > 200 ? "..." : ""}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!templateName.trim() || saveTemplateMutation.isPending}
                    onClick={() => saveTemplateMutation.mutate({ name: templateName, industry: templateIndustry, agentType: "chat", content: systemPrompt })}
                  >
                    {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* AI Prompt Builder Dialog */}
            <Dialog open={promptBuilderOpen} onOpenChange={setPromptBuilderOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-blue-600" />
                    AI Prompt Builder
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-sm text-gray-500">Tell us about your business and we'll generate the perfect system prompt for your AI agent.</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Business Name <span className="text-red-500">*</span></Label>
                    <Input value={builderBizName} onChange={e => setBuilderBizName(e.target.value)} placeholder="e.g. Smile Dental Group" className="border-gray-300" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Industry <span className="text-red-500">*</span></Label>
                    <Select value={builderIndustry} onValueChange={setBuilderIndustry}>
                      <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["general","dental","medical","legal","real_estate","home_services","ecommerce","restaurant","fitness","finance","insurance","automotive"].map(i => (
                          <SelectItem key={i} value={i}>{i.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Agent Name</Label>
                    <Input value={builderAgentName} onChange={e => setBuilderAgentName(e.target.value)} placeholder="e.g. Alexa, Max, Sarah" className="border-gray-300" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Primary Goal <span className="text-red-500">*</span></Label>
                    <Input value={builderGoal} onChange={e => setBuilderGoal(e.target.value)} placeholder="e.g. book appointments, qualify leads, answer FAQs" className="border-gray-300" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tone</Label>
                    <Select value={builderTone} onValueChange={v => setBuilderTone(v as typeof builderTone)}>
                      <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["friendly","professional","assertive","empathetic","casual"].map(t => (
                          <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Additional Instructions</Label>
                    <Textarea value={builderExtra} onChange={e => setBuilderExtra(e.target.value)} placeholder="Any specific rules, things to avoid, or special instructions..." className="border-gray-300 h-20" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPromptBuilderOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => buildWithAIMutation.mutate({ businessName: builderBizName, industry: builderIndustry, agentGoal: builderGoal, tone: builderTone, agentName: builderAgentName || undefined, additionalInstructions: builderExtra || undefined })}
                    disabled={!builderBizName || !builderGoal || buildWithAIMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    {buildWithAIMutation.isPending ? "Generating..." : "Generate Prompt"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </TooltipProvider>
          )}

          {/* ── Settings tab ── */}
          {activeTab === "settings" && (
            <div>
              {/* Settings sub-tabs */}
              <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
                {SETTINGS_SUBTABS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSettingsSubTab(sub)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      settingsSubTab === sub ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {settingsSubTab === "General" && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">General</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" className="border-gray-300" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Display Name <span className="text-red-500">*</span></Label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="border-gray-300" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Primary Model <span className="text-red-500">*</span></Label>
                      <Select value={primaryModel} onValueChange={setPrimaryModel}>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPENROUTER_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label} ({m.cost})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">We recommend GPT-4.1 for most use cases. <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Learn More</a></p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Alternative Model <span className="text-red-500">*</span></Label>
                      <Select value={alternativeModel} onValueChange={setAlternativeModel}>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPENROUTER_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label} ({m.cost})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Support Email</Label>
                      <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="Enter support email" type="email" className="border-gray-300" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Knowledge Base Search Results</Label>
                      <Select value={kbSearchResults} onValueChange={setKbSearchResults}>
                        <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["3", "5", "7", "10"].map(n => <SelectItem key={n} value={n}>{n} results</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-sm font-medium text-gray-700">Temperature <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-4">
                        <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={1} step={0.01} className="flex-1" />
                        <span className="text-sm font-mono text-gray-700 w-12 text-right">{temperature.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Lower = more focused. Higher = more creative.</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                      <Save className="w-4 h-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </div>
              )}

              {settingsSubTab === "Human Handoff Settings" && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">Human Handoff Settings</h3>
                  <p className="text-sm text-gray-500">Configure when and how the AI transfers conversations to a human agent.</p>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Enable Human Handoff</div>
                      <div className="text-xs text-gray-500 mt-0.5">Allow the AI to transfer conversations to a human when needed</div>
                    </div>
                    <Switch checked={humanHandoffEnabled} onCheckedChange={setHumanHandoffEnabled} />
                  </div>
                  {humanHandoffEnabled && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Trigger Keywords</Label>
                        <Textarea
                          value={humanHandoffKeywords}
                          onChange={(e) => setHumanHandoffKeywords(e.target.value)}
                          placeholder="speak to human, talk to agent, real person..."
                          className="border-gray-300 h-24"
                        />
                        <p className="text-xs text-gray-500">Comma-separated keywords that trigger handoff</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Handoff Message</Label>
                        <Textarea placeholder="I'm connecting you with a human agent. Please hold..." className="border-gray-300 h-20" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {settingsSubTab === "Unknown Answer Notifications" && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">Unknown Answer Notifications</h3>
                  <p className="text-sm text-gray-500">Get notified when your agent can't answer a question — use it to improve your knowledge base.</p>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Enable Notifications</div>
                      <div className="text-xs text-gray-500 mt-0.5">Receive email alerts for unanswered questions</div>
                    </div>
                    <Switch checked={unknownAnswerEnabled} onCheckedChange={setUnknownAnswerEnabled} />
                  </div>
                  {unknownAnswerEnabled && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Notification Email</Label>
                      <Input value={unknownAnswerEmail} onChange={(e) => setUnknownAnswerEmail(e.target.value)} placeholder="alerts@yourcompany.com" type="email" className="border-gray-300" />
                    </div>
                  )}
                </div>
              )}

              {settingsSubTab === "Message Rate Limits" && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">Message Rate Limits</h3>
                  <p className="text-sm text-gray-500">Prevent abuse by limiting how many messages a single user can send.</p>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Enable Rate Limiting</div>
                      <div className="text-xs text-gray-500 mt-0.5">Limit messages per user per hour</div>
                    </div>
                    <Switch checked={rateLimitEnabled} onCheckedChange={setRateLimitEnabled} />
                  </div>
                  {rateLimitEnabled && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Max Messages per Hour</Label>
                      <Input value={rateLimitPerHour} onChange={(e) => setRateLimitPerHour(e.target.value)} type="number" min="1" max="1000" className="border-gray-300 w-32" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Knowledge Base tab ── */}
          {activeTab === "knowledge_base" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Knowledge Base</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Connect a knowledge base to give your agent access to your documents and FAQs.</p>
                </div>
                <Button onClick={() => navigate("/knowledge")} variant="outline" size="sm" className="gap-2 border-gray-300">
                  <BookOpen className="w-4 h-4" /> Manage Knowledge Bases
                </Button>
              </div>
              <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No knowledge base linked</p>
                <p className="text-xs text-gray-400 mt-1">Go to Knowledge Bases to create one and link it to this agent</p>
                <Button onClick={() => navigate("/knowledge")} size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Create Knowledge Base
                </Button>
              </div>
            </div>
          )}

          {/* ── Tools tab ── */}
          {activeTab === "tools" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Tools</h3>
                <p className="text-sm text-gray-500 mt-0.5">Give your agent the ability to take actions — book appointments, look up data, send emails.</p>
              </div>
              {[
                { name: "Calendar Booking", desc: "Allow agent to book appointments via Google Calendar or Calendly", icon: "📅" },
                { name: "Send Email", desc: "Allow agent to send follow-up emails to leads", icon: "📧" },
                { name: "CRM Update", desc: "Push lead data to your CRM automatically", icon: "📊" },
                { name: "Web Search", desc: "Allow agent to search the web for current information", icon: "🔍" },
                { name: "Custom Webhook", desc: "Trigger any external API when a condition is met", icon: "🔗" },
              ].map((tool) => (
                <div key={tool.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tool.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{tool.name}</div>
                      <div className="text-xs text-gray-500">{tool.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">Coming Soon</Badge>
                    <Switch disabled />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Conversations tab ── */}
          {activeTab === "conversations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Conversations</h3>
                <Badge variant="outline" className="text-xs">{convQuery.data?.length ?? 0} total</Badge>
              </div>
              {convQuery.isLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (convQuery.data?.length ?? 0) === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Conversations will appear here once your widget is deployed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {convQuery.data?.map((conv: any) => (
                    <div key={conv.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                          {conv.visitorEmail?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{conv.visitorEmail ?? "Anonymous"}</div>
                          <div className="text-xs text-gray-500">{conv.messageCount ?? 0} messages</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${conv.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{conv.status}</Badge>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Appearance tab ── */}
          {activeTab === "appearance" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Appearance</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Customize how your chat widget looks on your website.</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/agents/${agentId}/avatar-studio`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors"
                  >
                    🎭 Avatar Studio
                  </a>
                  <a
                    href={`/agents/${agentId}/voice-studio`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-medium hover:bg-cyan-100 transition-colors"
                  >
                    🎙️ Voice Studio
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Widget Color</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer" />
                    <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="border-gray-300 font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Widget Position</Label>
                  <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                    <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Bot Avatar URL</Label>
                  <Input value={botAvatar} onChange={(e) => setBotAvatar(e.target.value)} placeholder="https://..." className="border-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Welcome Message</Label>
                  <Input value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} className="border-gray-300" />
                </div>
              </div>
              {/* Live preview */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 mb-3">Preview</p>
                <div className="relative h-32 bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className={`absolute ${widgetPosition === "bottom-right" ? "bottom-3 right-3" : "bottom-3 left-3"} flex items-end gap-2`}>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-br-sm px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[160px]">
                      {welcomeMessage}
                    </div>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shadow-md flex-shrink-0" style={{ background: widgetColor }}>
                      {botAvatar ? <img src={botAvatar} alt="" className="w-full h-full rounded-full object-cover" /> : "💬"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Integrations tab ── */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Integrations</h3>
                <p className="text-sm text-gray-500 mt-0.5">Connect your agent to third-party platforms and channels.</p>
              </div>
              {[
                { name: "Website Widget", desc: "Embed on any website with a script tag", icon: "🌐", status: "available" },
                { name: "WhatsApp", desc: "Deploy your agent on WhatsApp Business", icon: "💬", status: "coming_soon" },
                { name: "Facebook Messenger", desc: "Connect to your Facebook Page inbox", icon: "📘", status: "coming_soon" },
                { name: "Instagram DM", desc: "Automate Instagram direct messages", icon: "📷", status: "coming_soon" },
                { name: "Slack", desc: "Add your agent to a Slack workspace", icon: "💼", status: "coming_soon" },
                { name: "Zapier", desc: "Connect to 5,000+ apps via Zapier", icon: "⚡", status: "coming_soon" },
                { name: "API", desc: "Use the REST API to integrate anywhere", icon: "🔌", status: "available" },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{integration.name}</div>
                      <div className="text-xs text-gray-500">{integration.desc}</div>
                    </div>
                  </div>
                  {integration.status === "available" ? (
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 text-xs">Configure</Button>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">Coming Soon</Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Analytics tab ── */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Analytics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Chats", value: "0" },
                  { label: "Total Messages", value: "0" },
                  { label: "Avg Session Length", value: "0m" },
                  { label: "Leads Captured", value: "0" },
                ].map((stat) => (
                  <Card key={stat.label} className="border-gray-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center">
                <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Analytics will populate once your agent starts receiving conversations</p>
              </div>
            </div>
          )}

          {activeTab === "test_chat" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Test Chat</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Chat with your agent live. {enableStreaming ? "Streaming is enabled — tokens appear as they are generated." : "Streaming is off — responses appear all at once."}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  enableStreaming ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${enableStreaming ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  {enableStreaming ? "Streaming ON" : "Streaming OFF"}
                </div>
              </div>
              <div className="max-w-md">
                <StreamingChatDemo
                  widgetKey={String(agentId ?? "demo")}
                  sessionId={`test-${String(agentId)}-${Date.now()}`}
                  botName={agentQuery.data ? (agentQuery.data as any).name : "AI Assistant"}
                  streamingEnabled={enableStreaming}
                  welcomeMessage={(agentQuery.data as any)?.welcomeMessage ?? "Hi! How can I help you today?"}
                  accentColor={(agentQuery.data as any)?.widgetColor ?? "#2563eb"}
                />
              </div>
              <p className="text-xs text-gray-400">
                Note: This test chat uses your agent's system prompt and knowledge base. Messages are saved to the conversations log.
              </p>
            </div>
          )}

        </div>
      </div>
    </DashboardShell>
  );
}
