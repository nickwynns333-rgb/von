import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { canLoadCallCenterData } from "@/lib/callCenterAccess";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import {
  Phone, PhoneOff, Play, Pause, Plus, Users, Mic, Clock,
  Zap, BarChart3, RefreshCw, ChevronRight, CheckCircle,
  XCircle, Volume2, FileText, Upload, Wand2,
  PhoneCall, PhoneMissed, PhoneIncoming, AlertCircle
} from "lucide-react";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "America/Honolulu", "Europe/London", "Europe/Paris", "Asia/Kolkata",
];

const OBJECTIVES = [
  { value: "appointment", label: "Book Appointment" },
  { value: "demo", label: "Schedule Demo" },
  { value: "sales", label: "Close Sale" },
  { value: "collections", label: "Collect Payment" },
  { value: "survey", label: "Run Survey" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
  { value: "casual", label: "Casual" },
];

interface ParsedLead {
  phone?: string;
  businessName?: string;
  decisionMakerName?: string;
  email?: string;
  city?: string;
  state?: string;
}

function parseCSV(text: string): ParsedLead[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const obj: ParsedLead = {};
    headers.forEach((h, i) => {
      if (h.includes("phone") || h.includes("mobile") || h.includes("number")) obj.phone = cols[i];
      else if (h.includes("business") || h.includes("company")) obj.businessName = cols[i];
      else if (h.includes("name") && !h.includes("business")) obj.decisionMakerName = cols[i];
      else if (h.includes("email")) obj.email = cols[i];
      else if (h.includes("city")) obj.city = cols[i];
      else if (h.includes("state")) obj.state = cols[i];
    });
    return obj;
  }).filter(l => l.phone);
}

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  running: "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const leadStatusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3 text-gray-400" />,
  calling: <PhoneCall className="w-3 h-3 text-yellow-500 animate-pulse" />,
  answered: <CheckCircle className="w-3 h-3 text-green-500" />,
  voicemail: <Volume2 className="w-3 h-3 text-blue-500" />,
  no_answer: <PhoneMissed className="w-3 h-3 text-gray-400" />,
  failed: <XCircle className="w-3 h-3 text-red-500" />,
  do_not_call: <PhoneOff className="w-3 h-3 text-red-600" />,
};

export default function CallCenterPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("dashboard");

  const [step, setStep] = useState<"settings" | "script" | "leads" | "review">("settings");
  const [campaignName, setCampaignName] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [callsPerHour, setCallsPerHour] = useState(30);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [timezone, setTimezone] = useState("America/New_York");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [script, setScript] = useState("");
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [genIndustry, setGenIndustry] = useState("");
  const [genObjective, setGenObjective] = useState<"appointment" | "demo" | "sales" | "collections" | "survey">("appointment");
  const [genTone, setGenTone] = useState<"professional" | "friendly" | "urgent" | "casual">("professional");
  const [genProduct, setGenProduct] = useState("");
  const [scriptName, setScriptName] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const canLoadProtectedData = canLoadCallCenterData(user);

  const voicesQ = trpc.callCenter.listVoices.useQuery(undefined, { enabled: canLoadProtectedData });
  const campaignsQ = trpc.callCenter.listCampaigns.useQuery(undefined, {
    enabled: canLoadProtectedData,
    refetchInterval: (query) => {
      const data = query.state.data as Array<{ status: string }> | undefined;
      const hasActive = data?.some(c => c.status === "running");
      return hasActive ? 10000 : false;
    },
  });
  const scriptsQ = trpc.callCenter.listScripts.useQuery(undefined, { enabled: canLoadProtectedData });
  const dashboardQ = trpc.callCenter.getDashboard.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: canLoadProtectedData && !!selectedCampaignId, refetchInterval: 10000 }
  );
  const numbersQ = trpc.telnyx.listNumbers.useQuery(undefined, { enabled: canLoadProtectedData });

  const generateScript = trpc.callCenter.generateScript.useMutation({
    onSuccess: (data) => { setScript(data.script); toast.success("AI script generated!"); },
    onError: (e) => toast.error(e.message),
  });
  const saveScript = trpc.callCenter.saveScript.useMutation({
    onSuccess: () => { toast.success("Script saved to library"); utils.callCenter.listScripts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteScript = trpc.callCenter.deleteScript.useMutation({
    onSuccess: () => utils.callCenter.listScripts.invalidate(),
  });
  const createCampaign = trpc.callCenter.createCampaign.useMutation({
    onSuccess: (data) => { setCreatedCampaignId(data.campaignId); setStep("leads"); },
    onError: (e) => toast.error(e.message),
  });
  const importLeads = trpc.callCenter.importLeads.useMutation({
    onSuccess: (data) => { toast.success(`Imported ${data.imported} leads`); setStep("review"); utils.callCenter.listCampaigns.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const launchCampaign = trpc.callCenter.launchCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTab("dashboard");
      setSelectedCampaignId(createdCampaignId);
      setStep("settings");
      setCampaignName(""); setScript(""); setLeads([]); setCreatedCampaignId(null);
      utils.callCenter.listCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const pauseCampaign = trpc.callCenter.pauseCampaign.useMutation({
    onSuccess: () => { toast.success("Campaign paused"); utils.callCenter.listCampaigns.invalidate(); },
  });

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { toast.error("No valid leads found. Ensure CSV has a phone column."); return; }
      setLeads(parsed);
      toast.success(`Parsed ${parsed.length} leads`);
    };
    reader.readAsText(file);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-4 h-7 w-7 animate-spin text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Connecting your Call Center</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">We are securely checking your VonWork session before loading campaigns and phone data.</p>
          <Button className="mt-5" variant="outline" onClick={() => window.location.assign(getLoginUrl())}>
            Sign in if this takes too long
          </Button>
        </div>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Phone className="mx-auto mb-4 h-7 w-7 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Sign in to access Call Center</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Campaigns, phone numbers, and lead records stay behind your secure VonWork session.</p>
          <Button className="mt-5" onClick={() => window.location.assign(getLoginUrl())}>Sign in to VonWork</Button>
        </div>
      </main>
    );
  }

  const d = dashboardQ.data;

  const TABS = [
    { label: "Dashboard", value: "dashboard" },
    { label: "New Campaign", value: "new" },
    { label: "Script Library", value: "scripts" },
  ];

  return (
    <PageShell
      title="AI Call Center"
      subtitle="Rate-limited outbound dialer with AI voice, custom scripts, and scheduling"
      icon={<Phone className="w-5 h-5" />}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white font-semibold"
            onClick={() => navigate("/prospecting")}
          >
            <Wand2 className="w-4 h-4 mr-1" /> Find Businesses
          </Button>
          <Button
            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm"
            onClick={() => setTab("new")}
          >
            <Plus className="w-4 h-4 mr-1" /> New Campaign
          </Button>
        </div>
      }
    >
      {/* ── DASHBOARD TAB ── */}
      {tab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Campaign list */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Campaigns</h3>
            {campaignsQ.data?.length === 0 && (
              <div className="text-center py-10 text-gray-500 text-sm bg-white rounded-xl border border-gray-100">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No campaigns yet
              </div>
            )}
            {campaignsQ.data?.map(c => (
              <button key={c.id} onClick={() => setSelectedCampaignId(c.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedCampaignId === c.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-800 text-sm font-medium truncate max-w-[120px]">{c.name}</span>
                  <Badge className={`text-xs ${statusColor[c.status ?? "draft"]}`}>{c.status}</Badge>
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span><Users className="w-3 h-3 inline mr-0.5" />{c.callsTotal}</span>
                  <span className="text-green-600">✓ {c.callsAnswered}</span>
                  <span className="text-red-500">✗ {c.callsFailed}</span>
                </div>
                {c.status === "running" && (
                  <Button size="sm" variant="outline" className="w-full mt-2 h-6 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                    onClick={(e) => { e.stopPropagation(); pauseCampaign.mutate({ campaignId: c.id }); }}>
                    <Pause className="w-3 h-3 mr-1" />Pause
                  </Button>
                )}
              </button>
            ))}
          </div>

          {/* Live stats */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedCampaignId ? (
              <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-100 text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select a campaign to view live stats</p>
                </div>
              </div>
            ) : d ? (
              <>
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="text-gray-900 font-bold text-lg">{d.campaign.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge className={statusColor[d.campaign.status ?? "draft"]}>{d.campaign.status}</Badge>
                      <span className={`text-xs flex items-center gap-1 ${d.inWindow ? "text-green-600" : "text-orange-500"}`}>
                        <Clock className="w-3 h-3" />
                        {d.inWindow ? "Within calling hours" : "Outside calling hours"}
                      </span>
                      {d.extra?.callsPerHour && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Zap className="w-3 h-3" />{d.extra.callsPerHour}/hr
                        </span>
                      )}
                    </div>
                  </div>
                  {d.campaign.status === "draft" && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => launchCampaign.mutate({ campaignId: selectedCampaignId })}
                      disabled={launchCampaign.isPending}>
                      <Play className="w-4 h-4 mr-1" />Launch
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Leads", value: d.stats.total, color: "text-gray-800", icon: <Users className="w-4 h-4 text-gray-400" /> },
                    { label: "Calling Now", value: d.stats.calling, color: "text-yellow-600", icon: <PhoneCall className="w-4 h-4 text-yellow-500" /> },
                    { label: "Answered", value: d.stats.answered, color: "text-green-600", icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
                    { label: "Connect Rate", value: `${d.stats.connectRate}%`, color: "text-blue-600", icon: <BarChart3 className="w-4 h-4 text-blue-500" /> },
                    { label: "Voicemail", value: d.stats.voicemail, color: "text-purple-600", icon: <Volume2 className="w-4 h-4 text-purple-500" /> },
                    { label: "No Answer", value: d.stats.noAnswer, color: "text-gray-500", icon: <PhoneMissed className="w-4 h-4 text-gray-400" /> },
                    { label: "Failed", value: d.stats.failed, color: "text-red-600", icon: <XCircle className="w-4 h-4 text-red-500" /> },
                    { label: "Meetings Booked", value: d.stats.meetingsBooked, color: "text-emerald-600", icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
                  ].map(s => (
                    <Card key={s.label} className="bg-white border-gray-100 shadow-sm">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">{s.icon}</span>
                        </div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-gray-500 text-xs">{s.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Campaign Progress</span>
                    <span>{d.stats.total - d.stats.pending}/{d.stats.total} leads processed</span>
                  </div>
                  <Progress value={d.stats.total > 0 ? ((d.stats.total - d.stats.pending) / d.stats.total) * 100 : 0} className="h-2" />
                </div>

                <Card className="bg-white border-gray-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-800 text-sm flex items-center gap-2">
                      <PhoneIncoming className="w-4 h-4 text-blue-500" />
                      Recent Calls
                      {d.campaign.status === "running" && <span className="text-xs text-yellow-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Live</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {d.recentLeads.map((lead: any) => (
                        <div key={lead.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2">
                            {leadStatusIcon[lead.callStatus] ?? <Phone className="w-3 h-3 text-gray-400" />}
                            <div>
                              <span className="text-gray-800 text-sm">{lead.businessName ?? lead.phone}</span>
                              {lead.businessName && <span className="text-gray-500 text-xs ml-2">{lead.phone}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{lead.callStatus}</Badge>
                        </div>
                      ))}
                      {d.recentLeads.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No calls yet</p>}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEW CAMPAIGN WIZARD ── */}
      {tab === "new" && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            {(["settings", "script", "leads", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === s ? "bg-blue-600 text-white" : (["settings", "script", "leads", "review"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400")}`}>
                  {["settings", "script", "leads", "review"].indexOf(step) > i ? "✓" : i + 1}
                </div>
                <span className={`text-xs capitalize ${step === s ? "text-blue-600 font-medium" : "text-gray-400"}`}>{s}</span>
                {i < 3 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
              </div>
            ))}
          </div>

          <Card className="bg-white border-gray-100 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              {step === "settings" && (
                <div className="space-y-4">
                  <h3 className="text-gray-800 font-semibold">Campaign Settings</h3>
                  <Input placeholder="Campaign name *" value={campaignName} onChange={e => setCampaignName(e.target.value)} />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">From Number *</label>
                      <Select value={fromNumber} onValueChange={setFromNumber}>
                        <SelectTrigger><SelectValue placeholder="Select number" /></SelectTrigger>
                        <SelectContent>
                          {numbersQ.data?.map((n: any) => (
                            <SelectItem key={n.id} value={n.phoneNumber ?? n.id}>{n.phoneNumber ?? n.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Connection ID *</label>
                      <Input placeholder="Telnyx connection ID" value={connectionId} onChange={e => setConnectionId(e.target.value)} className="text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1"><Mic className="w-3 h-3" />AI Voice</label>
                    <div className="grid grid-cols-3 gap-2">
                      {voicesQ.data?.map(v => (
                        <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${selectedVoice === v.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                          <div className="text-gray-800 text-sm font-medium">{v.name}</div>
                          <div className="text-gray-500 text-xs">{v.description}</div>
                          <Badge variant="outline" className="text-xs mt-1">{v.gender}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <h4 className="text-gray-700 text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Calling Schedule</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Start Hour</label>
                        <Select value={String(startHour)} onValueChange={v => setStartHour(parseInt(v))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>{i}:00 {i < 12 ? "AM" : "PM"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">End Hour</label>
                        <Select value={String(endHour)} onValueChange={v => setEndHour(parseInt(v))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>{i}:00 {i < 12 ? "AM" : "PM"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Timezone</label>
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.split("/")[1]?.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />Calls per hour</span>
                        <span className="text-blue-600 font-bold">{callsPerHour}</span>
                      </div>
                      <Slider value={[callsPerHour]} onValueChange={([v]) => setCallsPerHour(v)} min={1} max={300} step={5} className="w-full" />
                      <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1/hr</span><span>300/hr</span></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>Max concurrent calls</span>
                        <span className="text-blue-600 font-bold">{maxConcurrent}</span>
                      </div>
                      <Slider value={[maxConcurrent]} onValueChange={([v]) => setMaxConcurrent(v)} min={1} max={20} step={1} className="w-full" />
                    </div>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!campaignName || !connectionId}
                    onClick={() => setStep("script")}>
                    Next: Write Script <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {step === "script" && (
                <div className="space-y-4">
                  <h3 className="text-gray-800 font-semibold">AI Call Script</h3>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                    <h4 className="text-blue-700 text-sm font-medium flex items-center gap-2"><Wand2 className="w-4 h-4" />AI Script Generator</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Industry (e.g. HVAC, Dental)" value={genIndustry} onChange={e => setGenIndustry(e.target.value)} className="text-sm" />
                      <Input placeholder="Product/service (optional)" value={genProduct} onChange={e => setGenProduct(e.target.value)} className="text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={genObjective} onValueChange={v => setGenObjective(v as any)}>
                        <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Objective" /></SelectTrigger>
                        <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={genTone} onValueChange={v => setGenTone(v as any)}>
                        <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Tone" /></SelectTrigger>
                        <SelectContent>{TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!genIndustry || generateScript.isPending}
                      onClick={() => generateScript.mutate({ industry: genIndustry, objective: genObjective, tone: genTone, productService: genProduct || undefined })}>
                      {generateScript.isPending ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" />Generating...</> : <><Wand2 className="w-3 h-3 mr-1" />Generate Script</>}
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Write or paste your call script here...\n\nTip: Use {name} for contact name and {business} for business name"
                    value={script} onChange={e => setScript(e.target.value)}
                    className="font-mono text-sm" rows={10}
                  />
                  <div className="text-xs text-gray-400">{script.length} chars · ~{Math.round(script.split(" ").length / 130)} min read aloud</div>

                  {script && (
                    <div className="flex gap-2">
                      <Input placeholder="Script name (to save)" value={scriptName} onChange={e => setScriptName(e.target.value)} className="text-sm" />
                      <Button size="sm" variant="outline" className="shrink-0"
                        disabled={!scriptName || saveScript.isPending}
                        onClick={() => saveScript.mutate({ name: scriptName, industry: genIndustry, objective: genObjective, script, voiceId: selectedVoice })}>
                        Save
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("settings")}>Back</Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={!script.trim()}
                      onClick={() => createCampaign.mutate({
                        name: campaignName, script, voiceId: selectedVoice,
                        fromNumber: fromNumber || "+10000000000",
                        connectionId, callsPerHour, maxConcurrent,
                        scheduleStartHour: startHour, scheduleEndHour: endHour, scheduleTimezone: timezone,
                      })}>
                      {createCampaign.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
                      Next: Upload Leads <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {step === "leads" && (
                <div className="space-y-4">
                  <h3 className="text-gray-800 font-semibold">Upload Lead List</h3>
                  <p className="text-gray-500 text-sm">CSV columns: <code className="bg-gray-100 px-1 rounded text-blue-600">phone, businessName, name, email, city, state</code></p>

                  <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => fileRef.current?.click()}>
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Drop CSV here or click to browse</p>
                    {leads.length > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">{leads.length} leads loaded</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

                  <details className="text-sm">
                    <summary className="text-gray-500 cursor-pointer">Or paste phone numbers manually</summary>
                    <Textarea placeholder="+12125551234&#10;+13105559876" className="mt-2 font-mono text-xs" rows={4}
                      onChange={e => setLeads(e.target.value.trim().split(/\r?\n/).filter(Boolean).map(p => ({ phone: p.trim() })))} />
                  </details>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("script")}>Back</Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={leads.length === 0 || importLeads.isPending || !createdCampaignId}
                      onClick={() => importLeads.mutate({ campaignId: createdCampaignId!, leads: leads.filter(l => !!l.phone) as { phone: string; businessName?: string; decisionMakerName?: string; email?: string; city?: string; state?: string }[] })}>
                      {importLeads.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Users className="w-4 h-4 mr-1" />}
                      Import {leads.length} Leads
                    </Button>
                  </div>
                </div>
              )}

              {step === "review" && createdCampaignId && (
                <div className="space-y-4">
                  <h3 className="text-gray-800 font-semibold">Review & Launch</h3>
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                    {[
                      ["Campaign", campaignName],
                      ["Voice", selectedVoice],
                      ["Leads", String(leads.length)],
                      ["Rate", `${callsPerHour} calls/hr`],
                      ["Concurrent", `${maxConcurrent} simultaneous`],
                      ["Hours", `${startHour}:00–${endHour}:00 ${timezone.split("/")[1]?.replace("_", " ")}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-800 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-yellow-700 text-xs">This will initiate real outbound calls. Ensure your Telnyx number is provisioned and the calling window is correct.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("leads")}>Back</Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={launchCampaign.isPending}
                      onClick={() => launchCampaign.mutate({ campaignId: createdCampaignId })}>
                      {launchCampaign.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                      Launch Campaign
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SCRIPT LIBRARY ── */}
      {tab === "scripts" && (
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-800 font-semibold">Saved Scripts</h3>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setTab("new")}>
              <Plus className="w-4 h-4 mr-1" />New Script
            </Button>
          </div>
          {(scriptsQ.data as any[])?.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No scripts saved yet. Generate one in New Campaign.</p>
            </div>
          )}
          {(scriptsQ.data as any[])?.map((s: any) => (
            <Card key={s.id} className="bg-white border-gray-100 shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-800 font-medium">{s.name}</p>
                    <div className="flex gap-2 mt-1">
                      {s.industry && <Badge variant="outline" className="text-xs">{s.industry}</Badge>}
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">{s.objective}</Badge>
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">{s.voiceId}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setScript(s.script); setSelectedVoice(s.voiceId); setTab("new"); setStep("script"); toast.success("Script loaded"); }}>
                      Use
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-500 h-7 text-xs"
                      onClick={() => deleteScript.mutate({ id: s.id })}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="text-gray-500 text-xs line-clamp-3 font-mono">{s.script}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
