/**
 * VonWork × JoinForce — Exclusive Member Pricing
 * Hidden from public nav — only accessible via direct link or JoinForce gate
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, Zap, Star, Shield, TrendingUp, Users, MessageSquare, Video } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const JF_PLANS = [
  {
    id: "jf_starter",
    name: "Starter",
    subtitle: "Core AI Business OS",
    publicPrice: "$499",
    jfPrice: "$299",
    savings: "$200/mo",
    annualSavings: "$2,400/yr",
    discount: "40% off",
    color: "border-gray-200",
    headerBg: "bg-gray-50",
    badgeColor: "bg-gray-100 text-gray-700",
    btnClass: "bg-gray-900 hover:bg-gray-700 text-white",
    features: [
      "AI Receptionist (1,000 min/mo)",
      "CRM + Deals Pipeline",
      "Omnichannel Inbox (SMS/email)",
      "AI Scheduler + Booking Page",
      "Payroll + Legal AI",
      "1 AI Chat Agent",
      "JoinForce member badge",
    ],
    icon: <Zap className="w-6 h-6 text-gray-600" />,
  },
  {
    id: "jf_pro",
    name: "AI Video Pro",
    subtitle: "Custom video agent + full AI Business OS",
    publicPrice: "$999",
    jfPrice: "$699",
    savings: "$300/mo",
    annualSavings: "$3,600/yr",
    discount: "30% off",
    color: "border-[#1A6FFF]",
    headerBg: "bg-[#EEF4FF]",
    badgeColor: "bg-[#1A6FFF] text-white",
    btnClass: "bg-[#1A6FFF] hover:bg-[#0052CC] text-white",
    highlight: true,
    features: [
      "Everything in Starter",
      "AI Call Center (10,000 min/mo)",
      "Broadcast — bulk SMS + voice",
      "Full Accounting + AI CFO",
      "Custom avatar + consent-based voice workflow",
      "Live AI Video Meeting Room",
      "Website prospecting and demo-site tools",
      "JoinForce referral commission tracking",
    ],
    icon: <Star className="w-6 h-6 text-[#1A6FFF]" />,
  },
];

const JF_ADDONS = [
  { id: "jf_seo_execution", name: "AI SEO Execution", publicPrice: "$149/mo", jfPrice: "$99/mo", savings: "$50/mo", desc: "All SEO tools — keyword research, article writer, meta, schema, on-page" },
  { id: "jf_geo_aeo", name: "GEO/AEO Tools", publicPrice: "$149/mo", jfPrice: "$99/mo", savings: "$50/mo", desc: "All 5 AI search optimization tools — get cited by ChatGPT, Perplexity, Claude" },
  { id: "jf_seo_bundle", name: "SEO + GEO Bundle", publicPrice: "$249/mo", jfPrice: "$149/mo", savings: "$100/mo", desc: "Both SEO Execution AND GEO/AEO — best value for JoinForce members" },
];

export default function JoinForcePricing() {
  const { user } = useAuth();
  const entitlement = trpc.memberPricing.getJoinForceOffers.useQuery(undefined, { enabled: !!user });
  const checkout = trpc.memberPricing.createJoinForceCheckout.useMutation({
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(error.message),
  });
  const canPurchase = !!entitlement.data?.eligibility.eligible;
  const handleCheckout = (plan: string) => {
    if (!user) { window.location.assign(getLoginUrl()); return; }
    if (!canPurchase) {
      toast.error(entitlement.data?.eligibility.reason ?? "Verify your JoinForce credential in the VON WORK Qualification page first.");
      return;
    }
    checkout.mutate({ plan: plan as "jf_starter" | "jf_pro" | "jf_seo_execution" | "jf_geo_aeo" | "jf_seo_bundle", origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1A6FFF] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg">VonWork</span>
          <span className="text-white/40 mx-2">×</span>
          <span className="font-extrabold text-yellow-400 text-lg">JoinForce</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <a href="/dashboard" className="text-sm text-white/70 hover:text-white transition">Go to Dashboard →</a>
          ) : (
            <a href={getLoginUrl()} className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold px-4 py-2 rounded-lg text-sm transition">
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-extrabold tracking-widest uppercase px-4 py-2 rounded-full mb-6">
          <Lock className="w-3.5 h-3.5" /> JoinForce Members Only — Exclusive Pricing
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
          Your Member Discount<br />
          <span className="text-yellow-400">Saves Up to $3,600/yr</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
          As a JoinForce member you get exclusive discounted access to the full VonWork AI Business OS — the same platform that replaces $5,000+/month in SaaS tools.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-yellow-400" /> Verified JoinForce members only</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" /> 14-day free trial on all plans</span>
          <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[#1A6FFF]" /> Cancel anytime</span>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {JF_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white/5 border-2 ${plan.color} rounded-2xl p-7 flex flex-col backdrop-blur-sm ${plan.highlight ? "shadow-2xl shadow-[#1A6FFF]/30" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 rounded-full">
                  <span className="text-xs font-extrabold text-gray-900 tracking-wider">MOST POPULAR</span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  {plan.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">{plan.name}</h3>
                  <p className="text-white/50 text-xs">{plan.subtitle}</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white/5 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/40 text-sm">Public price</span>
                  <span className="text-white/40 line-through text-sm">{plan.publicPrice}/mo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 font-extrabold text-sm">Your JF price</span>
                  <span className="text-yellow-400 font-extrabold text-2xl">{plan.jfPrice}/mo</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{plan.discount}</Badge>
                  <span className="text-green-400 font-bold">Save {plan.annualSavings}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full font-extrabold ${plan.btnClass}`}
                disabled={checkout.isPending || entitlement.isLoading}
                onClick={() => handleCheckout(plan.id)}
              >
                Get Started — {plan.jfPrice}/mo
              </Button>
              <div className="text-xs text-white/30 text-center mt-2">14-day free trial included</div>
            </div>
          ))}
        </div>
      </section>

      {/* Add-on services */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-2">Add-On Services — JoinForce Rates</h2>
            <p className="text-white/50 text-sm">Flat rate — no tiers, no complexity. Add to any plan.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {JF_ADDONS.map((addon) => (
              <div key={addon.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-white">{addon.name}</h4>
                  <div className="text-right">
                    <div className="text-white/40 line-through text-xs">{addon.publicPrice}</div>
                    <div className="text-yellow-400 font-extrabold">{addon.jfPrice}</div>
                  </div>
                </div>
                <p className="text-white/50 text-xs mb-4">{addon.desc}</p>
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Save {addon.savings}</Badge>
                  <Button size="sm" disabled={checkout.isPending || entitlement.isLoading} className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs" onClick={() => handleCheckout(addon.id)}>
                    Add to Plan →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer note */}
      <footer className="border-t border-white/10 px-6 py-8 text-center">
        <p className="text-white/40 text-sm">
          This page is exclusively for verified JoinForce members. Pricing is not publicly advertised.
          <br />
          Questions? Contact <a href="mailto:support@vonwork.ai" className="text-[#1A6FFF] hover:underline">support@vonwork.ai</a>
        </p>
      </footer>
    </div>
  );
}
