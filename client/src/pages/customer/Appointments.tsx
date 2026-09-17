import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell, customerNavItems } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Bell,
  Zap,
  ArrowRight,
  Edit2,
  Play,
  Pause,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Star,
  UserPlus,
  Wrench,
} from "lucide-react";

const INDUSTRIES = [
  { value: "dentist", label: "Dentist / Dental Office" },
  { value: "plumber", label: "Plumber" },
  { value: "roofer", label: "Roofer / Roofing Contractor" },
  { value: "hvac", label: "HVAC Technician" },
  { value: "electrician", label: "Electrician" },
  { value: "landscaper", label: "Landscaper / Lawn Care" },
  { value: "doctor", label: "Doctor / Medical Office" },
  { value: "chiropractor", label: "Chiropractor" },
  { value: "lawyer", label: "Lawyer / Law Office" },
  { value: "auto_repair", label: "Auto Repair Shop" },
  { value: "cleaning", label: "Cleaning Service" },
  { value: "pest_control", label: "Pest Control" },
  { value: "painter", label: "Painter" },
  { value: "contractor", label: "General Contractor" },
  { value: "restaurant", label: "Restaurant / Food Service" },
  { value: "salon", label: "Salon / Spa" },
  { value: "other", label: "Other Service Business" },
];

const SEQUENCE_TYPES = [
  { value: "appointment_reminder", label: "Appointment Reminder", icon: Bell, color: "text-blue-400", desc: "Remind customers before their appointment" },
  { value: "post_service_followup", label: "Post-Service Follow-Up", icon: CheckCircle2, color: "text-green-400", desc: "Check satisfaction after service" },
  { value: "upsell_inspection", label: "Upsell / Inspection Offer", icon: Wrench, color: "text-yellow-400", desc: "Offer new services or inspections" },
  { value: "re_engagement", label: "Re-Engagement", icon: RefreshCw, color: "text-purple-400", desc: "Win back dormant customers" },
  { value: "review_request", label: "Review Request", icon: Star, color: "text-orange-400", desc: "Ask for Google/Yelp reviews" },
  { value: "referral_ask", label: "Referral Ask", icon: UserPlus, color: "text-cyan-400", desc: "Ask customers to refer friends" },
];

export default function AppointmentsPage() {
  const [selectedBizId, setSelectedBizId] = useState<number | null>(null);
  const [showCreateBiz, setShowCreateBiz] = useState(false);
  const [showCreateAppt, setShowCreateAppt] = useState(false);
  const [showCreateSeq, setShowCreateSeq] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Business form
  const [bizForm, setBizForm] = useState({
    name: "", industry: "dentist", phone: "", email: "",
    address: "", city: "", state: "", timezone: "America/Chicago",
    aiGreeting: "", confirmationMsg: "", reminderMsg: "", followUpMsg: "", upsellMsg: "",
  });

  // Appointment form
  const [apptForm, setApptForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    serviceType: "", scheduledAt: "", durationMinutes: 60,
    notes: "", bookedVia: "manual" as const,
  });

  // Sequence form
  const [seqForm, setSeqForm] = useState({
    name: "", type: "appointment_reminder" as const,
    triggerType: "hours_before_appointment" as const,
    triggerValue: 24, channel: "ai_call" as const,
    messageTemplate: "",
  });

  const [generatingMsg, setGeneratingMsg] = useState(false);

  const bizQuery = trpc.appointments.listBusinesses.useQuery();
  const selectedBiz = bizQuery.data?.find((b) => b.id === selectedBizId) ?? bizQuery.data?.[0] ?? null;
  const effectiveBizId = selectedBizId ?? selectedBiz?.id ?? 0;

  const statsQuery = trpc.appointments.getStats.useQuery(
    { businessId: effectiveBizId },
    { enabled: !!effectiveBizId }
  );
  const apptQuery = trpc.appointments.listAppointments.useQuery(
    { businessId: effectiveBizId },
    { enabled: !!effectiveBizId }
  );
  const seqQuery = trpc.appointments.listSequences.useQuery(
    { businessId: effectiveBizId },
    { enabled: !!effectiveBizId }
  );
  const logsQuery = trpc.appointments.listLogs.useQuery(
    { businessId: effectiveBizId, limit: 20 },
    { enabled: !!effectiveBizId }
  );
  const customersQuery = trpc.appointments.listCustomers.useQuery(
    { businessId: effectiveBizId },
    { enabled: !!effectiveBizId }
  );

  const createBiz = trpc.appointments.createBusiness.useMutation({
    onSuccess: () => { bizQuery.refetch(); setShowCreateBiz(false); toast.success("Business created!"); },
    onError: (e) => toast.error(e.message),
  });
  const createAppt = trpc.appointments.createAppointment.useMutation({
    onSuccess: () => { apptQuery.refetch(); statsQuery.refetch(); setShowCreateAppt(false); toast.success("Appointment booked!"); },
    onError: (e) => toast.error(e.message),
  });
  const createSeq = trpc.appointments.createSequence.useMutation({
    onSuccess: () => { seqQuery.refetch(); setShowCreateSeq(false); toast.success("Sequence created!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateSeq = trpc.appointments.updateSequence.useMutation({
    onSuccess: () => { seqQuery.refetch(); toast.success("Sequence updated!"); },
  });
  const updateApptStatus = trpc.appointments.updateAppointmentStatus.useMutation({
    onSuccess: () => { apptQuery.refetch(); statsQuery.refetch(); },
  });
  const generateMsg = trpc.appointments.generateMessage.useMutation({
    onSuccess: (data) => {
      setSeqForm((f) => ({ ...f, messageTemplate: String(data.message) }));
      setGeneratingMsg(false);
      toast.success("AI message generated!");
    },
    onError: (e) => { setGeneratingMsg(false); toast.error(e.message); },
  });

  const handleGenerateMsg = () => {
    if (!selectedBiz) return;
    setGeneratingMsg(true);
    generateMsg.mutate({
      type: seqForm.type,
      businessName: selectedBiz.name,
      industry: selectedBiz.industry,
      channel: (["ai_call", "sms", "email"].includes(seqForm.channel) ? seqForm.channel : "ai_call") as "ai_call" | "sms" | "email",
    });
  };

  const stats = statsQuery.data;

  if (bizQuery.isLoading) {
    return (
      <DashboardShell navItems={customerNavItems} title="Appointment Engine" role="customer">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  // No businesses yet — show onboarding
  if (!bizQuery.data?.length && !showCreateBiz) {
    return (
      <DashboardShell navItems={customerNavItems} title="Appointment Engine" role="customer">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-600/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">AI Appointment Engine</h2>
          <p className="text-white/60 text-lg mb-3">
            Let AI fill your calendar, follow up with customers, send reminders, and win back lost business — automatically.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8 text-left">
            {[
              { icon: Phone, label: "AI Books Appointments", desc: "AI calls or chats to fill your schedule" },
              { icon: Bell, label: "Automated Reminders", desc: "Reduce no-shows with smart reminders" },
              { icon: Wrench, label: "Upsell & Inspections", desc: "AI offers new services to past customers" },
              { icon: RefreshCw, label: "Re-Engagement", desc: "Win back dormant customers automatically" },
            ].map((f) => (
              <div key={f.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <f.icon className="w-5 h-5 text-cyan-400 mb-2" />
                <div className="text-sm font-semibold text-white">{f.label}</div>
                <div className="text-xs text-white/50 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
          <Button
            onClick={() => setShowCreateBiz(true)}
            className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white px-8 py-3 rounded-xl font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" /> Set Up My Business
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={customerNavItems} title="Appointment Engine" role="customer">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {bizQuery.data && bizQuery.data.length > 1 && (
              <Select
                value={String(effectiveBizId)}
                onValueChange={(v) => setSelectedBizId(Number(v))}
              >
                <SelectTrigger className="w-56 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {bizQuery.data.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)} className="text-white">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedBiz && (
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                {INDUSTRIES.find((i) => i.value === selectedBiz.industry)?.label ?? selectedBiz.industry}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateBiz(true)}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Business
            </Button>
            {effectiveBizId > 0 && (
              <Button
                size="sm"
                onClick={() => setShowCreateAppt(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                <Calendar className="w-4 h-4 mr-1" /> Book Appointment
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-cyan-400" },
              { label: "Total Appointments", value: stats.totalAppointments, icon: Calendar, color: "text-violet-400" },
              { label: "Upcoming", value: stats.upcomingAppointments, icon: Clock, color: "text-blue-400" },
              { label: "Completed", value: stats.completedAppointments, icon: CheckCircle2, color: "text-green-400" },
              { label: "Active Sequences", value: stats.activeSequences, icon: Zap, color: "text-yellow-400" },
            ].map((s) => (
              <Card key={s.label} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">{s.label}</span>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/60">
              <BarChart3 className="w-4 h-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="appointments" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/60">
              <Calendar className="w-4 h-4 mr-1" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="sequences" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/60">
              <Zap className="w-4 h-4 mr-1" /> AI Sequences
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/60">
              <Users className="w-4 h-4 mr-1" /> Customers
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/60">
              <MessageSquare className="w-4 h-4 mr-1" /> Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Upcoming appointments */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-gray-800 text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" /> Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {apptQuery.data?.filter((a) => new Date(a.scheduledAt) >= new Date() && a.status !== "cancelled").slice(0, 5).length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No upcoming appointments</p>
                      <Button size="sm" onClick={() => setShowCreateAppt(true)} className="mt-3 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                        Book one now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apptQuery.data?.filter((a) => new Date(a.scheduledAt) >= new Date() && a.status !== "cancelled").slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <div>
                            <div className="text-sm font-medium text-white">{a.customerName ?? "Unknown"}</div>
                            <div className="text-xs text-white/50">{a.serviceType ?? "Service"} · {new Date(a.scheduledAt).toLocaleString()}</div>
                          </div>
                          <Badge className={
                            a.status === "confirmed" ? "bg-green-500/20 text-green-400 border-0" :
                            a.status === "reminded" ? "bg-blue-500/20 text-blue-400 border-0" :
                            "bg-yellow-500/20 text-yellow-400 border-0"
                          }>
                            {a.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Sequences */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-gray-800 text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Active AI Sequences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {seqQuery.data?.filter((s) => s.isActive).length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No active sequences</p>
                      <Button size="sm" onClick={() => { setActiveTab("sequences"); setShowCreateSeq(true); }} className="mt-3 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
                        Create sequence
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {seqQuery.data?.filter((s) => s.isActive).slice(0, 5).map((s) => {
                        const seqType = SEQUENCE_TYPES.find((t) => t.value === s.type);
                        return (
                          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div className="flex items-center gap-2">
                              {seqType && <seqType.icon className={`w-4 h-4 ${seqType.color}`} />}
                              <div>
                                <div className="text-sm font-medium text-white">{s.name}</div>
                                <div className="text-xs text-white/50">{s.totalSent} sent · {s.totalResponded} responded</div>
                              </div>
                            </div>
                            <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Active</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <Card className="bg-gradient-to-br from-cyan-500/5 to-violet-500/5 border-cyan-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-800 text-base">Quick Setup — AI Sequences for Your Business</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {SEQUENCE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setSeqForm((f) => ({ ...f, type: t.value as any, name: t.label }));
                        setActiveTab("sequences");
                        setShowCreateSeq(true);
                      }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all text-left group"
                    >
                      <t.icon className={`w-5 h-5 ${t.color} mb-2`} />
                      <div className="text-sm font-semibold text-white">{t.label}</div>
                      <div className="text-xs text-white/50 mt-0.5">{t.desc}</div>
                      <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-cyan-400 mt-2 transition-colors" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-gray-800 text-base">All Appointments</CardTitle>
                <Button size="sm" onClick={() => setShowCreateAppt(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                  <Plus className="w-4 h-4 mr-1" /> Book
                </Button>
              </CardHeader>
              <CardContent>
                {!apptQuery.data?.length ? (
                  <div className="text-center py-12 text-white/40">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No appointments yet. Book your first one!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apptQuery.data.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-600/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                            {(a.customerName ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{a.customerName ?? "Unknown Customer"}</div>
                            <div className="text-xs text-white/50">
                              {a.serviceType ?? "Service"} · {new Date(a.scheduledAt).toLocaleString()} · {a.durationMinutes}min
                            </div>
                            {a.customerPhone && <div className="text-xs text-white/40">{a.customerPhone}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            a.status === "completed" ? "bg-green-500/20 text-green-400 border-0" :
                            a.status === "confirmed" ? "bg-blue-500/20 text-blue-400 border-0" :
                            a.status === "cancelled" ? "bg-red-500/20 text-red-400 border-0" :
                            a.status === "no_show" ? "bg-orange-500/20 text-orange-400 border-0" :
                            "bg-yellow-500/20 text-yellow-400 border-0"
                          }>
                            {a.status}
                          </Badge>
                          {a.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-7 px-2 text-xs"
                              onClick={() => updateApptStatus.mutate({ id: a.id, status: "confirmed" })}
                            >
                              Confirm
                            </Button>
                          )}
                          {a.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2 text-xs"
                              onClick={() => updateApptStatus.mutate({ id: a.id, status: "completed" })}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Sequences Tab */}
          <TabsContent value="sequences" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-white/60 text-sm">AI automatically sends these messages based on triggers. No manual work needed.</p>
              <Button size="sm" onClick={() => setShowCreateSeq(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold">
                <Plus className="w-4 h-4 mr-1" /> New Sequence
              </Button>
            </div>
            {!seqQuery.data?.length ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="text-center py-16 text-white/40">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="mb-4">No sequences yet. Create your first AI automation!</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-xl mx-auto">
                    {SEQUENCE_TYPES.slice(0, 3).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => { setSeqForm((f) => ({ ...f, type: t.value as any, name: t.label })); setShowCreateSeq(true); }}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 text-left"
                      >
                        <t.icon className={`w-4 h-4 ${t.color} mb-1`} />
                        <div className="text-xs font-medium text-white">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {seqQuery.data.map((s) => {
                  const seqType = SEQUENCE_TYPES.find((t) => t.value === s.type);
                  return (
                    <Card key={s.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {seqType && (
                              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                                <seqType.icon className={`w-5 h-5 ${seqType.color}`} />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-white">{s.name}</div>
                              <div className="text-xs text-white/50 mt-0.5">
                                {seqType?.label} · {s.channel.replace("_", " ")} · Trigger: {s.triggerValue} {s.triggerType.replace(/_/g, " ")}
                              </div>
                              <div className="text-xs text-white/40 mt-1 line-clamp-2">{s.messageTemplate}</div>
                              <div className="flex gap-3 mt-2 text-xs text-white/50">
                                <span>{s.totalSent} sent</span>
                                <span>{s.totalResponded} responded</span>
                                {s.totalSent > 0 && <span>{Math.round((s.totalResponded / s.totalSent) * 100)}% response rate</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={s.isActive}
                              onCheckedChange={(v) => updateSeq.mutate({ id: s.id, isActive: v })}
                            />
                            <span className="text-xs text-white/50">{s.isActive ? "Active" : "Paused"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-800 text-base flex items-center justify-between">
                  <span>Customer List</span>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-0">{customersQuery.data?.length ?? 0} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!customersQuery.data?.length ? (
                  <div className="text-center py-12 text-white/40">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No customers yet. Import a CSV or add customers manually.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customersQuery.data.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400/20 to-cyan-600/20 flex items-center justify-center text-sm font-bold text-violet-400">
                            {(c.name ?? c.phone).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{c.name ?? "Unknown"}</div>
                            <div className="text-xs text-white/50">{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                            {c.tags && <div className="text-xs text-cyan-400/70 mt-0.5">{c.tags}</div>}
                          </div>
                        </div>
                        <div className="text-xs text-white/40">{c.totalAppointments} appts</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="logs" className="mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-800 text-base">AI Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                {!logsQuery.data?.length ? (
                  <div className="text-center py-12 text-white/40">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No activity yet. AI sequences will log activity here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logsQuery.data.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div>
                          <div className="text-sm text-white">{l.customerPhone ?? l.customerEmail ?? "Unknown"}</div>
                          <div className="text-xs text-white/50">{l.channel} · {l.messageContent?.slice(0, 60)}...</div>
                        </div>
                        <Badge className={
                          l.status === "responded" ? "bg-green-500/20 text-green-400 border-0" :
                          l.status === "sent" ? "bg-blue-500/20 text-blue-400 border-0" :
                          l.status === "failed" ? "bg-red-500/20 text-red-400 border-0" :
                          "bg-white/10 text-white/50 border-0"
                        }>
                          {l.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Business Dialog */}
      <Dialog open={showCreateBiz} onOpenChange={setShowCreateBiz}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" /> Set Up Your Business
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-white/70">Business Name *</Label>
                <Input value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Smith Dental Group" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-white/70">Industry *</Label>
                <Select value={bizForm.industry} onValueChange={(v) => setBizForm((f) => ({ ...f, industry: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i.value} value={i.value} className="text-white">{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Phone</Label>
                <Input value={bizForm.phone} onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 123-4567" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">Email</Label>
                <Input value={bizForm.email} onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="office@business.com" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">City</Label>
                <Input value={bizForm.city} onChange={(e) => setBizForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Chicago" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">State</Label>
                <Input value={bizForm.state} onChange={(e) => setBizForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="IL" maxLength={2} className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-white/70">AI Phone Greeting (optional)</Label>
              <Textarea value={bizForm.aiGreeting}
                onChange={(e) => setBizForm((f) => ({ ...f, aiGreeting: e.target.value }))}
                placeholder="Hi, you've reached Smith Dental. I'm your AI assistant. How can I help you today?"
                className="bg-white/5 border-white/10 text-white mt-1 resize-none" rows={2} />
            </div>
            <Button
              onClick={() => createBiz.mutate(bizForm)}
              disabled={!bizForm.name || createBiz.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold"
            >
              {createBiz.isPending ? "Creating..." : "Create Business"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Appointment Dialog */}
      <Dialog open={showCreateAppt} onOpenChange={setShowCreateAppt}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" /> Book Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-white/70">Customer Name</Label>
                <Input value={apptForm.customerName} onChange={(e) => setApptForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Jane Smith" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">Phone</Label>
                <Input value={apptForm.customerPhone} onChange={(e) => setApptForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  placeholder="(555) 123-4567" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">Email</Label>
                <Input value={apptForm.customerEmail} onChange={(e) => setApptForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  placeholder="jane@email.com" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-white/70">Service Type</Label>
                <Input value={apptForm.serviceType} onChange={(e) => setApptForm((f) => ({ ...f, serviceType: e.target.value }))}
                  placeholder="Teeth Cleaning / Roof Inspection / etc." className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-white/70">Date & Time *</Label>
                <Input type="datetime-local" value={apptForm.scheduledAt}
                  onChange={(e) => setApptForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">Duration (min)</Label>
                <Input type="number" value={apptForm.durationMinutes}
                  onChange={(e) => setApptForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70">Booked Via</Label>
                <Select value={apptForm.bookedVia} onValueChange={(v: any) => setApptForm((f) => ({ ...f, bookedVia: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    <SelectItem value="manual" className="text-white">Manual</SelectItem>
                    <SelectItem value="ai_call" className="text-white">AI Call</SelectItem>
                    <SelectItem value="ai_chat" className="text-white">AI Chat</SelectItem>
                    <SelectItem value="online" className="text-white">Online</SelectItem>
                    <SelectItem value="referral" className="text-white">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-white/70">Notes</Label>
                <Textarea value={apptForm.notes} onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special notes..." className="bg-white/5 border-white/10 text-white mt-1 resize-none" rows={2} />
              </div>
            </div>
            <Button
              onClick={() => createAppt.mutate({ businessId: effectiveBizId, ...apptForm, scheduledAt: new Date(apptForm.scheduledAt) })}
              disabled={!apptForm.scheduledAt || createAppt.isPending}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              {createAppt.isPending ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sequence Dialog */}
      <Dialog open={showCreateSeq} onOpenChange={setShowCreateSeq}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> Create AI Sequence
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Sequence Name *</Label>
              <Input value={seqForm.name} onChange={(e) => setSeqForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="24-Hour Appointment Reminder" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70">Type</Label>
                <Select value={seqForm.type} onValueChange={(v: any) => setSeqForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    {SEQUENCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Channel</Label>
                <Select value={seqForm.channel} onValueChange={(v: any) => setSeqForm((f) => ({ ...f, channel: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    <SelectItem value="ai_call" className="text-white">AI Phone Call</SelectItem>
                    <SelectItem value="sms" className="text-white">SMS Text</SelectItem>
                    <SelectItem value="email" className="text-white">Email</SelectItem>
                    <SelectItem value="all" className="text-white">All Channels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Trigger</Label>
                <Select value={seqForm.triggerType} onValueChange={(v: any) => setSeqForm((f) => ({ ...f, triggerType: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    <SelectItem value="hours_before_appointment" className="text-white">Hours Before Appt</SelectItem>
                    <SelectItem value="hours_after_appointment" className="text-white">Hours After Appt</SelectItem>
                    <SelectItem value="days_after_last_service" className="text-white">Days After Service</SelectItem>
                    <SelectItem value="days_since_last_contact" className="text-white">Days Since Contact</SelectItem>
                    <SelectItem value="manual" className="text-white">Manual Trigger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Trigger Value</Label>
                <Input type="number" value={seqForm.triggerValue}
                  onChange={(e) => setSeqForm((f) => ({ ...f, triggerValue: Number(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-white/70">Message Template *</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerateMsg}
                  disabled={generatingMsg || !selectedBiz}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2 text-xs"
                >
                  {generatingMsg ? (
                    <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Zap className="w-3 h-3 mr-1" /> AI Generate</>
                  )}
                </Button>
              </div>
              <Textarea
                value={seqForm.messageTemplate}
                onChange={(e) => setSeqForm((f) => ({ ...f, messageTemplate: e.target.value }))}
                placeholder="Hi {{customer_name}}, this is a reminder from {{business_name}}..."
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={5}
              />
              <p className="text-xs text-white/40 mt-1">Use {"{{customer_name}}"}, {"{{business_name}}"}, {"{{appointment_date}}"} as variables</p>
            </div>
            <Button
              onClick={() => createSeq.mutate({ businessId: effectiveBizId, ...seqForm })}
              disabled={!seqForm.name || !seqForm.messageTemplate || createSeq.isPending}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-semibold"
            >
              {createSeq.isPending ? "Creating..." : "Create Sequence"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
