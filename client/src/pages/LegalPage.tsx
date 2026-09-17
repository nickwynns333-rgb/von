import { useState } from "react";
import PageShell from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Bot, Edit, Trash2, CheckCircle, Clock, AlertCircle, XCircle , Scale } from "lucide-react";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <Clock className="w-3 h-3 text-muted-foreground" />,
  review: <AlertCircle className="w-3 h-3 text-yellow-500" />,
  signed: <CheckCircle className="w-3 h-3 text-green-500" />,
  expired: <XCircle className="w-3 h-3 text-red-500" />,
};

const TYPE_LABELS: Record<string, string> = {
  nda: "NDA", msa: "MSA", sow: "SOW", employment: "Employment",
  contractor: "Contractor", service: "Service Agreement", custom: "Custom",
};

export default function LegalPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<any>("all");
  const [newContractOpen, setNewContractOpen] = useState(false);
  const [editContract, setEditContract] = useState<any>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [analyzeClause, setAnalyzeClause] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState("");
  const [generateContext, setGenerateContext] = useState("");
  const [generateType, setGenerateType] = useState("nda");
  const [generateResult, setGenerateResult] = useState("");
  const [newContract, setNewContract] = useState({ title: "", type: "custom" as any });

  const { data: contracts = [], refetch } = trpc.legal.listContracts.useQuery({ status: statusFilter });

  const createContract = trpc.legal.createContract.useMutation({
    onSuccess: () => { refetch(); setNewContractOpen(false); toast.success("Contract created"); setNewContract({ title: "", type: "custom" }); },
    onError: () => toast.error("Failed to create contract"),
  });

  const updateContract = trpc.legal.updateContract.useMutation({
    onSuccess: () => { refetch(); setEditContract(null); toast.success("Contract updated"); },
  });

  const deleteContract = trpc.legal.deleteContract.useMutation({
    onSuccess: () => { refetch(); toast.success("Contract deleted"); },
  });

  const analyzeClauseMutation = trpc.legal.analyzeClause.useMutation({
    onSuccess: (data) => setAnalyzeResult(data.analysis),
    onError: () => toast.error("Analysis failed"),
  });

  const generateContractMutation = trpc.legal.generateContract.useMutation({
    onSuccess: (data) => setGenerateResult(data.content),
    onError: () => toast.error("Generation failed"),
  });

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <PageShell title="Legal" subtitle="AI-assisted contract drafting, compliance monitoring, and legal document management" icon={<Scale className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <div className="flex gap-2">
          {/* AI Analyze */}
          <Dialog open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Bot className="w-3 h-3 mr-1" />AI Analyze</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>AI Clause Analysis</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Textarea placeholder="Paste a contract clause to analyze..." value={analyzeClause} onChange={e => setAnalyzeClause(e.target.value)} rows={5} />
                <Button onClick={() => analyzeClauseMutation.mutate({ clause: analyzeClause })} disabled={analyzeClause.length < 10 || analyzeClauseMutation.isPending} className="w-full">
                  {analyzeClauseMutation.isPending ? "Analyzing..." : "Analyze Clause"}
                </Button>
                {analyzeResult && (
                  <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">{analyzeResult}</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* AI Generate */}
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Bot className="w-3 h-3 mr-1" />AI Generate</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>AI Contract Generator</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Select value={generateType} onValueChange={setGenerateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Describe the context: parties, terms, scope, jurisdiction..." value={generateContext} onChange={e => setGenerateContext(e.target.value)} rows={4} />
                <Button onClick={() => generateContractMutation.mutate({ type: generateType, context: generateContext })} disabled={generateContext.length < 10 || generateContractMutation.isPending} className="w-full">
                  {generateContractMutation.isPending ? "Generating..." : "Generate Contract"}
                </Button>
                {generateResult && (
                  <div className="bg-muted rounded-lg p-4 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">{generateResult}</div>
                )}
                {generateResult && (
                  <Button variant="outline" className="w-full" onClick={() => {
                    createContract.mutate({ title: `AI Generated ${TYPE_LABELS[generateType]}`, type: generateType as any, content: generateResult });
                    setGenerateOpen(false);
                    setGenerateResult("");
                    setGenerateContext("");
                  }}>
                    Save as Contract
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* New Contract */}
          <Dialog open={newContractOpen} onOpenChange={setNewContractOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />New Contract</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Contract title *" value={newContract.title} onChange={e => setNewContract(p => ({ ...p, title: e.target.value }))} />
                <Select value={newContract.type} onValueChange={v => setNewContract(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">A template will be pre-filled based on the contract type. You can edit it after creation.</p>
                <Button className="w-full" onClick={() => createContract.mutate(newContract)} disabled={!newContract.title || createContract.isPending}>
                  {createContract.isPending ? "Creating..." : "Create Contract"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(["all", "draft", "review", "signed", "expired"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Contracts list */}
      <div className="space-y-3">
        {contracts.map(c => (
          <div key={c.id} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {STATUS_ICONS[c.status ?? "draft"]}
                  <h3 className="font-semibold">{c.title}</h3>
                  <Badge variant="outline" className="text-xs">{TYPE_LABELS[c.type] ?? c.type}</Badge>
                  <Badge variant={c.status === "signed" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Created {new Date(c.createdAt).toLocaleDateString()}</p>
                {c.content && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">{c.content.slice(0, 120)}...</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={c.status ?? "draft"} onValueChange={v => updateContract.mutate({ id: c.id, status: v as any })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => setEditContract(c)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteContract.mutate({ id: c.id })} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {contracts.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No contracts yet</p>
            <p className="text-sm">Create a new contract or use AI to generate one</p>
          </div>
        )}
      </div>

      {/* Edit Contract Dialog */}
      {editContract && (
        <Dialog open={!!editContract} onOpenChange={() => setEditContract(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Edit Contract — {editContract.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input value={editContract.title} onChange={e => setEditContract((p: any) => ({ ...p, title: e.target.value }))} />
              <Textarea value={editContract.content ?? ""} onChange={e => setEditContract((p: any) => ({ ...p, content: e.target.value }))} rows={15} className="font-mono text-xs" />
              <Button className="w-full" onClick={() => updateContract.mutate({ id: editContract.id, title: editContract.title, content: editContract.content })} disabled={updateContract.isPending}>
                {updateContract.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </PageShell>
  );
}
