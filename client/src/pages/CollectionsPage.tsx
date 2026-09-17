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
import { DollarSign, Plus, Bot, AlertTriangle, CheckCircle, Clock, Send, RefreshCw , CreditCard } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-400",
  overdue: "bg-red-500/10 text-red-400",
  paid: "bg-green-500/10 text-green-400",
  disputed: "bg-yellow-500/10 text-yellow-400",
  written_off: "bg-muted text-muted-foreground line-through",
};

export default function CollectionsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<any>("all");
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [chaseOpen, setChaseOpen] = useState<number | null>(null);
  const [chaseTone, setChaseTone] = useState<"friendly" | "firm" | "final_notice">("friendly");
  const [chaseMessage, setChaseMessage] = useState("");
  const [newInvoice, setNewInvoice] = useState({ amount: "", currency: "USD", description: "", invoiceNumber: "" });

  const { data: invoices = [], refetch } = trpc.collections.listInvoices.useQuery({ status: statusFilter });

  const createInvoice = trpc.collections.createInvoice.useMutation({
    onSuccess: () => { refetch(); setNewInvoiceOpen(false); toast.success("Invoice created"); setNewInvoice({ amount: "", currency: "USD", description: "", invoiceNumber: "" }); },
    onError: () => toast.error("Failed to create invoice"),
  });

  const updateStatus = trpc.collections.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status updated"); },
  });

  const generateChase = trpc.collections.generateChaseMessage.useMutation({
    onSuccess: (data) => setChaseMessage(data.message),
    onError: () => toast.error("Failed to generate message"),
  });

  const markOverdue = trpc.collections.markOverdue.useMutation({
    onSuccess: (data) => { refetch(); toast.success(`${data.markedOverdue} invoice(s) marked overdue`); },
  });

  const totalOutstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status ?? "")).reduce((s, i) => s + parseFloat(i.amount ?? "0"), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + parseFloat(i.amount ?? "0"), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount ?? "0"), 0);

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <PageShell title="Collections" subtitle="AI-powered invoice management, payment reminders, and debt recovery" icon={<CreditCard className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => markOverdue.mutate()} disabled={markOverdue.isPending}>
            <RefreshCw className="w-3 h-3 mr-1" />{markOverdue.isPending ? "Checking..." : "Mark Overdue"}
          </Button>
          <Dialog open={newInvoiceOpen} onOpenChange={setNewInvoiceOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />New Invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Invoice # (auto-generated if blank)" value={newInvoice.invoiceNumber} onChange={e => setNewInvoice(p => ({ ...p, invoiceNumber: e.target.value }))} />
                <div className="flex gap-2">
                  <Input placeholder="Amount *" type="number" value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: e.target.value }))} />
                  <Select value={newInvoice.currency} onValueChange={v => setNewInvoice(p => ({ ...p, currency: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Description" value={newInvoice.description} onChange={e => setNewInvoice(p => ({ ...p, description: e.target.value }))} rows={2} />
                <Button className="w-full" onClick={() => {
                  if (!newInvoice.amount) return toast.error("Amount is required");
                  createInvoice.mutate({ amount: parseFloat(newInvoice.amount), currency: newInvoice.currency, description: newInvoice.description || undefined, invoiceNumber: newInvoice.invoiceNumber || undefined });
                }} disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-blue-400">${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-red-400">${totalOverdue.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Collected</p>
          <p className="text-2xl font-bold text-green-400">${totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "draft", "sent", "overdue", "paid", "disputed"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <div className="space-y-3">
        {invoices.map(inv => (
          <div key={inv.id} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span>
                  <Badge className={`text-xs ${STATUS_COLORS[inv.status ?? "draft"]}`}>{inv.status}</Badge>
                  {inv.chaseCount! > 0 && <Badge variant="outline" className="text-xs">{inv.chaseCount} chases</Badge>}
                </div>
                <p className="text-2xl font-bold">${parseFloat(inv.amount ?? "0").toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{inv.currency}</span></p>
                {inv.description && <p className="text-xs text-muted-foreground mt-1">{inv.description}</p>}
                {inv.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Select value={inv.status ?? "draft"} onValueChange={v => updateStatus.mutate({ id: inv.id, status: v as any })}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="paid">Paid ✓</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="written_off">Written Off</SelectItem>
                  </SelectContent>
                </Select>
                {["sent", "overdue"].includes(inv.status ?? "") && (
                  <Button size="sm" variant="outline" onClick={() => { setChaseOpen(inv.id); setChaseMessage(""); }}>
                    <Bot className="w-3 h-3 mr-1" />AI Chase
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {invoices.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm">Create your first invoice to start tracking collections</p>
          </div>
        )}
      </div>

      {/* AI Chase Dialog */}
      {chaseOpen !== null && (
        <Dialog open={chaseOpen !== null} onOpenChange={() => { setChaseOpen(null); setChaseMessage(""); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>AI Chase Message</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Select value={chaseTone} onValueChange={v => setChaseTone(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly Reminder</SelectItem>
                  <SelectItem value="firm">Firm Follow-up</SelectItem>
                  <SelectItem value="final_notice">Final Notice</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={() => generateChase.mutate({ invoiceId: chaseOpen!, tone: chaseTone })} disabled={generateChase.isPending}>
                {generateChase.isPending ? "Generating..." : "Generate Message"}
              </Button>
              {chaseMessage && (
                <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">{chaseMessage}</div>
              )}
              {chaseMessage && (
                <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(chaseMessage); toast.success("Copied to clipboard"); }}>
                  Copy Message
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </PageShell>
  );
}
