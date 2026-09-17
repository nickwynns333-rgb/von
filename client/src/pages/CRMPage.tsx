import { useState } from "react";
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
import { Users, Building2, TrendingUp, CheckSquare, Plus, Trash2, Edit, Phone, Mail, Star } from "lucide-react";

export default function CRMPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("deals");
  const [contactSearch, setContactSearch] = useState("");
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newCompanyOpen, setNewCompanyOpen] = useState(false);

  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", notes: "" });
  const [newCompany, setNewCompany] = useState({ name: "", industry: "", website: "", phone: "" });
  const [newDeal, setNewDeal] = useState({ title: "", value: "", stageId: "lead", notes: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as any });

  const { data: contacts = [], refetch: refetchContacts } = trpc.crm.listContacts.useQuery({ search: contactSearch || undefined });
  const { data: companies = [], refetch: refetchCompanies } = trpc.crm.listCompanies.useQuery();
  const { data: pipelines = [], refetch: refetchPipelines } = trpc.crm.listPipelines.useQuery();
  const { data: deals = [], refetch: refetchDeals } = trpc.crm.listDeals.useQuery({});
  const { data: tasks = [], refetch: refetchTasks } = trpc.crm.listTasks.useQuery({ status: "all" });

  const createContact = trpc.crm.createContact.useMutation({
    onSuccess: () => { refetchContacts(); setNewContactOpen(false); toast.success("Contact added"); setNewContact({ firstName: "", lastName: "", email: "", phone: "", title: "", notes: "" }); },
    onError: () => toast.error("Failed to add contact"),
  });

  const deleteContact = trpc.crm.deleteContact.useMutation({
    onSuccess: () => { refetchContacts(); toast.success("Contact deleted"); },
  });

  const createCompany = trpc.crm.createCompany.useMutation({
    onSuccess: () => { refetchCompanies(); setNewCompanyOpen(false); toast.success("Company added"); setNewCompany({ name: "", industry: "", website: "", phone: "" }); },
  });

  const createDeal = trpc.crm.createDeal.useMutation({
    onSuccess: () => {
      refetchDeals();
      setNewDealOpen(false);
      toast.success("Deal created");
      setNewDeal({ title: "", value: "", stageId: "lead", notes: "" });
    },
    onError: () => toast.error("Failed to create deal"),
  });

  const updateDeal = trpc.crm.updateDeal.useMutation({
    onSuccess: () => { refetchDeals(); toast.success("Deal updated"); },
  });

  const deleteDeal = trpc.crm.deleteDeal.useMutation({
    onSuccess: () => { refetchDeals(); toast.success("Deal deleted"); },
  });

  const createTask = trpc.crm.createTask.useMutation({
    onSuccess: () => { refetchTasks(); setNewTaskOpen(false); toast.success("Task created"); setNewTask({ title: "", description: "", priority: "medium" }); },
  });

  const updateTask = trpc.crm.updateTask.useMutation({
    onSuccess: () => refetchTasks(),
  });

  const pipeline = pipelines[0];
  const stages: Array<{ id: string; name: string; color: string; order: number }> = (pipeline?.stages as any) ?? [];

  if (!user) return <div className="flex items-center justify-center h-full text-muted-foreground">Please log in.</div>;

  return (
    <div className="space-y-0">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5" />CRM</h1>
            <p className="text-sm text-white/70 mt-0.5">Contacts, Companies, Deals & Tasks</p>
          </div>
        <div className="flex gap-2">
          {tab === "contacts" && (
            <Dialog open={newContactOpen} onOpenChange={setNewContactOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Contact</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First name" value={newContact.firstName} onChange={e => setNewContact(p => ({ ...p, firstName: e.target.value }))} />
                    <Input placeholder="Last name" value={newContact.lastName} onChange={e => setNewContact(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                  <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} />
                  <Input placeholder="Title" value={newContact.title} onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="Notes" value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} rows={2} />
                  <Button className="w-full" onClick={() => createContact.mutate(newContact)} disabled={createContact.isPending}>
                    {createContact.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {tab === "companies" && (
            <Dialog open={newCompanyOpen} onOpenChange={setNewCompanyOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Company</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Company name *" value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Industry" value={newCompany.industry} onChange={e => setNewCompany(p => ({ ...p, industry: e.target.value }))} />
                  <Input placeholder="Website" value={newCompany.website} onChange={e => setNewCompany(p => ({ ...p, website: e.target.value }))} />
                  <Input placeholder="Phone" value={newCompany.phone} onChange={e => setNewCompany(p => ({ ...p, phone: e.target.value }))} />
                  <Button className="w-full" onClick={() => createCompany.mutate(newCompany)} disabled={!newCompany.name || createCompany.isPending}>
                    {createCompany.isPending ? "Adding..." : "Add Company"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {tab === "deals" && (
            <Dialog open={newDealOpen} onOpenChange={setNewDealOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Deal</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Deal title *" value={newDeal.title} onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))} />
                  <Input placeholder="Value ($)" type="number" value={newDeal.value} onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))} />
                  <Select value={newDeal.stageId} onValueChange={v => setNewDeal(p => ({ ...p, stageId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Notes" value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} rows={2} />
                  <Button className="w-full" onClick={() => {
                    if (!pipeline) return toast.error("No pipeline found");
                    createDeal.mutate({
                      pipelineId: pipeline.id,
                      stageId: newDeal.stageId,
                      title: newDeal.title,
                      value: newDeal.value ? parseFloat(newDeal.value) : undefined,
                      notes: newDeal.notes || undefined,
                    });
                  }} disabled={!newDeal.title || createDeal.isPending}>
                    {createDeal.isPending ? "Creating..." : "Create Deal"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {tab === "tasks" && (
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Task</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Task title *" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={2} />
                  <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={() => createTask.mutate(newTask)} disabled={!newTask.title || createTask.isPending}>
                    {createTask.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="tab-nav">
          {[
            { id: "deals", label: `Deals (${deals.length})`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: "contacts", label: `Contacts (${contacts.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: "companies", label: `Companies (${companies.length})`, icon: <Building2 className="w-3.5 h-3.5" /> },
            { id: "tasks", label: `Tasks (${tasks.length})`, icon: <CheckSquare className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab-nav-item flex items-center gap-1.5 ${tab === t.id ? "active" : ""}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Deals — Kanban */}
        <TabsContent value="deals" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages.map(stage => {
              const stageDeals = deals.filter(d => d.stageId === stage.id);
              const stageValue = stageDeals.reduce((s, d) => s + parseFloat(d.value ?? "0"), 0);
              return (
                <div key={stage.id} className="min-w-[220px] flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-medium">{stage.name}</span>
                      <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">${stageValue.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="bg-card border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium text-sm leading-tight">{deal.title}</p>
                          <button onClick={() => deleteDeal.mutate({ id: deal.id })} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {deal.value && <p className="text-primary font-semibold text-sm mt-1">${parseFloat(deal.value).toLocaleString()}</p>}
                        <div className="flex items-center gap-1 mt-2">
                          <Select value={deal.status ?? "open"} onValueChange={v => updateDeal.mutate({ id: deal.id, status: v as any })}>
                            <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="won">Won ✓</SelectItem>
                              <SelectItem value="lost">Lost ✗</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="mt-4">
          <div className="mb-4">
            <Input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} className="max-w-xs" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map(c => (
              <div key={c.id} className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed"}</p>
                    {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{c.leadScore ?? 0} pts</Badge>
                    <button onClick={() => deleteContact.mutate({ id: c.id })} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {c.email && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{c.email}</p>}
                  {c.phone && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{c.phone}</p>}
                  {c.source && <Badge variant="secondary" className="text-xs">{c.source}</Badge>}
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="col-span-3 text-center text-muted-foreground py-12">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No contacts yet. Add your first contact.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Companies */}
        <TabsContent value="companies" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map(c => (
              <div key={c.id} className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                <p className="font-semibold">{c.name}</p>
                {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
                <div className="mt-2 space-y-1">
                  {c.website && <p className="text-xs text-primary truncate">{c.website}</p>}
                  {c.phone && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{c.phone}</p>}
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <div className="col-span-3 text-center text-muted-foreground py-12">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No companies yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4">
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className={`flex items-center gap-3 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow ${t.status === "done" ? "opacity-60" : ""}`}>
                <input type="checkbox" checked={t.status === "done"} onChange={e => updateTask.mutate({ id: t.id, status: e.target.checked ? "done" : "todo" })}
                  className="w-4 h-4 accent-primary" />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "default" : "secondary"} className="text-xs">
                  {t.priority}
                </Badge>
                {t.dueAt && <p className="text-xs text-muted-foreground">{new Date(t.dueAt).toLocaleDateString()}</p>}
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No tasks yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
