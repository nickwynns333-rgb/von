import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Star, DollarSign, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Send, Phone, Mail, ThumbsUp, ThumbsDown,
  Shield, TrendingUp, Wrench, ArrowRight, Info, BarChart3
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

// Demo report data
const demoReport = {
  jobNumber: "JOB-2401",
  customer: "Sarah Johnson",
  business: "Austin HVAC Pros",
  technician: { name: "Mike Torres", rating: 4.9, jobsCompleted: 847, certified: true },
  industry: "HVAC",
  serviceDate: new Date().toLocaleDateString(),
  // Diagnosis
  diagnosis: {
    title: "AC Refrigerant Leak — Compressor Strain Detected",
    summary: "Your air conditioning unit has a refrigerant leak in the evaporator coil, causing the compressor to work harder than normal. This is a common issue in units 8+ years old and is fully repairable.",
    urgency: "fix_now" as const,
    urgencyExplanation: "Continuing to run the system without repair will cause compressor failure within 2–4 weeks, turning a $485 repair into a $2,400+ replacement.",
    confidence: 94,
    estimatedLifespan: "3–5 years remaining (with repair)",
    riskIfUnaddressed: "Compressor burnout, complete system failure, potential mold growth from humidity imbalance.",
    alternativeOptions: [
      "Repair the leak and recharge refrigerant ($485) — recommended",
      "Full system replacement if compressor fails ($3,200–$4,800)",
      "Temporary patch (not recommended — will fail within 6 months)",
    ],
  },
  // Pricing
  pricing: {
    ourPrice: 485,
    marketLow: 380,
    marketHigh: 620,
    marketAvg: 498,
    position: "at_market" as const,
    breakdown: [
      { item: "Refrigerant leak detection & repair", amount: 195 },
      { item: "R-410A refrigerant recharge (2 lbs)", amount: 180 },
      { item: "Compressor stress test & tune-up", amount: 75 },
      { item: "System performance verification", amount: 35 },
    ],
  },
  // Recommendations
  recommendations: [
    "Schedule annual HVAC maintenance to catch issues early ($149/year membership available)",
    "Replace air filter monthly during summer — your current filter is 3 months old",
    "Consider a smart thermostat to reduce compressor strain ($199 installed)",
  ],
  relatedServices: [
    { service: "Duct Cleaning", reason: "Dirty ducts reduce efficiency by up to 30%", estimatedCost: "$299–$499", urgency: "soon" },
    { service: "Attic Insulation Check", reason: "Poor insulation forces AC to run longer", estimatedCost: "$150 inspection", urgency: "when_convenient" },
    { service: "Electrical Panel Inspection", reason: "AC units draw high amperage — panel should be verified", estimatedCost: "$125", urgency: "soon" },
  ],
  // Trust signals
  businessRating: 4.8,
  businessReviews: 312,
  licenseVerified: true,
  insuranceVerified: true,
};

const urgencyConfig = {
  fix_now: { label: "Fix Now", color: "#EF4444", bg: "#FEF2F2", icon: AlertTriangle },
  fix_soon: { label: "Fix Soon", color: "#F59E0B", bg: "#FFFBEB", icon: Clock },
  monitor: { label: "Monitor", color: "#3B82F6", bg: "#EFF6FF", icon: Info },
  optional: { label: "Optional", color: "#10B981", bg: "#F0FDF4", icon: CheckCircle2 },
};

export default function FSMCustomerReport() {
  const [, setLocation] = useLocation();
  const [rating, setRating] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const urgency = urgencyConfig[demoReport.diagnosis.urgency];
  const UrgencyIcon = urgency.icon;

  const priceDiff = ((demoReport.pricing.ourPrice - demoReport.pricing.marketAvg) / demoReport.pricing.marketAvg * 100).toFixed(1);
  const priceLabel = demoReport.pricing.position === "at_market" ? "At Market Rate" :
    demoReport.pricing.position === "below_market" ? "Below Market" : "Above Market";

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#F5F7FA]">
        {/* Page header */}
        <div
          className="px-6 pt-7 pb-8 text-white"
          style={{ background: "linear-gradient(135deg, #1A6FFF 0%, #3B8BFF 60%, #5BA3FF 100%)" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <button className="text-blue-200 text-xs hover:text-white" onClick={() => setLocation("/fsm")}>FSM Hub</button>
              <ChevronRight className="w-3 h-3 text-blue-300" />
              <button className="text-blue-200 text-xs hover:text-white" onClick={() => setLocation("/fsm/jobs")}>Jobs</button>
              <ChevronRight className="w-3 h-3 text-blue-300" />
              <span className="text-xs text-white">AI Customer Report</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium text-blue-100">AI-Generated Service Report</span>
                </div>
                <h1 className="text-2xl font-bold">{demoReport.diagnosis.title}</h1>
                <p className="text-blue-100 text-sm mt-1">
                  {demoReport.customer} · {demoReport.business} · {demoReport.serviceDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/15 border-white/30 text-white hover:bg-white/25"
                  onClick={() => { setSent(true); }}
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  Send via SMS
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                  onClick={() => { setSent(true); }}
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  Email Report
                </Button>
              </div>
            </div>
            {sent && (
              <div className="mt-3 bg-green-500/20 border border-green-400/30 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-300" />
                <span>Report sent to {demoReport.customer}!</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
          {/* Urgency banner */}
          <div
            className="rounded-xl p-4 flex items-start gap-3 border"
            style={{ background: urgency.bg, borderColor: `${urgency.color}40` }}
          >
            <UrgencyIcon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: urgency.color }} />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold" style={{ color: urgency.color }}>
                  Urgency: {urgency.label}
                </span>
                <Badge className="text-[10px] px-1.5 py-0" style={{ background: urgency.color, color: "white" }}>
                  AI Verdict
                </Badge>
              </div>
              <p className="text-sm text-gray-700">{demoReport.diagnosis.urgencyExplanation}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Diagnosis */}
            <div className="md:col-span-2 space-y-5">
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    AI Diagnosis
                    <Badge className="ml-auto text-[10px] bg-blue-50 text-blue-600 border border-blue-200">
                      {demoReport.diagnosis.confidence}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{demoReport.diagnosis.summary}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Estimated Lifespan</p>
                      <p className="text-sm font-semibold text-gray-900">{demoReport.diagnosis.estimatedLifespan}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Risk If Unaddressed</p>
                      <p className="text-sm font-semibold text-red-700">{demoReport.diagnosis.riskIfUnaddressed}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Options</p>
                    <div className="space-y-1.5">
                      {demoReport.diagnosis.alternativeOptions.map((opt, i) => (
                        <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${i === 0 ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                          {i === 0 ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0 mt-0.5" />
                          )}
                          <span className={i === 0 ? "text-green-800 font-medium" : "text-gray-600"}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-500" />
                    Price Transparency Report
                    <Badge className="ml-auto text-[10px] bg-green-50 text-green-600 border border-green-200">
                      {priceLabel}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price comparison bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Market Low: ${demoReport.pricing.marketLow}</span>
                      <span>Market Avg: ${demoReport.pricing.marketAvg}</span>
                      <span>Market High: ${demoReport.pricing.marketHigh}</span>
                    </div>
                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg, #10B981, #F59E0B, #EF4444)",
                          left: "0%", right: "0%"
                        }}
                      />
                      {/* Our price marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-sm"
                        style={{
                          left: `${((demoReport.pricing.ourPrice - demoReport.pricing.marketLow) / (demoReport.pricing.marketHigh - demoReport.pricing.marketLow) * 100).toFixed(0)}%`,
                          transform: "translateX(-50%) translateY(-50%)"
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full" />
                      <span className="text-xs text-gray-600">
                        Your price: <strong className="text-gray-900">${demoReport.pricing.ourPrice}</strong>
                        {" "}({priceDiff}% vs avg)
                      </span>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What You're Paying For</p>
                    {demoReport.pricing.breakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700">{item.item}</span>
                        <span className="font-semibold text-gray-900">${item.amount}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-2 font-bold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-blue-700 text-base">${demoReport.pricing.ourPrice}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Related services */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    AI-Recommended Related Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {demoReport.relatedServices.map((svc, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Wrench className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{svc.service}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            svc.urgency === "soon" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
                            "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}>
                            {svc.urgency === "soon" ? "Recommended Soon" : "When Convenient"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{svc.reason}</p>
                        <p className="text-xs font-medium text-gray-700 mt-0.5">{svc.estimatedCost}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600 hover:text-blue-700 shrink-0">
                        Book <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Technician trust card */}
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Technician</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                      {demoReport.technician.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{demoReport.technician.name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-gray-700">{demoReport.technician.rating}</span>
                        <span className="text-xs text-gray-400">· {demoReport.technician.jobsCompleted.toLocaleString()} jobs</span>
                      </div>
                    </div>
                  </div>
                  {demoReport.technician.certified && (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Certified & Background Checked</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Business trust card */}
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">About {demoReport.business}</p>
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(demoReport.businessRating) ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                    ))}
                    <span className="text-sm font-bold text-gray-900 ml-1">{demoReport.businessRating}</span>
                    <span className="text-xs text-gray-400">({demoReport.businessReviews} reviews)</span>
                  </div>
                  <div className="space-y-1.5">
                    {demoReport.licenseVerified && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>License Verified</span>
                      </div>
                    )}
                    {demoReport.insuranceVerified && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Insurance Verified</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>VonWork Verified Partner</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Recommendations</p>
                  <div className="space-y-2">
                    {demoReport.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Customer rating */}
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rate This Report</p>
                  <div className="flex items-center gap-2 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s}
                        onClick={() => setRating(s)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`w-6 h-6 ${rating && s <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"}`} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-green-600 border-green-200 hover:bg-green-50">
                      <ThumbsUp className="w-3 h-3 mr-1" /> Helpful
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-gray-500 border-gray-200">
                      <ThumbsDown className="w-3 h-3 mr-1" /> Not Helpful
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-2 h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50">
                    Request Second Opinion
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
