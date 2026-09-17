import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Check, Sparkles, TrendingUp, Building2, ArrowLeft, Star,
  Bot, Brain, MessageSquare, Network, Zap, ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const TIERS = [
  {
    key: "starter",
    name: "Starter",
    price: 149,
    description: "Traditional SEO + basic AI search visibility",
    badge: null,
    popular: false,
    geoIncluded: false,
    features: [
      { text: "1 website project", included: true },
      { text: "4 AI audits/month (Technical, Content, Schema)", included: true },
      { text: "Keyword research (50 keywords)", included: true },
      { text: "AI content brief generator", included: true },
      { text: "Meta tag writer", included: true },
      { text: "Schema.org markup generator", included: true },
      { text: "FAQ Schema Builder (AEO)", included: true },
      { text: "Monthly SEO report", included: true },
      { text: "AI Citation Optimizer", included: false },
      { text: "AI Answer Simulator", included: false },
      { text: "Entity & Brand Strategy", included: false },
    ],
    cta: "Start with Starter",
  },
  {
    key: "growth",
    name: "Growth",
    price: 299,
    description: "Full GEO/AEO suite — appear in AI search results",
    badge: "Most Popular",
    popular: true,
    geoIncluded: true,
    features: [
      { text: "3 website projects", included: true },
      { text: "15 AI audits/month (all 8 types)", included: true },
      { text: "Keyword research (200 keywords)", included: true },
      { text: "AI article writer (5 articles/mo)", included: true },
      { text: "On-page optimizer + Internal linking", included: true },
      { text: "Competitor gap analysis", included: true },
      { text: "FAQ Schema Builder (AEO)", included: true },
      { text: "✨ AI Citation Optimizer", included: true },
      { text: "✨ AI Answer Simulator (5 engines)", included: true },
      { text: "✨ Entity & Brand Strategy", included: true },
      { text: "✨ AI Content Rewriter", included: true },
    ],
    cta: "Get Growth",
  },
  {
    key: "agency",
    name: "Agency",
    price: 599,
    description: "Unlimited AI search domination for agencies",
    badge: "Best Value",
    popular: false,
    geoIncluded: true,
    features: [
      { text: "10 website projects", included: true },
      { text: "60 AI audits/month (all 8 types)", included: true },
      { text: "Unlimited keyword research", included: true },
      { text: "AI article writer (20 articles/mo)", included: true },
      { text: "Everything in Growth", included: true },
      { text: "White-label SEO reports", included: true },
      { text: "Priority AI processing", included: true },
      { text: "Custom GEO/AEO strategy session", included: true },
      { text: "API access for bulk operations", included: true },
      { text: "Reseller rights", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    cta: "Go Agency",
  },
];

const GEO_TOOLS = [
  { icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", name: "AI Citation Optimizer", desc: "Rewrite content so ChatGPT & Perplexity quote it directly in their answers" },
  { icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", name: "FAQ Schema Builder", desc: "Generate FAQ blocks matching exactly how people ask AI engines questions" },
  { icon: Network, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", name: "Entity & Brand Strategy", desc: "Discover which entities to mention to appear in AI knowledge graphs" },
  { icon: Bot, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", name: "AI Answer Simulator", desc: "See what ChatGPT says today — and exactly how to get your brand cited instead" },
  { icon: Brain, color: "text-pink-500", bg: "bg-pink-500/10 border-pink-500/20", name: "AI Content Rewriter", desc: "Add statistics, entities & FAQ blocks to maximize AI citations" },
];

const AI_ENGINES = [
  { name: "ChatGPT", color: "bg-green-500/20 text-green-300 border-green-500/30" },
  { name: "Perplexity", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { name: "Claude", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { name: "Gemini", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { name: "Bing Copilot", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
];

export default function SEOPricing() {
  const [, navigate] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const { user } = useAuth();

  const TIER_PRODUCT_MAP: Record<string, string> = {
    starter: "seo_starter",
    growth: "seo_growth",
    agency: "seo_agency",
  };

  const handleSubscribe = async (tier: string) => {
    const productId = TIER_PRODUCT_MAP[tier];
    if (!productId) return;
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: productId,
          userEmail: user?.email,
          userName: user?.name,
          userId: String(user?.id ?? ""),
        }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Checkout failed. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Nav */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/seo")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to SEO Dashboard
        </button>
        <div className="font-semibold">AI SEO Packages</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">

        {/* Hero */}
        <div className="text-center space-y-6">
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 px-4 py-1.5 text-sm">
            <Sparkles className="w-3 h-3 mr-2 inline" />
            The New SEO — GEO &amp; AEO for AI Search
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Stop Optimizing for Google.<br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Start Getting Cited by AI.
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Over 40% of searches now go to AI engines. VonWork's GEO/AEO suite gets your business cited by 
            ChatGPT, Perplexity, Claude, Gemini, and Bing Copilot — not just ranked on Google.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {AI_ENGINES.map(e => (
              <Badge key={e.name} className={e.color}>{e.name}</Badge>
            ))}
          </div>
          <div className="flex justify-center gap-8 pt-2">
            <div className="text-center">
              <p className="text-3xl font-bold text-violet-400">40%</p>
              <p className="text-xs text-muted-foreground mt-1">searches go to AI engines</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">2–8 wks</p>
              <p className="text-xs text-muted-foreground mt-1">to see AI citation results</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">5 engines</p>
              <p className="text-xs text-muted-foreground mt-1">optimized simultaneously</p>
            </div>
          </div>
        </div>

        {/* GEO/AEO Tools Showcase */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">5 Exclusive AI Search Optimization Tools</h2>
            <p className="text-muted-foreground mt-2">Included in Growth &amp; Agency plans — not available anywhere else</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {GEO_TOOLS.map((tool) => (
              <Card key={tool.name} className={`border ${tool.bg} text-center`}>
                <CardContent className="pt-6 space-y-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto ${tool.bg}`}>
                    <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  </div>
                  <p className="font-semibold text-sm">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-2">No setup fees. 7-day free trial. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <Card
                key={tier.key}
                className={`relative overflow-hidden ${tier.popular ? "border-2 border-violet-500 shadow-xl shadow-violet-500/10" : "border border-border"}`}
              >
                {tier.badge && (
                  <div className="absolute top-4 right-4">
                    <Badge className={tier.popular ? "bg-violet-500 text-white" : "bg-cyan-500 text-white"}>
                      {tier.badge}
                    </Badge>
                  </div>
                )}
                {tier.geoIncluded && (
                  <div className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-b border-violet-500/20 px-6 py-2 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    <span className="text-xs text-violet-300 font-medium">Includes all 5 GEO/AEO tools</span>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(tier.key)}
                    disabled={loadingTier === tier.key}
                  >
                    {loadingTier === tier.key ? "Loading..." : tier.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <div className="space-y-2 pt-2">
                    {tier.features.map((feature, i) => (
                      <div key={i} className={`flex items-start gap-2 text-sm ${!feature.included ? "opacity-35" : ""}`}>
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${feature.included ? "text-green-500" : "text-muted-foreground"}`} />
                        <span>{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* What Claude SEO Team Does */}
        <Card className="border-border">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-bold text-center mb-8">Powered by Claude SEO Team — 25 Specialized Agents</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: TrendingUp,
                  title: "Traditional SEO",
                  color: "text-green-500",
                  items: ["Core Web Vitals analysis", "Crawlability & indexability", "Schema.org markup", "Mobile optimization", "E-E-A-T content scoring"],
                },
                {
                  icon: Sparkles,
                  title: "GEO/AEO — AI Search",
                  color: "text-violet-500",
                  items: ["AI Citation Optimizer", "FAQ Schema Builder", "Entity & Brand Strategy", "AI Answer Simulator", "AI Content Rewriter"],
                },
                {
                  icon: Building2,
                  title: "Growth & Competition",
                  color: "text-blue-500",
                  items: ["Competitor gap analysis", "Keyword clustering", "Local SEO optimization", "Backlink opportunities", "Internal linking planner"],
                },
              ].map((section, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-4">
                    <section.icon className={`w-5 h-5 ${section.color}`} />
                    <h3 className="font-semibold">{section.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3 h-3 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to dominate AI search?</h2>
          <p className="text-muted-foreground">Start with a free audit — no credit card required.</p>
          <Button size="lg" className="gap-2" onClick={() => navigate("/seo")}>
            <Zap className="w-5 h-5" />
            Run Your Free AI SEO Audit
          </Button>
          <p className="text-xs text-muted-foreground">
            Questions? <a href="mailto:support@vonwork.ai" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
