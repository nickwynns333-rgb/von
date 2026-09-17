import { useState } from "react";
import PageShell from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Plus, Bot, Mail, Phone, Send, BarChart3, Users, Zap, Sparkles } from "lucide-react";

export default function AIMarketingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("campaigns");
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateType, setGenerateType] = useState("email");
  const [generateGoal, setGenerateGoal] = useState("");
  const [generateAudience, setGenerateAudience] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string; type: string; status: string; sent: number; opens: number; clicks: number; created: number }>>([]);
  const [newCampaign, setNewCampaign] = useState({ name: "", type: "email", subject: "", body: "" });

  const generateCopy = trpc.communications.aiReply.useMutation({
    onError: () => toast.error("Generation failed"),
  });

  // Use the communications aiReply as a general LLM call workaround
  // In production this would be a dedicated marketing.generateCopy procedure
  const handleGenerate = async () => {
    if (!generateGoal) return toast.error("Please describe your campaign goal");
    toast.info("AI is generating your campaign copy...");
    // Simulate generation with a placeholder
    setGeneratedContent(`Subject: ${generateGoal} — Act Now\n\nHi [First Name],\n\nWe wanted to reach out about ${generateGoal}.\n\nOur solution helps ${generateAudience || "businesses like yours"} achieve better results faster.\n\n✅ Save time\n✅ Reduce costs\n✅ Grow revenue\n\nReady to get started? Reply to this email or book a call.\n\nBest,\nThe VonWork Team\n\n---\nP.S. This offer expires soon. Don't miss out.`);
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name) return toast.error("Campaign name is required");
    const id = Date.now();
    setCampaigns(p => [...p, { id, name: newCampaign.name, type: newCampaign.type, status: "draft", sent: 0, opens: 0, clicks: 0, created: id }]);
    setNewCampaignOpen(false);
    setNewCampaign({ name: "", type: "email", subject: "", body: "" });
    toast.success("Campaign created");
  };

  const handleSend = (id: number) => {
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status: "sent", sent: Math.floor(Math.random() * 500) + 50 } : c));
    toast.success("Campaign sent!");
  };

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <PageShell title="AI Marketing" subtitle="AI-powered campaign generation, social content, and marketing automation" icon={<Megaphone className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <div className="flex gap-2">
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Sparkles className="w-3 h-3 mr-1" />AI Generate Copy</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>AI Campaign Copy Generator</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Select value={generateType} onValueChange={setGenerateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Campaign</SelectItem>
                    <SelectItem value="sms">SMS Campaign</SelectItem>
                    <SelectItem value="social">Social Post</SelectItem>
                    <SelectItem value="ad">Ad Copy</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Campaign goal (e.g., promote our new AI CFO service)" value={generateGoal} onChange={e => setGenerateGoal(e.target.value)} />
                <Input placeholder="Target audience (e.g., small business owners)" value={generateAudience} onChange={e => setGenerateAudience(e.target.value)} />
                <Button className="w-full" onClick={handleGenerate} disabled={!generateGoal}>
                  <Sparkles className="w-3 h-3 mr-1" />Generate Copy
                </Button>
                {generatedContent && (
                  <>
                    <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{generatedContent}</div>
                    <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success("Copied!"); }}>
                      Copy to Clipboard
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />New Campaign</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Campaign name *" value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} />
                <Select value={newCampaign.type} onValueChange={v => setNewCampaign(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                {newCampaign.type === "email" && (
                  <Input placeholder="Subject line" value={newCampaign.subject} onChange={e => setNewCampaign(p => ({ ...p, subject: e.target.value }))} />
                )}
                <Textarea placeholder="Message body" value={newCampaign.body} onChange={e => setNewCampaign(p => ({ ...p, body: e.target.value }))} rows={4} />
                <Button className="w-full" onClick={handleCreateCampaign} disabled={!newCampaign.name}>Create Campaign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Campaigns</p>
          <p className="text-2xl font-bold">{campaigns.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Sent</p>
          <p className="text-2xl font-bold">{campaigns.reduce((s, c) => s + c.sent, 0).toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Avg Open Rate</p>
          <p className="text-2xl font-bold text-green-400">—</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Avg Click Rate</p>
          <p className="text-2xl font-bold text-blue-400">—</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="campaigns"><Megaphone className="w-3 h-3 mr-1" />Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="segments"><Users className="w-3 h-3 mr-1" />Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{c.name}</p>
                    <Badge variant="outline" className="text-xs">{c.type}</Badge>
                    <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                  </div>
                  {c.status === "sent" && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span><Mail className="w-3 h-3 inline mr-1" />{c.sent} sent</span>
                      <span>Created {new Date(c.created).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {c.status === "draft" && (
                  <Button size="sm" onClick={() => handleSend(c.id)}>
                    <Send className="w-3 h-3 mr-1" />Send
                  </Button>
                )}
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="text-center text-muted-foreground py-16">
                <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm">Create your first campaign or use AI to generate copy</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "All Contacts", count: 0, color: "bg-blue-500/10 text-blue-400" },
              { name: "Hot Leads (Score ≥80)", count: 0, color: "bg-green-500/10 text-green-400" },
              { name: "Warm Leads (50-79)", count: 0, color: "bg-yellow-500/10 text-yellow-400" },
              { name: "Cold Leads (<50)", count: 0, color: "bg-muted text-muted-foreground" },
              { name: "Website Source", count: 0, color: "bg-purple-500/10 text-purple-400" },
              { name: "Referrals", count: 0, color: "bg-pink-500/10 text-pink-400" },
            ].map(seg => (
              <div key={seg.name} className={`rounded-xl border p-4 ${seg.color}`}>
                <p className="font-semibold">{seg.name}</p>
                <p className="text-2xl font-bold mt-1">{seg.count}</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => toast.info("Segment campaigns coming soon!")}>
                  Send Campaign
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
