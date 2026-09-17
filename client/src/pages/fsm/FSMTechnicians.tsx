import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Wrench, Star, TrendingUp, TrendingDown, ChevronRight,
  Sparkles, AlertTriangle, CheckCircle2, DollarSign,
  Clock, ThumbsUp, MessageSquare, Plus, BarChart3
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const technicians = [
  {
    id: 1, name: "Mike Torres", specialty: "HVAC", status: "active",
    avatar: "MT", color: "#3B82F6",
    stats: { rating: 4.9, jobs: 847, avgTicket: 612, conversionRate: 78, upsellRate: 42, onTimeRate: 96, callbackRate: 3 },
    coaching: [
      { type: "positive_reinforcement", summary: "Excellent upsell on maintenance plan — converted 3/4 customers this week", impact: 840 },
      { type: "upsell_missed", summary: "Missed duct cleaning upsell on 2 jobs where AI detected dirty ducts", impact: -298 },
    ],
    trend: "up",
  },
  {
    id: 2, name: "James Park", specialty: "Auto Repair", status: "active",
    avatar: "JP", color: "#10B981",
    stats: { rating: 4.7, jobs: 523, avgTicket: 445, conversionRate: 65, upsellRate: 28, onTimeRate: 91, callbackRate: 7 },
    coaching: [
      { type: "on_time_feedback", summary: "3 late arrivals this week — customers flagged punctuality in reviews", impact: -120 },
      { type: "estimate_conversion", summary: "Estimate acceptance rate dropped to 65% — consider presenting Good/Better/Best tiers", impact: -340 },
    ],
    trend: "down",
  },
  {
    id: 3, name: "Carlos Rivera", specialty: "Roofing", status: "active",
    avatar: "CR", color: "#8B5CF6",
    stats: { rating: 4.8, jobs: 312, avgTicket: 2180, conversionRate: 71, upsellRate: 35, onTimeRate: 94, callbackRate: 4 },
    coaching: [
      { type: "referral_missed", summary: "2 customers had visible gutter damage — referral to gutter service not offered", impact: -600 },
      { type: "positive_reinforcement", summary: "Perfect customer satisfaction scores this month — keep it up!", impact: 0 },
    ],
    trend: "up",
  },
  {
    id: 4, name: "Dr. Amanda Lee", specialty: "Dental", status: "active",
    avatar: "AL", color: "#EC4899",
    stats: { rating: 5.0, jobs: 198, avgTicket: 1640, conversionRate: 84, upsellRate: 55, onTimeRate: 99, callbackRate: 1 },
    coaching: [
      { type: "positive_reinforcement", summary: "Top performer this month — highest conversion rate on treatment plans", impact: 2200 },
    ],
    trend: "up",
  },
];

const coachingTypeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  positive_reinforcement: { label: "Positive", color: "#10B981", bg: "#F0FDF4", icon: ThumbsUp },
  upsell_missed:          { label: "Missed Upsell", color: "#F59E0B", bg: "#FFFBEB", icon: TrendingDown },
  on_time_feedback:       { label: "Punctuality", color: "#EF4444", bg: "#FEF2F2", icon: Clock },
  estimate_conversion:    { label: "Conversion", color: "#6366F1", bg: "#EEF2FF", icon: BarChart3 },
  referral_missed:        { label: "Missed Referral", color: "#F97316", bg: "#FFF7ED", icon: AlertTriangle },
  customer_service:       { label: "Customer Service", color: "#0EA5E9", bg: "#F0F9FF", icon: MessageSquare },
};

function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-900">{value}{max === 100 ? "%" : ""}</span>
      </div>
      <Progress value={(value / max) * 100} className="h-1.5" style={{ "--progress-color": color } as React.CSSProperties} />
    </div>
  );
}

export default function FSMTechnicians() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(technicians[0]);

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
              <span className="text-xs text-white">Technicians & Coaching</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold">Technician Performance</h1>
                <p className="text-blue-100 text-sm mt-0.5">
                  AI coaching, performance metrics, and revenue impact for every technician
                </p>
              </div>
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Technician
              </Button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: "Active Technicians", value: technicians.filter(t => t.status === "active").length },
                { label: "Avg Rating", value: (technicians.reduce((s, t) => s + t.stats.rating, 0) / technicians.length).toFixed(1) + "★" },
                { label: "Avg Ticket Size", value: "$" + Math.round(technicians.reduce((s, t) => s + t.stats.avgTicket, 0) / technicians.length).toLocaleString() },
                { label: "AI Coaching Notes", value: technicians.reduce((s, t) => s + t.coaching.length, 0) },
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Technician list */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Technician</p>
              {technicians.map(tech => (
                <Card
                  key={tech.id}
                  className={`cursor-pointer border transition-all ${selected.id === tech.id ? "border-blue-400 shadow-md" : "border-gray-200 hover:border-blue-200"} bg-white`}
                  onClick={() => setSelected(tech)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: tech.color }}
                      >
                        {tech.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{tech.name}</p>
                        <p className="text-xs text-gray-400">{tech.specialty}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-bold text-gray-900">{tech.stats.rating}</span>
                        </div>
                        {tech.trend === "up" ? (
                          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { label: "Jobs", value: tech.stats.jobs.toLocaleString() },
                        { label: "Avg $", value: "$" + tech.stats.avgTicket.toLocaleString() },
                        { label: "Conv.", value: tech.stats.conversionRate + "%" },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className="text-xs font-bold text-gray-900">{s.value}</p>
                          <p className="text-[10px] text-gray-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detail panel */}
            <div className="md:col-span-2 space-y-5">
              {/* Performance metrics */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ background: selected.color }}
                    >
                      {selected.avatar}
                    </div>
                    {selected.name}
                    <span className="text-gray-400 font-normal text-xs">· {selected.specialty}</span>
                    <Badge className="ml-auto text-[10px] bg-green-50 text-green-600 border border-green-200">Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <StatBar label="Customer Rating" value={selected.stats.rating * 20} color={selected.color} />
                      <StatBar label="Estimate Conversion" value={selected.stats.conversionRate} color={selected.color} />
                      <StatBar label="Upsell Rate" value={selected.stats.upsellRate} color={selected.color} />
                    </div>
                    <div className="space-y-3">
                      <StatBar label="On-Time Rate" value={selected.stats.onTimeRate} color={selected.color} />
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Callback Rate</span>
                          <span className={`font-semibold ${selected.stats.callbackRate > 5 ? "text-red-600" : "text-green-600"}`}>
                            {selected.stats.callbackRate}%
                          </span>
                        </div>
                        <Progress value={selected.stats.callbackRate} className="h-1.5" />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">${selected.stats.avgTicket.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">Avg Ticket Size</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-700">{selected.stats.jobs.toLocaleString()}</p>
                      <p className="text-xs text-blue-500">Total Jobs</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-700">
                        ${(selected.stats.jobs * selected.stats.avgTicket).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-500">Lifetime Revenue</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <p className="text-lg font-bold text-yellow-700">{selected.stats.rating}</p>
                      </div>
                      <p className="text-xs text-yellow-500">Customer Rating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Coaching Notes */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    AI Coaching Notes
                    <Badge className="ml-auto text-[10px] bg-blue-50 text-blue-600 border border-blue-200">
                      {selected.coaching.length} this week
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.coaching.map((note, i) => {
                    const cfg = coachingTypeConfig[note.type] ?? coachingTypeConfig.positive_reinforcement;
                    const CfgIcon = cfg.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}
                      >
                        <CfgIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cfg.color }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge className="text-[10px] px-1.5 py-0" style={{ background: cfg.color, color: "white" }}>
                              {cfg.label}
                            </Badge>
                            {note.impact !== 0 && (
                              <span className={`text-xs font-semibold ${note.impact > 0 ? "text-green-600" : "text-red-600"}`}>
                                {note.impact > 0 ? "+" : ""}${note.impact} revenue impact
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{note.summary}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0">
                          Ack
                        </Button>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" className="w-full text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate AI Coaching Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
