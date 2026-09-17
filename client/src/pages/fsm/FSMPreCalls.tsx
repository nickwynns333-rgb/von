import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Phone, Sparkles, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Mic, MessageSquare, Package, Calendar, User, Play, Plus
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const preCalls = [
  {
    id: 1, jobNumber: "JOB-2401", customer: "Sarah Johnson", phone: "(555) 234-5678",
    industry: "HVAC", title: "AC Unit Not Cooling",
    status: "completed", scheduledAt: Date.now() - 3600000, duration: 142,
    summary: "Customer confirmed AC has been blowing warm air for 3 days. Noticed ice forming on the outdoor unit. Has a dog — tech should be aware. Appointment confirmed for 2pm. AI requested customer send photo of outdoor unit via SMS.",
    symptoms: ["warm air blowing", "ice on outdoor unit", "unusual noise when starting"],
    partsToPreStage: ["R-410A refrigerant (2 lbs)", "Leak detection dye kit"],
    appointmentConfirmed: true,
    concerns: "Customer is worried about cost — mentioned budget around $500.",
  },
  {
    id: 2, jobNumber: "JOB-2402", customer: "Robert Chen", phone: "(555) 345-6789",
    industry: "Plumbing", title: "Water Heater Replacement",
    status: "scheduled", scheduledAt: Date.now() + 3600000, duration: null,
    summary: null, symptoms: [], partsToPreStage: [], appointmentConfirmed: false, concerns: null,
  },
  {
    id: 3, jobNumber: "JOB-2403", customer: "Maria Gonzalez", phone: "(555) 456-7890",
    industry: "Auto Repair", title: "Brake Pad Replacement",
    status: "completed", scheduledAt: Date.now() - 7200000, duration: 98,
    summary: "Customer confirmed grinding noise when braking, especially at highway speeds. Car is a 2019 Honda Accord. Last brake service was 2 years ago. Appointment confirmed. Customer asked about tire rotation — upsell opportunity.",
    symptoms: ["grinding noise when braking", "vibration in steering wheel"],
    partsToPreStage: ["Front brake pads (Honda Accord 2019)", "Brake rotor (check on arrival)"],
    appointmentConfirmed: true,
    concerns: "Asked about tire rotation — potential upsell.",
  },
  {
    id: 4, jobNumber: "JOB-2404", customer: "David Williams", phone: "(555) 567-8901",
    industry: "Electrical", title: "Electrical Panel Inspection",
    status: "no_answer", scheduledAt: Date.now() - 1800000, duration: null,
    summary: null, symptoms: [], partsToPreStage: [], appointmentConfirmed: false, concerns: null,
  },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed:  { label: "Completed",  color: "#10B981", bg: "#F0FDF4", icon: CheckCircle2 },
  scheduled:  { label: "Scheduled",  color: "#3B82F6", bg: "#EFF6FF", icon: Clock },
  no_answer:  { label: "No Answer",  color: "#F59E0B", bg: "#FFFBEB", icon: AlertTriangle },
  in_progress:{ label: "In Progress",color: "#6366F1", bg: "#EEF2FF", icon: Mic },
  failed:     { label: "Failed",     color: "#EF4444", bg: "#FEF2F2", icon: AlertTriangle },
};

export default function FSMPreCalls() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(preCalls[0]);

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#F5F7FA]">
        {/* Page header */}
        <div
          className="px-6 pt-7 pb-8 text-white"
          style={{ background: "linear-gradient(135deg, #1A6FFF 0%, #3B8BFF 60%, #5BA3FF 100%)" }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <button className="text-blue-200 text-xs hover:text-white" onClick={() => setLocation("/fsm")}>FSM Hub</button>
              <ChevronRight className="w-3 h-3 text-blue-300" />
              <span className="text-xs text-white">AI Pre-Appointment Calls</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium text-blue-100">AI Voice Agent</span>
                </div>
                <h1 className="text-2xl font-bold">Pre-Appointment Calls</h1>
                <p className="text-blue-100 text-sm mt-0.5">
                  AI calls customers before the tech arrives — captures symptoms, confirms time, pre-stages parts
                </p>
              </div>
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Schedule Call
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: "Calls Completed", value: preCalls.filter(c => c.status === "completed").length },
                { label: "Scheduled", value: preCalls.filter(c => c.status === "scheduled").length },
                { label: "Appointments Confirmed", value: preCalls.filter(c => c.appointmentConfirmed).length },
                { label: "Parts Pre-Staged", value: preCalls.reduce((s, c) => s + c.partsToPreStage.length, 0) },
              ].map(s => (
                <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-blue-100 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {/* Call list */}
            <div className="md:col-span-2 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Calls</p>
              {preCalls.map(call => {
                const cfg = statusConfig[call.status];
                const CfgIcon = cfg.icon;
                return (
                  <Card
                    key={call.id}
                    className={`cursor-pointer border transition-all ${selected.id === call.id ? "border-blue-400 shadow-md" : "border-gray-200 hover:border-blue-200"} bg-white`}
                    onClick={() => setSelected(call)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-[10px] font-mono text-gray-400">{call.jobNumber}</p>
                          <p className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">{call.title}</p>
                        </div>
                        <Badge
                          className="text-[10px] px-1.5 py-0 shrink-0 border flex items-center gap-1"
                          style={{ background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }}
                        >
                          <CfgIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{call.customer}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{call.phone}</span>
                        {call.duration && (
                          <span className="ml-auto text-gray-400">{Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, "0")}</span>
                        )}
                      </div>
                      {call.appointmentConfirmed && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Appointment confirmed</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Detail panel */}
            <div className="md:col-span-3 space-y-4">
              {selected.status === "completed" ? (
                <>
                  <Card className="border border-gray-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        AI Call Summary
                        <Badge className="ml-auto text-[10px] bg-green-50 text-green-600 border border-green-200">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Completed
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 rounded-lg p-3 border border-blue-100">
                        {selected.summary}
                      </p>

                      {selected.symptoms.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Symptoms Captured</p>
                          <div className="flex flex-wrap gap-2">
                            {selected.symptoms.map((s, i) => (
                              <Badge key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selected.partsToPreStage.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parts to Pre-Stage</p>
                          <div className="space-y-1.5">
                            {selected.partsToPreStage.map((part, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="text-gray-700">{part}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selected.concerns && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-yellow-700 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Tech Alert
                          </p>
                          <p className="text-sm text-yellow-800">{selected.concerns}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                          <Play className="w-3 h-3 mr-1.5" />
                          Play Recording
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                          <MessageSquare className="w-3 h-3 mr-1.5" />
                          View Transcript
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : selected.status === "scheduled" ? (
                <Card className="border border-gray-200 bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-7 h-7 text-blue-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Call Scheduled</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      AI will call {selected.customer} at {new Date(selected.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Call Now
                      </Button>
                      <Button size="sm" variant="outline">
                        Reschedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-gray-200 bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-7 h-7 text-yellow-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No Answer</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      AI attempted to reach {selected.customer} but got no answer. Retry or send an SMS.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Retry Call
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        Send SMS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
