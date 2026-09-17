import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users, ClipboardList, AlertTriangle, CheckCircle2,
  Loader2,
} from "lucide-react";

export default function IndianTeamPortal() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [updateNote, setUpdateNote] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [workType, setWorkType] = useState<"bookkeeping" | "tax_prep" | "payroll" | "reconciliation" | "cleanup" | "review" | "other">("bookkeeping");

  const { data: queue, refetch: refetchQueue } = trpc.indianTeam.getExceptionQueue.useQuery({});
  const { data: tasks, refetch: refetchTasks } = trpc.indianTeam.getTaskLog.useQuery({});

  const openCount = queue?.filter((q) => q.status === "open").length ?? 0;
  const inProgressCount = queue?.filter((q) => q.status === "in_progress").length ?? 0;
  const totalHours = tasks?.reduce((sum, t) => sum + (parseFloat(String(t.hoursWorked ?? 0)) || 0), 0) ?? 0;

  const assignException = trpc.indianTeam.assignException.useMutation({
    onSuccess: () => { refetchQueue(); toast.success("Exception assigned"); },
    onError: () => toast.error("Failed to assign exception"),
  });

  const updateTaxOrderStatus = trpc.indianTeam.updateTaxOrderStatus.useMutation({
    onSuccess: () => { refetchTasks(); setUpdateNote(""); toast.success("Status updated"); },
    onError: () => toast.error("Failed to update status"),
  });

  const logTask = trpc.indianTeam.logTask.useMutation({
    onSuccess: () => { refetchTasks(); setHoursWorked(""); toast.success("Hours logged"); },
    onError: () => toast.error("Failed to log hours"),
  });

  const statusColor = (s: string) => {
    if (s === "completed" || s === "filed") return "text-green-600";
    if (s === "in_progress") return "text-blue-600";
    if (s === "open" || s === "pending") return "text-yellow-600";
    return "text-muted-foreground";
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">The Indian Team Portal is only accessible to team members with admin access.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <PageShell title="Indian Team Portal" subtitle="Internal portal for the VonWork India team" icon={<Users className="w-5 h-5" />}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" />Indian Team Portal</h1>
          <p className="text-muted-foreground">CPA team task queue, exception handling, and hours tracking</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open Exceptions</p>
            <p className="text-2xl font-bold text-yellow-600">{openCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Task Log Entries</p>
            <p className="text-2xl font-bold text-green-600">{tasks?.length ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Hours Logged</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Exception Queue</TabsTrigger>
            <TabsTrigger value="tasks">Task Log</TabsTrigger>
            <TabsTrigger value="hours">Log Hours</TabsTrigger>
          </TabsList>

          {/* Exception Queue */}
          <TabsContent value="queue" className="space-y-3">
            {queue && queue.length > 0 ? queue.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{item.type}</Badge>
                        <Badge variant="secondary">{item.priority}</Badge>
                        <span className={`text-xs font-medium ${statusColor(item.status ?? "open")}`}>{item.status}</span>
                      </div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    {item.status === "open" && (
                      <Button size="sm" disabled={assignException.isPending}
                        onClick={() => assignException.mutate({ exceptionId: item.id, teamMemberId: user?.id ?? 0 })}>
                        {assignException.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign to Me"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No open exceptions — queue is clear!</p>
              </div>
            )}
          </TabsContent>

          {/* Task Log */}
          <TabsContent value="tasks" className="space-y-3">
            {tasks && tasks.length > 0 ? tasks.map((task) => (
              <Card key={task.id} className={selectedTaskId === task.id ? "border-primary" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{task.taskType}</Badge>
                        <span className={`text-xs font-medium ${statusColor(task.status ?? "pending")}`}>{task.status}</span>
                        <span className="text-xs text-muted-foreground">{task.hoursWorked}h</span>
                        {task.amountBilled != null && (
                          <span className="text-xs font-medium text-green-600">${task.amountBilled}</span>
                        )}
                      </div>
                      <p className="text-sm">{task.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(task.createdAt).toLocaleString()}</p>
                    </div>
                    {task.taxOrderId != null && (
                      <Button size="sm" variant="outline"
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}>
                        Update Order
                      </Button>
                    )}
                  </div>
                  {selectedTaskId === task.id && task.taxOrderId != null && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      <Select onValueChange={(status) =>
                        updateTaxOrderStatus.mutate({ taxOrderId: task.taxOrderId!, status: status as any, notes: updateNote })
                      }>
                        <SelectTrigger><SelectValue placeholder="Update tax order status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="documents_requested">Documents Requested</SelectItem>
                          <SelectItem value="review">In Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="filed">Filed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea placeholder="Add a note..." value={updateNote} onChange={e => setUpdateNote(e.target.value)} rows={2} />
                      <Button size="sm" className="w-full" disabled={updateTaxOrderStatus.isPending}
                        onClick={() => updateTaxOrderStatus.mutate({ taxOrderId: task.taxOrderId!, status: "in_progress", notes: updateNote })}>
                        {updateTaxOrderStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Update"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-12">
                <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No tasks logged yet</p>
              </div>
            )}
          </TabsContent>

          {/* Log Hours */}
          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Log Hours</CardTitle>
                <CardDescription>Track time against client work — SOW rates: $10/hr bookkeeping · $20/hr cleanup · $5/employee payroll</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Hours worked</label>
                    <Input type="number" min={0.5} step={0.5} placeholder="e.g. 2.5" value={hoursWorked} onChange={e => setHoursWorked(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Tax Order ID (optional)</label>
                    <Input type="number" placeholder="Tax Order ID" onChange={e => setSelectedTaskId(parseInt(e.target.value) || null)} />
                  </div>
                </div>
                <Select value={workType} onValueChange={(v) => setWorkType(v as typeof workType)}>
                  <SelectTrigger><SelectValue placeholder="Work type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bookkeeping">Bookkeeping — $10/hr</SelectItem>
                    <SelectItem value="cleanup">Cleanup / Catch-up — $20/hr</SelectItem>
                    <SelectItem value="payroll">Payroll — $5/employee</SelectItem>
                    <SelectItem value="tax_prep">Tax Preparation</SelectItem>
                    <SelectItem value="reconciliation">Reconciliation</SelectItem>
                    <SelectItem value="review">Review / QA</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={!hoursWorked || logTask.isPending}
                  onClick={() => logTask.mutate({
                    teamMemberId: user?.id ?? 0,
                    taskType: workType,
                    description: `${workType} work logged`,
                    hoursWorked: parseFloat(hoursWorked),
                    taxOrderId: selectedTaskId ?? undefined,
                  })}>
                  {logTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Log Hours
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
