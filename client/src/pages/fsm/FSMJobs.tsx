import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Wrench, Plus, Search, Filter, Phone, Calendar, Clock,
  MapPin, User, DollarSign, Sparkles, AlertTriangle, ChevronRight,
  MoreHorizontal, Zap
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type JobStatus = "new_lead" | "booked" | "confirmed" | "dispatched" | "in_progress" | "completed" | "invoiced";

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string; border: string }> = {
  new_lead:   { label: "New Lead",    color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
  booked:     { label: "Booked",      color: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD" },
  confirmed:  { label: "Confirmed",   color: "#10B981", bg: "#F0FDF4", border: "#BBF7D0" },
  dispatched: { label: "Dispatched",  color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  in_progress:{ label: "In Progress", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
  completed:  { label: "Completed",   color: "#22C55E", bg: "#F0FDF4", border: "#86EFAC" },
  invoiced:   { label: "Invoiced",    color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
};

// Demo data
const demoJobs = [
  {
    id: 1, jobNumber: "JOB-2401", title: "AC Unit Not Cooling", status: "in_progress" as JobStatus,
    customer: "Sarah Johnson", phone: "(555) 234-5678", address: "142 Oak St, Austin TX",
    technician: "Mike Torres", scheduledAt: Date.now() + 3600000, estimatedValue: 485,
    priority: "high", industry: "hvac", aiPreCallCompleted: true, aiRiskFlags: ["refrigerant_leak"],
    source: "ai_agent",
  },
  {
    id: 2, jobNumber: "JOB-2402", title: "Water Heater Replacement", status: "booked" as JobStatus,
    customer: "Robert Chen", phone: "(555) 345-6789", address: "88 Maple Ave, Austin TX",
    technician: null, scheduledAt: Date.now() + 86400000, estimatedValue: 1200,
    priority: "normal", industry: "plumbing", aiPreCallCompleted: false, aiRiskFlags: [],
    source: "online_booking",
  },
  {
    id: 3, jobNumber: "JOB-2403", title: "Brake Pad Replacement + Rotor Check", status: "dispatched" as JobStatus,
    customer: "Maria Gonzalez", phone: "(555) 456-7890", address: "Downtown Auto Shop",
    technician: "James Park", scheduledAt: Date.now() + 7200000, estimatedValue: 320,
    priority: "normal", industry: "auto_repair", aiPreCallCompleted: true, aiRiskFlags: [],
    source: "phone",
  },
  {
    id: 4, jobNumber: "JOB-2404", title: "Electrical Panel Inspection", status: "new_lead" as JobStatus,
    customer: "David Williams", phone: "(555) 567-8901", address: "500 Commerce Blvd, Austin TX",
    technician: null, scheduledAt: null, estimatedValue: 250,
    priority: "emergency", industry: "electrical", aiPreCallCompleted: false, aiRiskFlags: ["safety_hazard"],
    source: "phone",
  },
  {
    id: 5, jobNumber: "JOB-2405", title: "Dental Crown Consultation", status: "confirmed" as JobStatus,
    customer: "Lisa Park", phone: "(555) 678-9012", address: "Austin Dental Center",
    technician: "Dr. Amanda Lee", scheduledAt: Date.now() + 172800000, estimatedValue: 1800,
    priority: "normal", industry: "dental", aiPreCallCompleted: true, aiRiskFlags: [],
    source: "ai_agent",
  },
  {
    id: 6, jobNumber: "JOB-2406", title: "Roof Leak Repair — Storm Damage", status: "completed" as JobStatus,
    customer: "Tom Bradley", phone: "(555) 789-0123", address: "220 Elm St, Austin TX",
    technician: "Carlos Rivera", scheduledAt: Date.now() - 86400000, estimatedValue: 2400,
    priority: "high", industry: "roofing", aiPreCallCompleted: true, aiRiskFlags: [],
    source: "referral",
  },
  {
    id: 7, jobNumber: "JOB-2407", title: "HVAC Annual Maintenance", status: "invoiced" as JobStatus,
    customer: "Nancy White", phone: "(555) 890-1234", address: "77 Cedar Lane, Austin TX",
    technician: "Mike Torres", scheduledAt: Date.now() - 172800000, estimatedValue: 189,
    priority: "low", industry: "hvac", aiPreCallCompleted: true, aiRiskFlags: [],
    source: "repeat",
  },
];

function JobCard({ job, onClick }: { job: typeof demoJobs[0]; onClick: () => void }) {
  const cfg = statusConfig[job.status];
  const isOverdue = job.scheduledAt && job.scheduledAt < Date.now() && job.status !== "completed" && job.status !== "invoiced";

  return (
    <Card
      className="cursor-pointer border border-gray-200 bg-white hover:shadow-md hover:border-blue-300 transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-[10px] font-mono text-gray-400">{job.jobNumber}</p>
            <p className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">{job.title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {job.priority === "emergency" && (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            )}
            <Badge
              className="text-[10px] px-1.5 py-0 font-medium border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
            >
              {cfg.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.customer}</span>
          </div>
          {job.technician && (
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3 h-3 shrink-0" />
              <span className="truncate text-blue-600">{job.technician}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.address}</span>
          </div>
          {job.scheduledAt && (
            <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-500" : ""}`}>
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{new Date(job.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              {isOverdue && <span className="font-semibold">· OVERDUE</span>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <span className="text-sm font-bold text-gray-900">${job.estimatedValue.toLocaleString()}</span>
          <div className="flex items-center gap-1.5">
            {job.aiPreCallCompleted && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                <Sparkles className="w-3 h-3" /> AI Call
              </span>
            )}
            {job.aiRiskFlags.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> {job.aiRiskFlags[0].replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FSMJobs() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "kanban">("list");

  const filtered = demoJobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.customer.toLowerCase().includes(search.toLowerCase()) || j.jobNumber.includes(search);
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses: JobStatus[] = ["new_lead", "booked", "confirmed", "dispatched", "in_progress", "completed", "invoiced"];

  const todayJobs = demoJobs.filter(j => {
    if (!j.scheduledAt) return false;
    const d = new Date(j.scheduledAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  });

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#F5F7FA]">
        {/* Page header */}
        <div
          className="px-6 pt-7 pb-8 text-white"
          style={{ background: "linear-gradient(135deg, #1A6FFF 0%, #3B8BFF 60%, #5BA3FF 100%)" }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    className="text-blue-200 text-xs hover:text-white transition-colors"
                    onClick={() => setLocation("/fsm")}
                  >
                    FSM Hub
                  </button>
                  <ChevronRight className="w-3 h-3 text-blue-300" />
                  <span className="text-xs text-white font-medium">Job Board</span>
                </div>
                <h1 className="text-2xl font-bold">Job Board</h1>
                <p className="text-blue-100 text-sm mt-0.5">
                  {demoJobs.length} total jobs · {todayJobs.length} scheduled today
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/15 border-white/30 text-white hover:bg-white/25"
                  onClick={() => setView(view === "list" ? "kanban" : "list")}
                >
                  {view === "list" ? "Kanban View" : "List View"}
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Job
                </Button>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: "New Leads", value: demoJobs.filter(j => j.status === "new_lead").length, color: "#818CF8" },
                { label: "In Progress", value: demoJobs.filter(j => j.status === "in_progress").length, color: "#FB923C" },
                { label: "Today's Revenue", value: "$" + todayJobs.reduce((s, j) => s + j.estimatedValue, 0).toLocaleString(), color: "#34D399" },
                { label: "AI Pre-Calls Done", value: demoJobs.filter(j => j.aiPreCallCompleted).length, color: "#60A5FA" },
              ].map(s => (
                <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-blue-100 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Search jobs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              More Filters
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Pre-Call All
              </Button>
              <Button size="sm" variant="outline" className="h-8">
                <Phone className="w-3.5 h-3.5 mr-1.5" />
                Dispatch
              </Button>
            </div>
          </div>
        </div>

        {/* Job list */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {view === "list" ? (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No jobs match your filters</p>
                </div>
              ) : (
                filtered.map(job => (
                  <Card key={job.id} className="bg-white border border-gray-200 hover:shadow-sm transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Status indicator */}
                        <div
                          className="w-1.5 h-10 rounded-full shrink-0"
                          style={{ background: statusConfig[job.status].color }}
                        />

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono text-gray-400">{job.jobNumber}</span>
                            <Badge
                              className="text-[10px] px-1.5 py-0 border"
                              style={{
                                background: statusConfig[job.status].bg,
                                color: statusConfig[job.status].color,
                                borderColor: statusConfig[job.status].border,
                              }}
                            >
                              {statusConfig[job.status].label}
                            </Badge>
                            {job.priority === "emergency" && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-600 border border-red-200">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Emergency
                              </Badge>
                            )}
                            {job.aiPreCallCompleted && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-green-50 text-green-600 border border-green-200">
                                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Pre-Call Done
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{job.title}</p>
                        </div>

                        {/* Customer */}
                        <div className="hidden sm:flex flex-col gap-0.5 min-w-[140px]">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{job.customer}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Phone className="w-3 h-3" />
                            <span>{job.phone}</span>
                          </div>
                        </div>

                        {/* Tech & schedule */}
                        <div className="hidden md:flex flex-col gap-0.5 min-w-[140px]">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Wrench className="w-3 h-3" />
                            <span>{job.technician ?? <span className="text-orange-500 font-medium">Unassigned</span>}</span>
                          </div>
                          {job.scheduledAt ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(job.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 ml-4">Not scheduled</span>
                          )}
                        </div>

                        {/* Value */}
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-900 min-w-[70px] justify-end">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          {job.estimatedValue.toLocaleString()}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {!job.aiPreCallCompleted && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Zap className="w-3 h-3 mr-1" />
                              AI Call
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Kanban view */
            <div className="flex gap-4 overflow-x-auto pb-4">
              {statuses.map(status => {
                const cfg = statusConfig[status];
                const jobs = filtered.filter(j => j.status === status);
                return (
                  <div key={status} className="shrink-0 w-64">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-t-lg mb-2"
                      style={{ background: cfg.bg, borderBottom: `2px solid ${cfg.border}` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="ml-auto text-xs text-gray-400 font-medium">{jobs.length}</span>
                    </div>
                    <div className="space-y-2">
                      {jobs.map(job => (
                        <JobCard key={job.id} job={job} onClick={() => {}} />
                      ))}
                      {jobs.length === 0 && (
                        <div className="text-center py-6 text-gray-300 text-xs">No jobs</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
