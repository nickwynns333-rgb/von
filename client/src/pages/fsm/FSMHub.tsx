import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wrench, Zap, Droplets, Flame, Wind, Car, Stethoscope, Smile,
  Eye, Brain, Scale, Home, Scissors, Dumbbell, UtensilsCrossed,
  Truck, Shield, Leaf, Paintbrush, Building2, ChevronRight, Sparkles,
  TrendingUp, Users, Star, ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";

const industries = [
  // Home Services
  { id: "hvac", label: "HVAC", icon: Wind, category: "home_services", color: "#3B82F6", description: "Heating, ventilation & air conditioning" },
  { id: "plumbing", label: "Plumbing", icon: Droplets, category: "home_services", color: "#06B6D4", description: "Pipes, drains & water systems" },
  { id: "electrical", label: "Electrical", icon: Zap, category: "home_services", color: "#F59E0B", description: "Wiring, panels & electrical repairs" },
  { id: "roofing", label: "Roofing", icon: Home, category: "home_services", color: "#8B5CF6", description: "Roof repair, replacement & inspection" },
  { id: "painting", label: "Painting", icon: Paintbrush, category: "home_services", color: "#EC4899", description: "Interior & exterior painting" },
  { id: "landscaping", label: "Landscaping", icon: Leaf, category: "home_services", color: "#10B981", description: "Lawn care, trees & outdoor services" },
  { id: "appliance_repair", label: "Appliance Repair", icon: Wrench, category: "home_services", color: "#6366F1", description: "Washers, dryers, refrigerators & more" },
  { id: "general_contractor", label: "General Contractor", icon: Building2, category: "home_services", color: "#64748B", description: "Remodeling, construction & renovations" },
  // Automotive
  { id: "auto_repair", label: "Auto Repair", icon: Car, category: "automotive", color: "#EF4444", description: "Engine, brakes, transmission & more" },
  { id: "auto_body", label: "Auto Body", icon: Car, category: "automotive", color: "#F97316", description: "Collision repair & bodywork" },
  { id: "tire_shop", label: "Tire & Wheel", icon: Car, category: "automotive", color: "#84CC16", description: "Tires, alignment & wheel services" },
  // Medical & Wellness
  { id: "dental", label: "Dental", icon: Smile, category: "medical_wellness", color: "#0EA5E9", description: "Dentistry, orthodontics & oral health" },
  { id: "medical", label: "Medical / Doctor", icon: Stethoscope, category: "medical_wellness", color: "#22C55E", description: "Primary care, specialists & clinics" },
  { id: "optometry", label: "Optometry", icon: Eye, category: "medical_wellness", color: "#A855F7", description: "Eye exams, glasses & contacts" },
  { id: "mental_health", label: "Mental Health", icon: Brain, category: "medical_wellness", color: "#7C3AED", description: "Therapy, counseling & psychiatry" },
  { id: "chiropractic", label: "Chiropractic", icon: Stethoscope, category: "medical_wellness", color: "#14B8A6", description: "Spinal care & physical therapy" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, category: "medical_wellness", color: "#F43F5E", description: "Hair, nails, skin & beauty services" },
  { id: "fitness", label: "Fitness / Gym", icon: Dumbbell, category: "medical_wellness", color: "#FB923C", description: "Personal training & fitness coaching" },
  // Professional Specialty
  { id: "legal", label: "Legal Services", icon: Scale, category: "professional_specialty", color: "#475569", description: "Attorneys, paralegals & legal aid" },
  { id: "pest_control", label: "Pest Control", icon: Shield, category: "professional_specialty", color: "#65A30D", description: "Extermination & prevention" },
  { id: "moving", label: "Moving & Storage", icon: Truck, category: "professional_specialty", color: "#0284C7", description: "Residential & commercial moving" },
  { id: "food_delivery", label: "Food Service", icon: UtensilsCrossed, category: "professional_specialty", color: "#DC2626", description: "Restaurants, catering & delivery" },
  { id: "security", label: "Security Systems", icon: Shield, category: "professional_specialty", color: "#1D4ED8", description: "Alarms, cameras & access control" },
];

const categoryMeta: Record<string, { label: string; description: string; color: string }> = {
  home_services: { label: "Home Services", description: "Residential & commercial property services", color: "#3B82F6" },
  automotive: { label: "Automotive", description: "Vehicle repair, body & specialty shops", color: "#EF4444" },
  medical_wellness: { label: "Medical & Wellness", description: "Healthcare, dental, therapy & beauty", color: "#10B981" },
  professional_specialty: { label: "Professional Specialty", description: "Legal, pest, moving & specialty trades", color: "#8B5CF6" },
};

const stats = [
  { label: "Industries Supported", value: "23+", icon: Building2 },
  { label: "AI Features", value: "12", icon: Sparkles },
  { label: "Avg Revenue Lift", value: "+34%", icon: TrendingUp },
  { label: "Technician Rating", value: "4.9★", icon: Star },
];

export default function FSMHub() {
  const [, setLocation] = useLocation();

  const grouped = Object.entries(categoryMeta).map(([catId, meta]) => ({
    ...meta,
    id: catId,
    industries: industries.filter(i => i.category === catId),
  }));

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#F5F7FA]">
        {/* Page header */}
        <div
          className="px-6 pt-8 pb-10 text-white"
          style={{ background: "linear-gradient(135deg, #1A6FFF 0%, #3B8BFF 60%, #5BA3FF 100%)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80 uppercase tracking-widest">AI Field Service Management</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">VonWork FSM</h1>
            <p className="text-blue-100 text-base max-w-2xl">
              The AI-powered ServiceTitan alternative. Pre-appointment calls, AI estimates, repair validation,
              pricing intelligence, and technician coaching — for every service industry.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {stats.map(s => (
                <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
                  <s.icon className="w-5 h-5 text-white/70 shrink-0" />
                  <div>
                    <p className="text-xl font-bold leading-none">{s.value}</p>
                    <p className="text-xs text-blue-100 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              className="bg-primary text-white hover:bg-primary/90"
              onClick={() => setLocation("/fsm/jobs")}
            >
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Job Board
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocation("/fsm/dispatch")}>
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Dispatch
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocation("/fsm/estimates")}>
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Estimates
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocation("/fsm/customers")}>
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Customers
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocation("/fsm/technicians")}>
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Technicians
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocation("/fsm/reports")}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Reports
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocation("/fsm/pricebook")}>
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Pricebook
            </Button>
          </div>
        </div>

        {/* Industry selector */}
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Your Industry</h2>
            <p className="text-sm text-gray-500">
              Choose your service category to access industry-specific AI tools, pricing benchmarks, and workflows.
            </p>
          </div>

          {grouped.map(cat => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{cat.label}</h3>
                <span className="text-xs text-gray-400">{cat.description}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {cat.industries.map(ind => (
                  <Card
                    key={ind.id}
                    className="cursor-pointer border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all group"
                    onClick={() => setLocation(`/fsm/jobs?industry=${ind.id}`)}
                  >
                    <CardContent className="p-4">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: `${ind.color}18` }}
                      >
                        <ind.icon className="w-5 h-5" style={{ color: ind.color }} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{ind.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{ind.description}</p>
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-blue-600 font-medium">Open</span>
                        <ChevronRight className="w-3 h-3 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* AI Feature highlight cards */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Sparkles,
                  color: "#3B82F6",
                  title: "AI Pre-Appointment Call",
                  desc: "AI calls the customer before the tech arrives — captures symptoms, confirms appointment, and pre-stages parts.",
                  path: "/fsm/pre-calls",
                },
                {
                  icon: TrendingUp,
                  color: "#10B981",
                  title: "AI Estimate & Pricing Intel",
                  desc: "AI generates Good/Better/Best estimates with live market benchmarks so your price is always defensible.",
                  path: "/fsm/estimates",
                },
                {
                  icon: Star,
                  color: "#F59E0B",
                  title: "Customer AI Report",
                  desc: "Send every customer a full AI report: diagnosis, price comparison, urgency rating, and recommended next steps.",
                  path: "/fsm/reports",
                },
              ].map(f => (
                <Card
                  key={f.title}
                  className="cursor-pointer border border-gray-200 bg-white hover:shadow-md transition-all"
                  onClick={() => setLocation(f.path)}
                >
                  <CardContent className="p-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${f.color}18` }}
                    >
                      <f.icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                    <div className="flex items-center gap-1 mt-3">
                      <span className="text-xs text-blue-600 font-medium">Explore</span>
                      <ArrowRight className="w-3 h-3 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Coming soon badge */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Built to grow every day</p>
              <p className="text-xs text-blue-700 mt-0.5">
                New AI features, industry pricebooks, and integrations are added continuously.
                Every module improves with usage — the more jobs you run, the smarter the platform gets.
              </p>
            </div>
            <Badge className="ml-auto shrink-0 bg-blue-600 text-white text-[10px]">LIVE</Badge>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
