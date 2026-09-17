import { useState } from "react";
import PageShell from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, DollarSign, Plus, CheckCircle, Clock, FileText , Banknote } from "lucide-react";

export default function PayrollPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("workers");
  const [newWorkerOpen, setNewWorkerOpen] = useState(false);
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: "", type: "contractor" as any, email: "", phone: "", payRate: "", payType: "hourly" as any });
  const [runPeriodStart, setRunPeriodStart] = useState("");
  const [runPeriodEnd, setRunPeriodEnd] = useState("");
  const [runEntries, setRunEntries] = useState<Array<{ workerId: number; hoursWorked: string; grossPay: string; deductions: string }>>([]);

  const { data: workers = [], refetch: refetchWorkers } = trpc.payroll.listWorkers.useQuery();
  const { data: runs = [], refetch: refetchRuns } = trpc.payroll.listRuns.useQuery();

  const addWorker = trpc.payroll.addWorker.useMutation({
    onSuccess: () => { refetchWorkers(); setNewWorkerOpen(false); toast.success("Worker added"); setNewWorker({ name: "", type: "contractor", email: "", phone: "", payRate: "", payType: "hourly" }); },
    onError: () => toast.error("Failed to add worker"),
  });

  const createRun = trpc.payroll.createRun.useMutation({
    onSuccess: () => { refetchRuns(); setNewRunOpen(false); toast.success("Payroll run created"); setRunEntries([]); },
    onError: () => toast.error("Failed to create payroll run"),
  });

  const approveRun = trpc.payroll.approveRun.useMutation({
    onSuccess: () => { refetchRuns(); toast.success("Payroll run approved"); },
  });

  const totalPayroll = runs.reduce((s, r) => s + parseFloat(r.totalGross ?? "0"), 0);

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <PageShell title="Payroll" subtitle="Automated payroll processing, tax calculations, and employee compensation management" icon={<Banknote className="w-5 h-5" />}>
      <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Workers</p>
          <p className="text-2xl font-bold">{workers.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pay Runs</p>
          <p className="text-2xl font-bold">{runs.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Payroll</p>
          <p className="text-2xl font-bold">${totalPayroll.toLocaleString()}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="workers"><Users className="w-3 h-3 mr-1" />Workers ({workers.length})</TabsTrigger>
            <TabsTrigger value="runs"><FileText className="w-3 h-3 mr-1" />Pay Runs ({runs.length})</TabsTrigger>
          </TabsList>
          {tab === "workers" && (
            <Dialog open={newWorkerOpen} onOpenChange={setNewWorkerOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Worker</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Full name *" value={newWorker.name} onChange={e => setNewWorker(p => ({ ...p, name: e.target.value }))} />
                  <Select value={newWorker.type} onValueChange={v => setNewWorker(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Email" value={newWorker.email} onChange={e => setNewWorker(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Phone" value={newWorker.phone} onChange={e => setNewWorker(p => ({ ...p, phone: e.target.value }))} />
                  <div className="flex gap-2">
                    <Input placeholder="Pay rate" type="number" value={newWorker.payRate} onChange={e => setNewWorker(p => ({ ...p, payRate: e.target.value }))} />
                    <Select value={newWorker.payType} onValueChange={v => setNewWorker(p => ({ ...p, payType: v }))}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="salary">Salary</SelectItem>
                        <SelectItem value="per_task">Per Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => addWorker.mutate({ ...newWorker, payRate: newWorker.payRate ? parseFloat(newWorker.payRate) : undefined })} disabled={!newWorker.name || addWorker.isPending}>
                    {addWorker.isPending ? "Adding..." : "Add Worker"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {tab === "runs" && (
            <Dialog open={newRunOpen} onOpenChange={setNewRunOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />New Pay Run</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>New Payroll Run</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Period Start</label>
                      <Input type="date" value={runPeriodStart} onChange={e => setRunPeriodStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Period End</label>
                      <Input type="date" value={runPeriodEnd} onChange={e => setRunPeriodEnd(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Worker Entries</p>
                      <Button size="sm" variant="outline" onClick={() => setRunEntries(p => [...p, { workerId: workers[0]?.id ?? 0, hoursWorked: "", grossPay: "", deductions: "0" }])}>
                        <Plus className="w-3 h-3 mr-1" />Add Entry
                      </Button>
                    </div>
                    {runEntries.map((entry, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                        <Select value={entry.workerId.toString()} onValueChange={v => setRunEntries(p => p.map((e, j) => j === i ? { ...e, workerId: parseInt(v) } : e))}>
                          <SelectTrigger><SelectValue placeholder="Worker" /></SelectTrigger>
                          <SelectContent>
                            {workers.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Hours" type="number" value={entry.hoursWorked} onChange={e => setRunEntries(p => p.map((en, j) => j === i ? { ...en, hoursWorked: e.target.value } : en))} />
                        <Input placeholder="Gross pay" type="number" value={entry.grossPay} onChange={e => setRunEntries(p => p.map((en, j) => j === i ? { ...en, grossPay: e.target.value } : en))} />
                        <Input placeholder="Deductions" type="number" value={entry.deductions} onChange={e => setRunEntries(p => p.map((en, j) => j === i ? { ...en, deductions: e.target.value } : en))} />
                      </div>
                    ))}
                    {runEntries.length === 0 && <p className="text-sm text-muted-foreground">Add at least one worker entry.</p>}
                  </div>
                  <Button className="w-full" onClick={() => {
                    if (!runPeriodStart || !runPeriodEnd || runEntries.length === 0) return toast.error("Fill in all fields");
                    createRun.mutate({
                      periodStart: new Date(runPeriodStart).getTime(),
                      periodEnd: new Date(runPeriodEnd).getTime(),
                      entries: runEntries.map(e => ({
                        workerId: e.workerId,
                        hoursWorked: e.hoursWorked ? parseFloat(e.hoursWorked) : undefined,
                        grossPay: parseFloat(e.grossPay) || 0,
                        deductions: parseFloat(e.deductions) || 0,
                      })),
                    });
                  }} disabled={createRun.isPending}>
                    {createRun.isPending ? "Creating..." : "Create Pay Run"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="workers" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workers.map(w => (
              <div key={w.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{w.type}</Badge>
                  </div>
                  {w.payRate && (
                    <div className="text-right">
                      <p className="font-bold text-primary">${parseFloat(w.payRate).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">/{w.payType}</p>
                    </div>
                  )}
                </div>
                {w.email && <p className="text-xs text-muted-foreground mt-2">{w.email}</p>}
              </div>
            ))}
            {workers.length === 0 && (
              <div className="col-span-3 text-center text-muted-foreground py-12">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No workers yet. Add your first worker.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <div className="space-y-3">
            {runs.map(run => (
              <div key={run.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {new Date(run.periodStart).toLocaleDateString()} — {new Date(run.periodEnd).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-muted-foreground">Gross: <span className="text-foreground font-medium">${parseFloat(run.totalGross ?? "0").toLocaleString()}</span></span>
                    <span className="text-sm text-muted-foreground">Net: <span className="text-foreground font-medium">${parseFloat(run.totalNet ?? "0").toLocaleString()}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={run.status === "paid" ? "default" : run.status === "approved" ? "secondary" : "outline"}>
                    {run.status}
                  </Badge>
                  {run.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => approveRun.mutate({ runId: run.id })} disabled={approveRun.isPending}>
                      <CheckCircle className="w-3 h-3 mr-1" />Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {runs.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No payroll runs yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
