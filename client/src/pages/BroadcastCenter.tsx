import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import {
  MessageSquare, Phone, Upload, Play, Users, CheckCircle,
  RefreshCw, Plus, Megaphone, Mic, FileText,
  AlertCircle, ChevronRight
} from "lucide-react";

type CampaignType = "sms" | "whatsapp" | "voice";

interface ParsedContact {
  name?: string;
  phone?: string;
  email?: string;
}

function parseCSV(text: string): ParsedContact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const obj: ParsedContact = {};
    headers.forEach((h, i) => {
      if (h.includes("name")) obj.name = cols[i];
      else if (h.includes("phone") || h.includes("mobile") || h.includes("number")) obj.phone = cols[i];
      else if (h.includes("email")) obj.email = cols[i];
    });
    return obj;
  }).filter(c => c.phone || c.email);
}

const typeIcon: Record<CampaignType, React.ReactNode> = {
  sms: <MessageSquare className="w-4 h-4 text-blue-500" />,
  whatsapp: <MessageSquare className="w-4 h-4 text-green-500" />,
  voice: <Phone className="w-4 h-4 text-purple-500" />,
};

const typeLabel: Record<CampaignType, string> = {
  sms: "SMS Blast",
  whatsapp: "WhatsApp Blast",
  voice: "Voice Drop",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  running: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
};

export default function BroadcastCenter() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<"type" | "message" | "contacts" | "review">("type");
  const [campaignType, setCampaignType] = useState<CampaignType>("sms");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [voiceScript, setVoiceScript] = useState("");
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const campaignsQ = trpc.broadcast.listCampaigns.useQuery();
  const statsQ = trpc.broadcast.getCampaignStats.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId, refetchInterval: 3000 }
  );
  const utils = trpc.useUtils();

  const createCampaign = trpc.broadcast.createCampaign.useMutation({
    onSuccess: (data) => { setCreatedCampaignId(data.id); setStep("contacts"); },
    onError: (e) => toast.error(e.message),
  });

  const importRecipients = trpc.broadcast.importRecipients.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} contacts`);
      setStep("review");
      utils.broadcast.listCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const launchCampaign = trpc.broadcast.launchCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign launched — sending to ${data.totalRecipients} recipients`);
      setStep("type");
      setCampaignName(""); setMessage(""); setVoiceScript(""); setContacts([]); setCreatedCampaignId(null);
      utils.broadcast.listCampaigns.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) { toast.error("Please upload a CSV file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { toast.error("No valid contacts found. Ensure CSV has phone/email columns."); return; }
      setContacts(parsed);
      toast.success(`Parsed ${parsed.length} contacts from CSV`);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-blue-500" /></div>;
  if (!user) { navigate(getLoginUrl()); return null; }

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <PageShell
      title="Broadcast Center"
      subtitle="Upload a contact list and send SMS, WhatsApp, or Voice blasts at scale"
      icon={<Megaphone className="w-5 h-5" />}
      actions={
        <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm">
          <Plus className="w-4 h-4 mr-1" /> New Campaign
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Campaign Builder ── */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                New Broadcast Campaign
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {(["type", "message", "contacts", "review"] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? "bg-blue-600 text-white" : (["type", "message", "contacts", "review"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400")}`}>
                      {["type", "message", "contacts", "review"].indexOf(step) > i ? "✓" : i + 1}
                    </div>
                    {i < 3 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                  </div>
                ))}
                <span className="text-gray-500 text-xs ml-2 capitalize">{step}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === "type" && (
                <div className="space-y-3">
                  <Input placeholder="Campaign name *" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
                  <div className="grid grid-cols-3 gap-3">
                    {(["sms", "whatsapp", "voice"] as CampaignType[]).map(t => (
                      <button key={t} onClick={() => setCampaignType(t)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${campaignType === t ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-blue-200"}`}>
                        <div className="flex justify-center mb-2">{typeIcon[t]}</div>
                        <div className="text-gray-800 text-sm font-medium">{typeLabel[t]}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {t === "sms" ? "160 chars/segment" : t === "whatsapp" ? "Rich messages" : "TTS voice call"}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!campaignName} onClick={() => setStep("message")}>
                    Next: Write Message <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {step === "message" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    {typeIcon[campaignType]}
                    <span className="text-gray-800 font-medium">{typeLabel[campaignType]}</span>
                    <Badge className="bg-blue-100 text-blue-700 ml-auto">{campaignName}</Badge>
                  </div>
                  {campaignType !== "voice" ? (
                    <div>
                      <Textarea
                        placeholder={`Write your ${campaignType.toUpperCase()} message...\n\nTip: Use {name} to personalize with contact name`}
                        value={message} onChange={e => setMessage(e.target.value)} rows={5}
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{charCount} characters</span>
                        {campaignType === "sms" && <span>{smsSegments} SMS segment{smsSegments > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Mic className="w-3 h-3" />Voice Script (AI will read this aloud)</label>
                      <Textarea
                        placeholder="Hello {name}, this is a message from VonWork. We wanted to reach out about..."
                        value={voiceScript} onChange={e => setVoiceScript(e.target.value)} rows={5}
                      />
                      <p className="text-xs text-gray-400 mt-1">The AI voice will read this script to each recipient using text-to-speech.</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("type")}>Back</Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={campaignType === "voice" ? !voiceScript.trim() : !message.trim()}
                      onClick={() => createCampaign.mutate({ name: campaignName, type: campaignType, message: message || undefined, voiceScript: voiceScript || undefined })}>
                      {createCampaign.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                      Next: Upload Contacts <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {step === "contacts" && (
                <div className="space-y-3">
                  <p className="text-gray-500 text-sm">Upload a CSV file with columns: <code className="bg-gray-100 px-1 rounded text-blue-600">name, phone, email</code></p>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium">Drop CSV here or click to browse</p>
                    <p className="text-gray-500 text-sm mt-1">Supports up to 10,000 contacts per campaign</p>
                    {contacts.length > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">{contacts.length} contacts loaded</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

                  <details className="text-sm">
                    <summary className="text-gray-500 cursor-pointer hover:text-gray-700">Or paste numbers manually (one per line)</summary>
                    <Textarea
                      placeholder="+12125551234&#10;+13105559876&#10;+17025554321"
                      className="mt-2 font-mono text-xs" rows={4}
                      onChange={e => {
                        const lines = e.target.value.trim().split(/\r?\n/).filter(Boolean);
                        setContacts(lines.map(phone => ({ phone: phone.trim() })));
                      }}
                    />
                  </details>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("message")}>Back</Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={contacts.length === 0 || importRecipients.isPending || !createdCampaignId}
                      onClick={() => importRecipients.mutate({ campaignId: createdCampaignId!, recipients: contacts })}>
                      {importRecipients.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-1" />}
                      Import {contacts.length} Contacts
                    </Button>
                  </div>
                </div>
              )}

              {step === "review" && createdCampaignId && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                    {[
                      ["Campaign", campaignName],
                      ["Type", typeLabel[campaignType]],
                      ["Recipients", String(contacts.length)],
                      ["Message", (message || voiceScript).slice(0, 60) + ((message || voiceScript).length > 60 ? "…" : "")],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-800 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-yellow-700 text-xs">This will send real messages to {contacts.length} recipients. Make sure you have a provisioned Telnyx number in Telephony settings.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("contacts")}>Back</Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={launchCampaign.isPending}
                      onClick={() => launchCampaign.mutate({ campaignId: createdCampaignId })}>
                      {launchCampaign.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-1" />}
                      Launch Campaign
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Campaign List & Stats ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaignsQ.isLoading ? <div className="text-gray-500 text-sm">Loading...</div> :
                campaignsQ.data?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No campaigns yet</p>
                  </div>
                ) : campaignsQ.data?.map(c => (
                  <button key={c.id} onClick={() => setSelectedCampaignId(c.id === selectedCampaignId ? null : c.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedCampaignId === c.id ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-blue-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {typeIcon[c.type as CampaignType]}
                        <span className="text-gray-800 text-sm font-medium truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <Badge className={`text-xs ${statusColors[c.status ?? "draft"]}`}>{c.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span><Users className="w-3 h-3 inline mr-0.5" />{c.totalContacts ?? 0}</span>
                      <span>Sent: {c.sent ?? 0}</span>
                      {c.failed ? <span className="text-red-500">Failed: {c.failed}</span> : null}
                    </div>
                  </button>
                ))
              }
            </CardContent>
          </Card>

          {selectedCampaignId && statsQ.data && (
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800 text-sm">{statsQ.data.campaign.name} — Live Stats</CardTitle>
                {statsQ.data.campaign.status === "running" && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600">
                    <RefreshCw className="w-3 h-3 animate-spin" />Updating every 3s
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={statsQ.data.stats.total > 0 ? ((statsQ.data.stats.sent + statsQ.data.stats.delivered) / statsQ.data.stats.total) * 100 : 0} className="h-2" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total", value: statsQ.data.stats.total, color: "text-gray-800" },
                    { label: "Pending", value: statsQ.data.stats.pending, color: "text-yellow-600" },
                    { label: "Sent", value: statsQ.data.stats.sent, color: "text-blue-600" },
                    { label: "Delivered", value: statsQ.data.stats.delivered, color: "text-green-600" },
                    { label: "Failed", value: statsQ.data.stats.failed, color: "text-red-600" },
                    { label: "Opted Out", value: statsQ.data.stats.optedOut, color: "text-orange-600" },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-gray-500 text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
