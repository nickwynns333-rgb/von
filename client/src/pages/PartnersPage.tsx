import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DollarSign, Users, TrendingUp, Star, Award, Zap, CheckCircle,
  ArrowRight, Copy, Gift, Shield, Globe, BarChart3, Rocket, Crown
} from "lucide-react";
import { useLocation } from "wouter";

const TIERS = [
  {
    name: "Bronze",
    icon: <Star className="w-5 h-5 text-amber-600" />,
    commission: "20%",
    requirement: "$0 – $999/mo",
    color: "border-amber-700 bg-amber-900/20",
    badge: "bg-amber-700/30 text-amber-300",
    perks: ["Dedicated affiliate link", "Monthly payouts", "Marketing assets", "Email support"],
  },
  {
    name: "Silver",
    icon: <Award className="w-5 h-5 text-gray-300" />,
    commission: "25%",
    requirement: "$1,000 – $4,999/mo",
    color: "border-gray-400 bg-gray-700/20",
    badge: "bg-gray-600/30 text-gray-300",
    perks: ["Everything in Bronze", "Bi-weekly payouts", "Co-branded materials", "Priority support"],
  },
  {
    name: "Gold",
    icon: <Crown className="w-5 h-5 text-yellow-400" />,
    commission: "30%",
    requirement: "$5,000 – $14,999/mo",
    color: "border-yellow-500 bg-yellow-900/20",
    badge: "bg-yellow-700/30 text-yellow-300",
    perks: ["Everything in Silver", "Weekly payouts", "White-label demos", "Dedicated manager"],
    featured: true,
  },
  {
    name: "Platinum",
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    commission: "35%",
    requirement: "$15,000 – $29,999/mo",
    color: "border-blue-500 bg-blue-900/20",
    badge: "bg-blue-700/30 text-blue-300",
    perks: ["Everything in Gold", "Custom commission deals", "API access", "Revenue sharing on upsells"],
  },
  {
    name: "Diamond",
    icon: <Rocket className="w-5 h-5 text-purple-400" />,
    commission: "40%+",
    requirement: "$30,000+/mo",
    color: "border-purple-500 bg-purple-900/20",
    badge: "bg-purple-700/30 text-purple-300",
    perks: ["Everything in Platinum", "Equity discussion", "Custom pricing authority", "Executive access"],
  },
];

const STATS = [
  { label: "Avg. Partner Earnings", value: "$4,200/mo", icon: <DollarSign className="w-5 h-5 text-green-400" /> },
  { label: "Active Partners", value: "500+", icon: <Users className="w-5 h-5 text-blue-400" /> },
  { label: "Total Paid Out", value: "$2.4M+", icon: <TrendingUp className="w-5 h-5 text-purple-400" /> },
  { label: "Avg. Close Rate", value: "34%", icon: <BarChart3 className="w-5 h-5 text-yellow-400" /> },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Sign Up Free", desc: "Create your affiliate account in under 60 seconds. No approval needed." },
  { step: "2", title: "Get Your Link", desc: "Receive a unique referral link and access to our full marketing asset library." },
  { step: "3", title: "Share & Earn", desc: "Refer businesses to VonWork. Earn 20–40%+ recurring commission on every sale." },
  { step: "4", title: "Get Paid", desc: "Commissions are paid monthly via Stripe. Top partners get weekly payouts." },
];

export default function PartnersPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [referralCode, setReferralCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const meQ = trpc.affiliate.me.useQuery(undefined, { enabled: !!user, retry: false });
  const registerMutation = trpc.affiliate.register.useMutation({
    onSuccess: () => {
      toast.success("Welcome to the VonWork Partner Program! Check your email.");
      navigate("/affiliate");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleJoin = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    registerMutation.mutate({ type: "affiliate" });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-bold text-gray-900">
            Von<span className="text-purple-400">Work</span>
          </button>
          <div className="flex items-center gap-4">
            {user ? (
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => navigate("/affiliate")}>
                My Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="text-gray-300" onClick={() => window.location.href = getLoginUrl()}>Sign In</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleJoin}>Join Free</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-6 text-sm px-4 py-1">
            🚀 Partner Program — Earn Up to 40%+ Recurring Commission
          </Badge>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Build a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">$10K/mo</span><br />Referral Business
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Refer businesses to VonWork's AI Business OS and earn recurring commissions on every subscription — forever. No cap. No expiry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-8 h-14" onClick={handleJoin}>
              <Gift className="w-5 h-5 mr-2" />
              {user ? "Go to My Dashboard" : "Join the Partner Program"}
            </Button>
            <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 h-14"
              onClick={() => document.getElementById("tiers")?.scrollIntoView({ behavior: "smooth" })}>
              View Commission Tiers
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(step => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-gray-800 font-bold mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section id="tiers" className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-4">Commission Tiers</h2>
          <p className="text-gray-400 text-center mb-12">The more you refer, the more you earn. Tiers upgrade automatically.</p>
          <div className="grid md:grid-cols-5 gap-4">
            {TIERS.map(tier => (
              <div key={tier.name} className={`relative rounded-2xl border p-5 ${tier.color} ${tier.featured ? "ring-2 ring-yellow-500/50" : ""}`}>
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-black text-xs font-bold px-3">Most Popular</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {tier.icon}
                  <span className="text-gray-800 font-bold">{tier.name}</span>
                </div>
                <div className="text-3xl font-black text-white mb-1">{tier.commission}</div>
                <div className="text-xs text-gray-400 mb-4">{tier.requirement}</div>
                <ul className="space-y-2">
                  {tier.perks.map(perk => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you're selling */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-4">What You're Selling</h2>
          <p className="text-gray-400 text-center mb-12">VonWork replaces 10+ SaaS tools. Easy to sell, high retention.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "📞", title: "AI Phone System", desc: "Replace RingCentral + Twilio" },
              { icon: "💬", title: "Omnichannel Inbox", desc: "Replace Respond.io + Intercom" },
              { icon: "🤖", title: "AI Sales Agents", desc: "Replace Outreach + Salesloft" },
              { icon: "📊", title: "CRM", desc: "Replace HubSpot + Salesforce" },
              { icon: "💰", title: "AI CFO + Bookkeeping", desc: "Replace QuickBooks + accountant" },
              { icon: "📣", title: "AI Marketing", desc: "Replace Mailchimp + Hootsuite" },
              { icon: "⚖️", title: "AI Legal", desc: "Replace LegalZoom + lawyer" },
              { icon: "👥", title: "AI Payroll", desc: "Replace Gusto + ADP" },
              { icon: "🌐", title: "AI SEO + GEO/AEO", desc: "Replace SEMrush + agency" },
            ].map(item => (
              <div key={item.title} className="p-4 rounded-xl bg-gray-800 border border-gray-700 flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-gray-500 text-xs">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign up CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-900/40 to-gray-950">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-black mb-4">Ready to Start Earning?</h2>
          <p className="text-gray-400 mb-8">Join 500+ partners already earning with VonWork. Free to join, no approval needed.</p>

          {user ? (
            <div className="space-y-4">
              {meQ?.data ? (
                <div className="p-6 bg-gray-800 rounded-2xl border border-gray-700 space-y-4">
                  <p className="text-green-400 font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />You're already a partner!
                  </p>
                  <div className="flex gap-2">
                    <Input value={`${window.location.origin}/?ref=${(meQ.data as { referralCode: string } | null)?.referralCode ?? ""}`} readOnly className="bg-gray-100 border-gray-200 text-white text-sm" />
                    <Button variant="outline" className="border-gray-600 shrink-0"
                      onClick={() => copyLink(`${window.location.origin}/?ref=${(meQ.data as { referralCode: string } | null)?.referralCode ?? ""}`)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => navigate("/affiliate")}>
                    Go to Partner Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="Referral code (optional)" value={referralCode} onChange={e => setReferralCode(e.target.value)} className="bg-white border-gray-200 text-white" />
                  <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700 h-12"
                    onClick={handleJoin} disabled={registerMutation?.isPending}>
                    {registerMutation?.isPending ? "Joining..." : "Join the Partner Program"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} className="bg-white border-gray-200 text-white" />
                <Input placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} className="bg-white border-gray-200 text-white" />
              </div>
              <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="bg-white border-gray-200 text-white" />
              <Input placeholder="Referral code (optional)" value={referralCode} onChange={e => setReferralCode(e.target.value)} className="bg-white border-gray-200 text-white" />
              <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700 h-12" onClick={handleJoin}>
                Create Free Partner Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-gray-500">By joining, you agree to our Partner Terms. No credit card required.</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 text-gray-500 text-sm">
          {[
            { icon: <Shield className="w-4 h-4" />, text: "Stripe-powered payouts" },
            { icon: <Globe className="w-4 h-4" />, text: "Pay worldwide" },
            { icon: <CheckCircle className="w-4 h-4" />, text: "No minimum payout" },
            { icon: <TrendingUp className="w-4 h-4" />, text: "Lifetime recurring commissions" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} VonWork AI Business OS. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
          <button onClick={() => navigate("/affiliate")} className="hover:text-white transition-colors">Partner Dashboard</button>
        </div>
      </footer>
    </div>
  );
}
