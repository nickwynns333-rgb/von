import { useState, useMemo } from "react";
import PageShell from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DollarSign, FileText, CreditCard, Building2, BarChart3,
  Plus, RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp, TrendingDown,
  BookOpen, Landmark, Bot
, BookMarked } from "lucide-react";

const fmt = (v: string | number | null | undefined) =>
  `$${parseFloat(String(v ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColor: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  sent: "bg-blue-500/20 text-blue-400",
  paid: "bg-green-500/20 text-green-400",
  overdue: "bg-red-500/20 text-red-400",
  voided: "bg-gray-600/20 text-gray-500",
  received: "bg-blue-500/20 text-blue-400",
  approved: "bg-purple-500/20 text-purple-400",
  partial: "bg-yellow-500/20 text-yellow-400",
};

export default function AccountingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  // Invoice form state
  const [invClient, setInvClient] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invTaxRate, setInvTaxRate] = useState("0");
  const [invNotes, setInvNotes] = useState("");
  const [invLines, setInvLines] = useState([{ description: "", quantity: "1", unitPrice: "" }]);

  // Bill form state
  const [billVendor, setBillVendor] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billSubtotal, setBillSubtotal] = useState("");
  const [billNotes, setBillNotes] = useState("");

  // Bank account form
  const [bankName, setBankName] = useState("");
  const [bankBankName, setBankBankName] = useState("");
  const [bankType, setBankType] = useState<"checking" | "savings" | "credit_card">("checking");
  const [bankBalance, setBankBalance] = useState("0");

  // AI question
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");

  // Period for income statement
  const [period, setPeriod] = useState("this_month");
  const periodRange = useMemo(() => {
    const now = new Date();
    if (period === "this_month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: now.getTime() };
    } else if (period === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: start.getTime(), to: end.getTime() };
    } else {
      return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: now.getTime() };
    }
  }, [period]);

  // Queries
  const invoicesQ = trpc.accounting.listInvoices.useQuery({});
  const billsQ = trpc.accounting.listBills.useQuery({});
  const coaQ = trpc.accounting.getChartOfAccounts.useQuery();
  const bankAccountsQ = trpc.accounting.listBankAccounts.useQuery();
  const balanceSheetQ = trpc.accounting.getBalanceSheet.useQuery({});
  const incomeStmtQ = trpc.accounting.getIncomeStatement.useQuery(periodRange);
  const arAgingQ = trpc.accounting.getARAgingSummary.useQuery();
  const apAgingQ = trpc.accounting.getAPAgingSummary.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const seedCOA = trpc.accounting.seedDefaultCOA.useMutation({
    onSuccess: (data) => {
      if (data.seeded) toast.success(`Seeded ${data.count} default accounts`);
      else toast.info("Chart of accounts already exists");
      utils.accounting.getChartOfAccounts.invalidate();
    },
  });

  const createInvoice = trpc.accounting.createInvoice.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice ${data.invoiceNumber} created — Total: ${fmt(data.total)}`);
      setInvClient(""); setInvEmail(""); setInvDueDate(""); setInvTaxRate("0"); setInvNotes("");
      setInvLines([{ description: "", quantity: "1", unitPrice: "" }]);
      utils.accounting.listInvoices.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateInvoiceStatus = trpc.accounting.updateInvoiceStatus.useMutation({
    onSuccess: () => { toast.success("Invoice updated"); utils.accounting.listInvoices.invalidate(); },
  });

  const createBill = trpc.accounting.createBill.useMutation({
    onSuccess: (data) => {
      toast.success(`Bill ${data.billNumber} created — Total: ${fmt(data.total)}`);
      setBillVendor(""); setBillDueDate(""); setBillSubtotal(""); setBillNotes("");
      utils.accounting.listBills.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateBillStatus = trpc.accounting.updateBillStatus.useMutation({
    onSuccess: () => { toast.success("Bill updated"); utils.accounting.listBills.invalidate(); },
  });

  const createBankAccount = trpc.accounting.createBankAccount.useMutation({
    onSuccess: () => {
      toast.success("Bank account added");
      setBankName(""); setBankBankName(""); setBankBalance("0");
      utils.accounting.listBankAccounts.invalidate();
    },
  });

  const askAI = trpc.accounting.askAccountingAI.useMutation({
    onSuccess: (data) => setAiAnswer(data.answer),
    onError: (e) => toast.error(e.message),
  });

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-purple-400" /></div>;
  if (!user) { navigate(getLoginUrl()); return null; }

  const invoiceSubtotal = invLines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const invoiceTax = invoiceSubtotal * (parseFloat(invTaxRate) || 0) / 100;
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  const totalAR = arAgingQ.data ? Object.values(arAgingQ.data.buckets).reduce((a, b) => a + b, 0) : 0;
  const totalAP = apAgingQ.data ? Object.values(apAgingQ.data.buckets).reduce((a, b) => a + b, 0) : 0;

  return (
    <PageShell title="Accounting Back Office" subtitle="Invoicing · AP/AR · Chart of Accounts · Bank Reconciliation · Reports" icon={<BookMarked className="w-5 h-5" />}>
      <div className="space-y-6">
      <div className="flex justify-end gap-2">
          <Badge className="bg-green-100 text-green-700 border-green-200">AR: {fmt(totalAR)}</Badge>
          <Badge className="bg-red-100 text-red-700 border-red-200">AP: {fmt(totalAP)}</Badge>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="bg-gray-100 border border-gray-200 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><FileText className="w-3.5 h-3.5 mr-1" />Invoices (AR)</TabsTrigger>
          <TabsTrigger value="bills" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><CreditCard className="w-3.5 h-3.5 mr-1" />Bills (AP)</TabsTrigger>
          <TabsTrigger value="coa" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><BookOpen className="w-3.5 h-3.5 mr-1" />Chart of Accounts</TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Landmark className="w-3.5 h-3.5 mr-1" />Bank Accounts</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><BarChart3 className="w-3.5 h-3.5 mr-1" />Reports</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Bot className="w-3.5 h-3.5 mr-1" />AI Accountant</TabsTrigger>
        </TabsList>

        {/* ── Invoices ── */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base">Create Invoice</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Client name *" value={invClient} onChange={e => setInvClient(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                <Input placeholder="Client email" value={invEmail} onChange={e => setInvEmail(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Due Date *</label>
                  <Input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tax Rate (%)</label>
                  <Input type="number" placeholder="0" value={invTaxRate} onChange={e => setInvTaxRate(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Line Items</label>
                {invLines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input placeholder="Description" value={line.description} onChange={e => { const l = [...invLines]; l[i].description = e.target.value; setInvLines(l); }} className="col-span-6 bg-gray-100 border-gray-200 text-white text-sm" />
                    <Input type="number" placeholder="Qty" value={line.quantity} onChange={e => { const l = [...invLines]; l[i].quantity = e.target.value; setInvLines(l); }} className="col-span-2 bg-gray-100 border-gray-200 text-white text-sm" />
                    <Input type="number" placeholder="Unit $" value={line.unitPrice} onChange={e => { const l = [...invLines]; l[i].unitPrice = e.target.value; setInvLines(l); }} className="col-span-3 bg-gray-100 border-gray-200 text-white text-sm" />
                    <Button size="sm" variant="ghost" className="col-span-1 text-red-400" onClick={() => setInvLines(invLines.filter((_, j) => j !== i))}>✕</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setInvLines([...invLines, { description: "", quantity: "1", unitPrice: "" }])} className="text-purple-400 border-purple-500/30">
                  <Plus className="w-3 h-3 mr-1" />Add Line
                </Button>
              </div>
              <Textarea placeholder="Notes (optional)" value={invNotes} onChange={e => setInvNotes(e.target.value)} className="bg-gray-100 border-gray-200 text-white text-sm" rows={2} />
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Subtotal: {fmt(invoiceSubtotal)} · Tax: {fmt(invoiceTax)} · <span className="text-white font-semibold">Total: {fmt(invoiceTotal)}</span>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled={createInvoice.isPending || !invClient || !invDueDate || invLines.every(l => !l.description)}
                  onClick={() => createInvoice.mutate({
                    clientName: invClient, clientEmail: invEmail || undefined,
                    issueDate: Date.now(), dueDate: new Date(invDueDate).getTime(),
                    taxRate: parseFloat(invTaxRate) || 0, discountAmount: 0,
                    notes: invNotes || undefined,
                    lineItems: invLines.filter(l => l.description).map(l => ({
                      description: l.description, quantity: parseFloat(l.quantity) || 1,
                      unitPrice: parseFloat(l.unitPrice) || 0, taxable: true,
                    })),
                  })}>
                  {createInvoice.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Create Invoice"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base">Invoice List</CardTitle></CardHeader>
            <CardContent>
              {invoicesQ.isLoading ? <div className="text-gray-500 text-sm">Loading...</div> :
                invoicesQ.data?.length === 0 ? <div className="text-gray-500 text-sm text-center py-8">No invoices yet. Create your first invoice above.</div> :
                <div className="space-y-2">
                  {invoicesQ.data?.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                      <div>
                        <div className="text-gray-800 text-sm font-medium">{inv.invoiceNumber} · {inv.clientName}</div>
                        <div className="text-gray-500 text-xs">Due: {new Date(inv.dueDate).toLocaleDateString()} · {fmt(inv.total)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColor[inv.status ?? "draft"] ?? "bg-gray-500/20 text-gray-400"}>{inv.status}</Badge>
                        {inv.status === "draft" && (
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 text-xs h-7"
                            onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: "sent" })}>
                            Mark Sent
                          </Button>
                        )}
                        {(inv.status === "sent" || inv.status === "viewed" || inv.status === "partial") && (
                          <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 text-xs h-7"
                            onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: "paid", amountPaid: parseFloat(inv.total ?? "0") })}>
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>

          {/* AR Aging */}
          {arAgingQ.data && (
            <Card className="bg-white border-gray-200">
              <CardHeader><CardTitle className="text-gray-800 text-base">AR Aging Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries({ "Current": arAgingQ.data.buckets.current, "1-30 days": arAgingQ.data.buckets.days30, "31-60 days": arAgingQ.data.buckets.days60, "61-90 days": arAgingQ.data.buckets.days90, "90+ days": arAgingQ.data.buckets.over90 }).map(([label, val]) => (
                    <div key={label} className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">{label}</div>
                      <div className={`text-sm font-semibold ${val > 0 ? "text-yellow-400" : "text-gray-500"}`}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Bills (AP) ── */}
        <TabsContent value="bills" className="space-y-4 mt-4">
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base">Add Bill</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Vendor name *" value={billVendor} onChange={e => setBillVendor(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Due Date *</label>
                  <Input type="date" value={billDueDate} onChange={e => setBillDueDate(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Subtotal *" value={billSubtotal} onChange={e => setBillSubtotal(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
              </div>
              <Textarea placeholder="Notes (optional)" value={billNotes} onChange={e => setBillNotes(e.target.value)} className="bg-gray-100 border-gray-200 text-white text-sm" rows={2} />
              <Button className="bg-purple-600 hover:bg-purple-700" disabled={createBill.isPending || !billVendor || !billDueDate || !billSubtotal}
                onClick={() => createBill.mutate({
                  vendorName: billVendor, issueDate: Date.now(),
                  dueDate: new Date(billDueDate).getTime(),
                  subtotal: parseFloat(billSubtotal), notes: billNotes || undefined,
                })}>
                {createBill.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Add Bill"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base">Bills List</CardTitle></CardHeader>
            <CardContent>
              {billsQ.isLoading ? <div className="text-gray-500 text-sm">Loading...</div> :
                billsQ.data?.length === 0 ? <div className="text-gray-500 text-sm text-center py-8">No bills yet.</div> :
                <div className="space-y-2">
                  {billsQ.data?.map(bill => (
                    <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                      <div>
                        <div className="text-gray-800 text-sm font-medium">{bill.billNumber} · {bill.vendorName}</div>
                        <div className="text-gray-500 text-xs">Due: {new Date(bill.dueDate).toLocaleDateString()} · {fmt(bill.total)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColor[bill.status ?? "draft"] ?? "bg-gray-500/20 text-gray-400"}>{bill.status}</Badge>
                        {bill.status === "draft" && (
                          <Button size="sm" variant="outline" className="text-blue-400 border-blue-500/30 text-xs h-7"
                            onClick={() => updateBillStatus.mutate({ id: bill.id, status: "received" })}>
                            Mark Received
                          </Button>
                        )}
                        {(bill.status === "received" || bill.status === "approved" || bill.status === "partial") && (
                          <Button size="sm" variant="outline" className="text-green-400 border-green-500/30 text-xs h-7"
                            onClick={() => updateBillStatus.mutate({ id: bill.id, status: "paid", amountPaid: parseFloat(bill.total ?? "0") })}>
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>

          {/* AP Aging */}
          {apAgingQ.data && (
            <Card className="bg-white border-gray-200">
              <CardHeader><CardTitle className="text-gray-800 text-base">AP Aging Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries({ "Current": apAgingQ.data.buckets.current, "1-30 days": apAgingQ.data.buckets.days30, "31-60 days": apAgingQ.data.buckets.days60, "61-90 days": apAgingQ.data.buckets.days90, "90+ days": apAgingQ.data.buckets.over90 }).map(([label, val]) => (
                    <div key={label} className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">{label}</div>
                      <div className={`text-sm font-semibold ${val > 0 ? "text-red-400" : "text-gray-500"}`}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Chart of Accounts ── */}
        <TabsContent value="coa" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">Double-entry bookkeeping chart of accounts</p>
            {coaQ.data?.length === 0 && (
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => seedCOA.mutate()} disabled={seedCOA.isPending}>
                {seedCOA.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Seed Default Chart of Accounts
              </Button>
            )}
          </div>
          {coaQ.isLoading ? <div className="text-gray-500 text-sm">Loading...</div> :
            coaQ.data?.length === 0 ? (
              <Card className="bg-white border-gray-200">
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No accounts yet. Click "Seed Default Chart of Accounts" to get started with 23 standard accounts.</p>
                </CardContent>
              </Card>
            ) : (
              ["asset", "liability", "equity", "revenue", "expense"].map(type => {
                const accounts = coaQ.data?.filter(a => a.type === type) ?? [];
                if (accounts.length === 0) return null;
                const typeColors: Record<string, string> = { asset: "text-green-400", liability: "text-red-400", equity: "text-blue-400", revenue: "text-purple-400", expense: "text-orange-400" };
                return (
                  <Card key={type} className="bg-white border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm uppercase tracking-wider ${typeColors[type]}`}>{type}s</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {accounts.map(acc => (
                          <div key={acc.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 text-xs font-mono w-12">{acc.accountNumber}</span>
                              <span className="text-white text-sm">{acc.name}</span>
                              {acc.subtype && <span className="text-gray-500 text-xs">({acc.subtype})</span>}
                            </div>
                            <span className="text-gray-300 text-sm font-mono">{fmt(acc.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )
          }
        </TabsContent>

        {/* ── Bank Accounts ── */}
        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base">Add Bank Account</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Account name *" value={bankName} onChange={e => setBankName(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                <Input placeholder="Bank name" value={bankBankName} onChange={e => setBankBankName(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
                <Select value={bankType} onValueChange={(v: any) => setBankType(v)}>
                  <SelectTrigger className="bg-gray-100 border-gray-200 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Current balance" value={bankBalance} onChange={e => setBankBalance(e.target.value)} className="bg-gray-100 border-gray-200 text-white" />
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700" disabled={createBankAccount.isPending || !bankName}
                onClick={() => createBankAccount.mutate({ name: bankName, bankName: bankBankName || undefined, type: bankType, currentBalance: parseFloat(bankBalance) || 0 })}>
                Add Account
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccountsQ.data?.map(acct => (
              <Card key={acct.id} className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-800 font-medium text-sm">{acct.name}</span>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">{acct.type}</Badge>
                  </div>
                  {acct.bankName && <p className="text-gray-500 text-xs mb-2">{acct.bankName}</p>}
                  <div className="text-2xl font-bold text-white">{fmt(acct.currentBalance)}</div>
                  <div className="text-xs text-gray-500 mt-1">{acct.currency}</div>
                </CardContent>
              </Card>
            ))}
            {bankAccountsQ.data?.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">No bank accounts added yet.</div>
            )}
          </div>
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <label className="text-gray-500 text-sm">Period:</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-gray-100 border-gray-200 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Income Statement */}
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />Income Statement (P&L)</CardTitle></CardHeader>
            <CardContent>
              {incomeStmtQ.isLoading ? <div className="text-gray-500 text-sm">Loading...</div> : (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-green-400 font-medium">Total Revenue</span>
                    <span className="text-green-400 font-bold">{fmt(incomeStmtQ.data?.revenue)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-red-400 font-medium">Total Expenses</span>
                    <span className="text-red-400 font-bold">{fmt(incomeStmtQ.data?.expenses)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-gray-100 rounded-lg px-3">
                    <span className="text-gray-800 font-bold">Net Income</span>
                    <span className={`font-bold text-lg ${(incomeStmtQ.data?.netIncome ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmt(incomeStmtQ.data?.netIncome)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Balance Sheet */}
          <Card className="bg-white border-gray-200">
            <CardHeader><CardTitle className="text-gray-800 text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" />Balance Sheet</CardTitle></CardHeader>
            <CardContent>
              {balanceSheetQ.isLoading ? <div className="text-gray-500 text-sm">Loading...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-green-400 font-semibold mb-2 text-sm uppercase">Assets</h3>
                    {balanceSheetQ.data?.assets.map(a => (
                      <div key={a.id} className="flex justify-between text-sm py-1">
                        <span className="text-gray-300">{a.name}</span>
                        <span className="text-white font-mono">{fmt(a.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm py-1 border-t border-gray-700 mt-1">
                      <span className="text-gray-300">Accounts Receivable</span>
                      <span className="text-white font-mono">{fmt(balanceSheetQ.data?.arTotal)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-red-400 font-semibold mb-2 text-sm uppercase">Liabilities</h3>
                    {balanceSheetQ.data?.liabilities.map(a => (
                      <div key={a.id} className="flex justify-between text-sm py-1">
                        <span className="text-gray-300">{a.name}</span>
                        <span className="text-white font-mono">{fmt(a.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm py-1 border-t border-gray-700 mt-1">
                      <span className="text-gray-300">Accounts Payable</span>
                      <span className="text-white font-mono">{fmt(balanceSheetQ.data?.apTotal)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-blue-400 font-semibold mb-2 text-sm uppercase">Equity</h3>
                    {balanceSheetQ.data?.equity.map(a => (
                      <div key={a.id} className="flex justify-between text-sm py-1">
                        <span className="text-gray-300">{a.name}</span>
                        <span className="text-white font-mono">{fmt(a.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Accountant ── */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-800 text-base flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />AI Accounting Assistant
              </CardTitle>
              <p className="text-gray-500 text-sm">Ask anything about your books, taxes, cash flow, or accounting best practices.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {["What is my current cash position?", "How can I improve my AR collection?", "What expenses should I categorize differently?", "Explain my P&L for this month"].map(q => (
                  <Button key={q} size="sm" variant="outline" className="text-left text-xs text-gray-300 border-gray-600 h-auto py-2 justify-start"
                    onClick={() => setAiQuestion(q)}>
                    {q}
                  </Button>
                ))}
              </div>
              <Textarea placeholder="Ask your AI accountant anything..." value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} className="bg-gray-100 border-gray-200 text-white" rows={3} />
              <Button className="bg-purple-600 hover:bg-purple-700" disabled={askAI.isPending || !aiQuestion.trim()}
                onClick={() => askAI.mutate({ question: aiQuestion })}>
                {askAI.isPending ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Thinking...</> : "Ask AI Accountant"}
              </Button>
              {aiAnswer && (
                <div className="p-4 bg-gray-100 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 text-sm font-medium">AI Accountant</span>
                  </div>
                  <p className="text-gray-200 text-sm whitespace-pre-wrap">{aiAnswer}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
