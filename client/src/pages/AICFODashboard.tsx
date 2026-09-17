import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, MessageSquare,
  FileText, Plus, Upload, Bot, Building2, ArrowUpRight, ArrowDownRight,
  Loader2, Send, RefreshCw, ChevronRight
} from "lucide-react";

export default function AICFODashboard() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientType, setNewClientType] = useState<string>("llc");
  const [newClientIndustry, setNewClientIndustry] = useState("");
  const [cfoMessage, setCfoMessage] = useState("");
  const [cfoHistory, setCfoHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [taxQuestion, setTaxQuestion] = useState("");
  const [taxAnswer, setTaxAnswer] = useState("");
  const [selectedFormType, setSelectedFormType] = useState<string>("");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [extraSchedules, setExtraSchedules] = useState(0);
  const [extraStates, setExtraStates] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Add transaction state
  const [txDesc, setTxDesc] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = useState("");
  const [txVendor, setTxVendor] = useState("");
  const [showAddTx, setShowAddTx] = useState(false);

  const { data: clients, refetch: refetchClients } = trpc.aicfo.getMyClients.useQuery();
  const { data: transactions } = trpc.aicfo.getTransactions.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );
  const { data: pnl } = trpc.aicfo.getProfitLoss.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );
  const { data: taxPricing } = trpc.aicfo.getTaxPricing.useQuery();
  const { data: myTaxOrders, refetch: refetchOrders } = trpc.aicfo.getMyTaxOrders.useQuery();

  const createClient = trpc.aicfo.createClient.useMutation({
    onSuccess: () => { refetchClients(); setNewClientName(""); toast.success("Client created"); },
    onError: () => toast.error("Failed to create client"),
  });

  const cfoChat = trpc.aicfo.cfoChat.useMutation({
    onSuccess: (data) => {
      const newHistory: { role: "user" | "assistant"; content: string }[] = [
        ...cfoHistory,
        { role: "user", content: cfoMessage },
        { role: "assistant", content: data.reply },
      ];
      setCfoHistory(newHistory);
      setCfoMessage("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: () => toast.error("CFO chat failed"),
  });

  const askTax = trpc.aicfo.askTaxQuestion.useMutation({
    onSuccess: (data) => setTaxAnswer(data.answer),
    onError: () => toast.error("Tax question failed"),
  });

  const createTaxOrder = trpc.aicfo.createTaxOrder.useMutation({
    onSuccess: (data) => {
      refetchOrders();
      toast.success(`Tax order placed! Total: $${data.totalPrice}`);
      setSelectedFormType("");
      setOrderNotes("");
    },
    onError: () => toast.error("Failed to place tax order"),
  });

  const addTransaction = trpc.aicfo.addTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transaction added");
      setTxDesc(""); setTxAmount(""); setTxVendor(""); setTxCategory("");
      setShowAddTx(false);
      // Refetch by invalidating
      trpc.useUtils().aicfo.getTransactions.invalidate();
    },
    onError: () => toast.error("Failed to add transaction"),
  });

  const categorize = trpc.aicfo.categorizeTransaction.useMutation({
    onSuccess: (data) => {
      toast.success(`AI categorized: ${data.category}`);
      trpc.useUtils().aicfo.getTransactions.invalidate();
    },
    onError: () => toast.error("AI categorization failed"),
  });

  const selectedClient = clients?.find(c => c.id === selectedClientId);
  const currentYear = new Date().getFullYear();

  const selectedForm = taxPricing?.forms.find(f => f.id === selectedFormType);
  const orderTotal = selectedForm
    ? selectedForm.price + extraSchedules * 20 + extraStates * 20
    : 0;

  return (
    <PageShell title="AI CFO Suite" subtitle="Bookkeeping, tax services, and strategic financial intelligence" icon={<DollarSign className="w-5 h-5" />}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {/* Title moved to PageShell header */}
            <p className="text-muted-foreground">Bookkeeping, tax services, and strategic financial intelligence</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/aicfo/pricing"}>
              View Plans
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Client</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Accounting Client</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Business name" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                  <Select value={newClientType} onValueChange={setNewClientType}>
                    <SelectTrigger><SelectValue placeholder="Business type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="sole_trader">Sole Trader</SelectItem>
                      <SelectItem value="llc">LLC</SelectItem>
                      <SelectItem value="s_corp">S Corporation</SelectItem>
                      <SelectItem value="c_corp">C Corporation</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="trust">Trust / Estate</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Industry (optional)" value={newClientIndustry} onChange={e => setNewClientIndustry(e.target.value)} />
                  <Button className="w-full" disabled={!newClientName || createClient.isPending}
                    onClick={() => createClient.mutate({ businessName: newClientName, businessType: newClientType as any, industry: newClientIndustry || undefined })}>
                    {createClient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Client"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Client selector */}
        {clients && clients.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {clients.map(c => (
              <Button key={c.id} variant={selectedClientId === c.id ? "default" : "outline"} size="sm"
                onClick={() => setSelectedClientId(c.id)}>
                <Building2 className="w-3 h-3 mr-1" />
                {c.businessName}
                <Badge variant="secondary" className="ml-2 text-xs">{c.businessType}</Badge>
              </Button>
            ))}
          </div>
        )}

        {!selectedClientId && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No client selected</h3>
              <p className="text-muted-foreground mb-4">Add a client to start using the AI CFO Suite</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Your First Client</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Accounting Client</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input placeholder="Business name" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                    <Select value={newClientType} onValueChange={setNewClientType}>
                      <SelectTrigger><SelectValue placeholder="Business type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="sole_trader">Sole Trader</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="s_corp">S Corporation</SelectItem>
                        <SelectItem value="c_corp">C Corporation</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="trust">Trust / Estate</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="w-full" disabled={!newClientName || createClient.isPending}
                      onClick={() => createClient.mutate({ businessName: newClientName, businessType: newClientType as any })}>
                      {createClient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Client"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {selectedClientId && (
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookkeeper">Bookkeeper</TabsTrigger>
              <TabsTrigger value="cfo">AI CFO Chat</TabsTrigger>
              <TabsTrigger value="tax">Tax Services</TabsTrigger>
              <TabsTrigger value="orders">My Orders</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              {pnl && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-600">${pnl.income.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <ArrowUpRight className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Expenses</p>
                          <p className="text-2xl font-bold text-red-500">${pnl.expenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <ArrowDownRight className="w-8 h-8 text-red-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Net Profit</p>
                          <p className={`text-2xl font-bold ${pnl.netProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>
                            ${pnl.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {pnl && Object.keys(pnl.byCategory).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(pnl.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                        <div key={cat} className="flex items-center justify-between py-1 border-b last:border-0">
                          <span className="text-sm">{cat}</span>
                          <span className="text-sm font-medium">${(amt as number).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No transactions yet. Add transactions in the Bookkeeper tab.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookkeeper */}
            <TabsContent value="bookkeeper" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" />Transaction Ledger</CardTitle>
                    <CardDescription>AI-categorized transactions for {selectedClient?.businessName}</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowAddTx(v => !v)} disabled={!selectedClientId}>
                    <Plus className="w-4 h-4 mr-1" />{showAddTx ? "Cancel" : "Add Transaction"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showAddTx && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                      <h4 className="text-sm font-semibold">New Transaction</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={txType} onValueChange={v => setTxType(v as "income" | "expense")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Amount ($)" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
                      </div>
                      <Input placeholder="Description" value={txDesc} onChange={e => setTxDesc(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Vendor (optional)" value={txVendor} onChange={e => setTxVendor(e.target.value)} />
                        <Input placeholder="Category (optional)" value={txCategory} onChange={e => setTxCategory(e.target.value)} />
                      </div>
                      <Button size="sm" className="w-full" disabled={!txDesc || !txAmount || addTransaction.isPending}
                        onClick={() => addTransaction.mutate({ clientId: selectedClientId!, description: txDesc, amount: parseFloat(txAmount), type: txType, vendor: txVendor || undefined, category: txCategory || undefined, date: Date.now() })}>
                        {addTransaction.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Save Transaction
                      </Button>
                    </div>
                  )}
                  {transactions && transactions.length > 0 ? (
                    <div className="space-y-1">
                      {transactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.category ? (
                                <span className="text-green-600">{t.category}</span>
                              ) : (
                                <button className="text-blue-500 hover:underline" onClick={() => categorize.mutate({ description: t.description, amount: parseFloat(t.amount as string), vendor: t.vendor ?? undefined })}>
                                  {categorize.isPending ? "Categorizing..." : "AI Categorize"}
                                </button>
                              )}
                              {t.vendor ? ` · ${t.vendor}` : ""} · {new Date(t.date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                            {t.type === "income" ? "+" : "-"}${parseFloat(t.amount as string).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No transactions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Click "Add Transaction" to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI CFO Chat */}
            <TabsContent value="cfo" className="space-y-4">
              <Card className="h-[500px] flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-blue-500" />AI CFO — {selectedClient?.businessName}</CardTitle>
                  <CardDescription>Ask anything about your finances, taxes, cash flow, or growth strategy</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                    {cfoHistory.length === 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-3">Suggested questions:</p>
                        {[
                          "What are my biggest expense categories and how can I reduce them?",
                          "Am I on track for profitability this year?",
                          "What tax deductions should I be tracking?",
                          "How much should I set aside for quarterly estimated taxes?",
                          "What's my current burn rate and runway?",
                        ].map(q => (
                          <button key={q} className="w-full text-left text-sm p-2 rounded border hover:bg-accent transition-colors flex items-center justify-between"
                            onClick={() => { setCfoMessage(q); }}>
                            {q}<ChevronRight className="w-3 h-3 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                    {cfoHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {cfoChat.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Ask your AI CFO anything..." value={cfoMessage} onChange={e => setCfoMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && cfoMessage.trim()) { e.preventDefault(); cfoChat.mutate({ clientId: selectedClientId!, message: cfoMessage, history: cfoHistory }); } }} />
                    <Button disabled={!cfoMessage.trim() || cfoChat.isPending}
                      onClick={() => cfoChat.mutate({ clientId: selectedClientId!, message: cfoMessage, history: cfoHistory })}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Services */}
            <TabsContent value="tax" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Order a tax form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Order Tax Filing</CardTitle>
                    <CardDescription>Handled by our CPA team — delivered within 5–7 business days</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedFormType} onValueChange={setSelectedFormType}>
                      <SelectTrigger><SelectValue placeholder="Select tax form" /></SelectTrigger>
                      <SelectContent>
                        {taxPricing?.forms.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.label} — ${f.price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={taxYear.toString()} onValueChange={v => setTaxYear(parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Tax year" /></SelectTrigger>
                      <SelectContent>
                        {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Extra Schedules (+$20 each)</label>
                        <Input type="number" min={0} max={10} value={extraSchedules} onChange={e => setExtraSchedules(parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Extra States (+$20 each)</label>
                        <Input type="number" min={0} max={10} value={extraStates} onChange={e => setExtraStates(parseInt(e.target.value) || 0)} />
                      </div>
                    </div>
                    <Textarea placeholder="Notes for the CPA team (optional)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} />
                    {selectedForm && (
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <div className="flex justify-between"><span>Base price</span><span>${selectedForm.price}</span></div>
                        {extraSchedules > 0 && <div className="flex justify-between"><span>Extra schedules ({extraSchedules})</span><span>+${extraSchedules * 20}</span></div>}
                        {extraStates > 0 && <div className="flex justify-between"><span>Extra states ({extraStates})</span><span>+${extraStates * 20}</span></div>}
                        <div className="flex justify-between font-bold border-t mt-2 pt-2"><span>Total</span><span>${orderTotal}</span></div>
                      </div>
                    )}
                    <Button className="w-full" disabled={!selectedFormType || createTaxOrder.isPending}
                      onClick={() => createTaxOrder.mutate({ formType: selectedFormType as any, taxYear, extraSchedules, extraStates, clientId: selectedClientId ?? undefined, notes: orderNotes || undefined })}>
                      {createTaxOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Place Order {selectedForm ? `— $${orderTotal}` : ""}
                    </Button>
                  </CardContent>
                </Card>

                {/* AI Tax Q&A */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />AI Tax Advisor</CardTitle>
                    <CardDescription>Instant answers to your tax questions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {["What can I deduct as a home office?", "When are my quarterly estimated taxes due?", "Should I elect S-Corp status for my LLC?", "What is the QBI deduction and do I qualify?"].map(q => (
                        <button key={q} className="w-full text-left text-xs p-2 rounded border hover:bg-accent transition-colors"
                          onClick={() => setTaxQuestion(q)}>{q}</button>
                      ))}
                    </div>
                    <Textarea placeholder="Ask any tax question..." value={taxQuestion} onChange={e => setTaxQuestion(e.target.value)} rows={3} />
                    <Button className="w-full" disabled={!taxQuestion.trim() || askTax.isPending}
                      onClick={() => askTax.mutate({ question: taxQuestion, businessType: selectedClient?.businessType ?? undefined })}>
                      {askTax.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Get Answer
                    </Button>
                    {taxAnswer && (
                      <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {taxAnswer}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* My Orders */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Tax Order History</CardTitle>
                </CardHeader>
                <CardContent>
                  {myTaxOrders && myTaxOrders.length > 0 ? (
                    <div className="space-y-2">
                      {myTaxOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{order.formType.toUpperCase()} — Tax Year {order.taxYear}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">${parseFloat(order.totalPrice as string).toFixed(2)}</span>
                            <Badge variant={order.status === "completed" ? "default" : order.status === "review" ? "secondary" : "outline"}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No tax orders yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}
