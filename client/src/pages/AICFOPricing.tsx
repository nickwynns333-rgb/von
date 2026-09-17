import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Check, FileText, Zap, Shield, Clock, Star, Loader2, DollarSign } from "lucide-react";

const TIERS = [
  {
    id: "ai_bookkeeper",
    productId: "aicfo_bookkeeper",
    name: "AI Bookkeeper",
    price: 297,
    description: "Automated bookkeeping for small businesses and freelancers",
    badge: null,
    color: "border-border",
    features: [
      "AI transaction categorization",
      "Receipt OCR upload",
      "Monthly P&L report",
      "Expense tracking",
      "1 accounting client",
      "AI Tax Advisor Q&A",
      "Email support",
    ],
    notIncluded: ["Bank reconciliation", "AI CFO chat", "Tax filing service", "Indian CPA team access"],
  },
  {
    id: "ai_controller",
    productId: "aicfo_controller",
    name: "AI Controller",
    price: 697,
    description: "Full bookkeeping + bank reconciliation for growing businesses",
    badge: "Popular",
    color: "border-primary",
    features: [
      "Everything in AI Bookkeeper",
      "Bank reconciliation",
      "Cash flow forecasting",
      "3 accounting clients",
      "AI CFO chat (50 messages/mo)",
      "Quarterly tax estimates",
      "1 tax filing included/year",
      "Priority support",
    ],
    notIncluded: ["Unlimited AI CFO chat", "Full tax filing suite", "Dedicated CPA"],
  },
  {
    id: "ai_cfo",
    productId: "aicfo_cfo",
    name: "AI CFO",
    price: 1497,
    description: "Strategic financial intelligence + full tax services",
    badge: "Best Value",
    color: "border-blue-500",
    features: [
      "Everything in AI Controller",
      "Unlimited AI CFO chat",
      "Strategic financial planning",
      "10 accounting clients",
      "Full tax filing suite (all forms)",
      "3 tax filings included/year",
      "Indian CPA team access",
      "Scenario modeling",
      "Dedicated account manager",
    ],
    notIncluded: ["White-label reseller rights"],
  },
  {
    id: "ai_cfo_enterprise",
    productId: "aicfo_enterprise",
    name: "AI CFO Enterprise",
    price: 2997,
    description: "Full-service accounting firm in a box — for agencies and enterprises",
    badge: "Enterprise",
    color: "border-purple-500",
    features: [
      "Everything in AI CFO",
      "Unlimited accounting clients",
      "Unlimited tax filings",
      "Dedicated Indian CPA team",
      "White-label reseller rights",
      "Custom integrations",
      "SLA guarantee",
      "Weekly CFO strategy calls",
      "API access",
    ],
    notIncluded: [],
  },
];

const TAX_ADDONS = [
  { label: "Form 1040 – Individual", price: 110 },
  { label: "Form 1120 – C Corporation", price: 220 },
  { label: "Form 1120-S – S Corporation", price: 220 },
  { label: "Form 1065 – Partnership / LLC", price: 220 },
  { label: "Form 1041 – Estate or Trust", price: 220 },
  { label: "Quarterly Estimated Taxes", price: 40 },
  { label: "Additional Schedule (C, D, E, F...)", price: 20 },
  { label: "Additional State Return", price: 20 },
];

export default function AICFOPricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const { user } = useAuth();

  const getPrice = (price: number) => billing === "annual" ? Math.round(price * 0.8) : price;

  const handleSubscribe = async (tier: typeof TIERS[0]) => {
    setLoadingTier(tier.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: tier.productId,
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
    <PageShell title="AI CFO Pricing" subtitle="Choose your AI-powered accounting plan" icon={<DollarSign className="w-5 h-5" />}>
      <div className="p-6 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-2">AI CFO Suite</Badge>
          <h1 className="text-4xl font-bold">Your AI-Powered Accounting Team</h1>
          <p className="text-muted-foreground text-lg">
            From automated bookkeeping to full tax filing — backed by AI and a dedicated Indian CPA team.
            Save 80% vs. a traditional accounting firm.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant={billing === "monthly" ? "default" : "outline"} size="sm" onClick={() => setBilling("monthly")}>Monthly</Button>
            <Button variant={billing === "annual" ? "default" : "outline"} size="sm" onClick={() => setBilling("annual")}>
              Annual <Badge variant="secondary" className="ml-2">Save 20%</Badge>
            </Button>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TIERS.map(tier => (
            <Card key={tier.id} className={`relative border-2 ${tier.color} flex flex-col`}>
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={tier.badge === "Best Value" ? "bg-blue-600" : tier.badge === "Enterprise" ? "bg-purple-600" : ""}>{tier.badge}</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <CardDescription className="text-xs">{tier.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${getPrice(tier.price)}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                  {billing === "annual" && <p className="text-xs text-green-600 mt-1">Billed ${getPrice(tier.price) * 12}/year</p>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {tier.notIncluded.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-center">–</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" variant={tier.badge === "Best Value" ? "default" : "outline"}
                  disabled={loadingTier === tier.id}
                  onClick={() => handleSubscribe(tier)}>
                  {loadingTier === tier.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tax filing add-ons */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Tax Filing Add-Ons</h2>
          <p className="text-muted-foreground mb-6">Pay-per-filing pricing. Handled by our licensed CPA team within 5–7 business days.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TAX_ADDONS.map(a => (
              <div key={a.label} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{a.label}</span>
                </div>
                <span className="font-semibold text-sm">${a.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
          <div className="space-y-2">
            <Shield className="w-8 h-8 mx-auto text-blue-500" />
            <h3 className="font-semibold">IRS Compliant</h3>
            <p className="text-sm text-muted-foreground">All filings prepared by licensed CPAs following IRS guidelines</p>
          </div>
          <div className="space-y-2">
            <Clock className="w-8 h-8 mx-auto text-green-500" />
            <h3 className="font-semibold">5–7 Day Turnaround</h3>
            <p className="text-sm text-muted-foreground">Dedicated Indian CPA team delivers completed returns fast</p>
          </div>
          <div className="space-y-2">
            <Star className="w-8 h-8 mx-auto text-yellow-500" />
            <h3 className="font-semibold">80% Cost Savings</h3>
            <p className="text-sm text-muted-foreground">vs. traditional US accounting firms charging $2,000–$10,000/year</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" onClick={() => window.location.href = "/aicfo"}>
            Open AI CFO Dashboard <Zap className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
