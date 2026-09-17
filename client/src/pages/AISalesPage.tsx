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
import { Zap, Plus, Bot, TrendingUp, Users, Mail, Phone, Star, Target, Send, RefreshCw, Trash2 } from "lucide-react";

export default function AISalesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("leads");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newSeqOpen, setNewSeqOpen] = useState(false);
  const [scoreLeadId, setScoreLeadId] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState("");
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", source: "manual", notes: "" });
  const [newSeq, setNewSeq] = useState({ name: "", description: "", goal: "" });

  const { data: leads = [], refetch: refetchLeads } = trpc.crm.listContacts.useQuery({});
  const { data: sequences = [], refetch: refetchSeqs } = trpc.crm.listPipelines.useQuery();

  const createLead = trpc.crm.createContact.useMutation({
    onSuccess: () => { refetchLeads(); setNewLeadOpen(false); toast.success("Lead added"); setNewLead({ name: "", email: "", phone: "", company: "", source: "manual", notes: "" }); },
    onError: () => toast.error("Failed to add lead"),
  });

  const scoreLead = trpc.crm.scoreContact.useMutation({
    onSuccess: (data) => { setScoreResult(data.analysis); refetchLeads(); },
    onError: () => toast.error("AI scoring failed"),
  });

  const deleteLead = trpc.crm.deleteContact.useMutation({
    onSuccess: () => { refetchLeads(); toast.success("Lead removed"); },
  });

  const SCORE_COLOR = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <PageShell title="AI Sales" subtitle="Lead scoring, pipeline management, and AI-powered sales intelligence" icon={<TrendingUp className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <div className="flex gap-2">
          {tab === "leads" && (
            <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Lead</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Full name *" value={newLead.name} onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Phone" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
                  <Input placeholder="Company" value={newLead.company} onChange={e => setNewLead(p => ({ ...p, company: e.target.value }))} />
                  <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="inbound">Inbound Call</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Notes" value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} rows={2} />
                  <Button className="w-full" onClick={() => {
                    const [firstName, ...rest] = newLead.name.split(" ");
                    createLead.mutate({ firstName, lastName: rest.join(" ") || undefined, email: newLead.email || undefined, phone: newLead.phone || undefined, source: newLead.source, notes: newLead.notes || undefined });
                  }} disabled={!newLead.name || createLead.isPending}>
                    {createLead.isPending ? "Adding..." : "Add Lead"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold">{leads.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Hot Leads (≥80)</p>
          <p className="text-2xl font-bold text-green-400">{leads.filter(l => (l.leadScore ?? 0) >= 80).length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Warm Leads (50-79)</p>
          <p className="text-2xl font-bold text-yellow-400">{leads.filter(l => (l.leadScore ?? 0) >= 50 && (l.leadScore ?? 0) < 80).length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Cold Leads (&lt;50)</p>
          <p className="text-2xl font-bold text-muted-foreground">{leads.filter(l => (l.leadScore ?? 0) < 50).length}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="leads"><Users className="w-3 h-3 mr-1" />Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="sequences"><Target className="w-3 h-3 mr-1" />Sequences</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          <div className="space-y-2">
            {leads.map(lead => (
              <div key={lead.id} className="bg-card border rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed"}</p>
                    {lead.source && <Badge variant="outline" className="text-xs">{lead.source}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {lead.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</p>}
                    {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className={`text-xl font-bold ${SCORE_COLOR(lead.leadScore)}`}>{lead.leadScore ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setScoreLeadId(lead.id); setScoreResult(""); scoreLead.mutate({ contactId: lead.id }); }} disabled={scoreLead.isPending && scoreLeadId === lead.id}>
                    <Bot className="w-3 h-3 mr-1" />{scoreLead.isPending && scoreLeadId === lead.id ? "Scoring..." : "AI Score"}
                  </Button>
                  <button onClick={() => deleteLead.mutate({ id: lead.id })} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {leads.length === 0 && (
              <div className="text-center text-muted-foreground py-16">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No leads yet</p>
                <p className="text-sm">Add your first lead to start tracking</p>
              </div>
            )}
          </div>
          {scoreResult && (
            <div className="mt-4 bg-muted rounded-xl p-4 text-sm whitespace-pre-wrap border">
              <p className="font-semibold mb-2 flex items-center gap-2"><Bot className="w-4 h-4 text-primary" />AI Lead Analysis</p>
              {scoreResult}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sequences" className="mt-4">
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Outbound Sequences</p>
            <p className="text-sm mt-1">Build multi-step email + SMS + call sequences to nurture leads automatically. Coming in the next sprint.</p>
            <Button className="mt-4" variant="outline" onClick={() => toast.info("Sequences feature coming soon!")}>
              <Zap className="w-3 h-3 mr-1" />Request Early Access
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
