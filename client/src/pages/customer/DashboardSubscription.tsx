import { trpc } from "@/lib/trpc";
import { DashboardShell, customerNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Package, CheckCircle, Zap } from "lucide-react";

export default function DashboardSubscription() {
  const { data: sub } = trpc.subscription.current.useQuery();
  const { data: plans } = trpc.plans.list.useQuery();

  const handleUpgrade = (planId: number) => {
    toast.info("Redirecting to checkout...");
  };

  const currentPlan = (sub as any)?.plan;

  return (
    <DashboardShell navItems={customerNavItems} title="Subscription" role="customer">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription</h1>
            <p className="text-white/50 text-sm">Manage your plan and billing</p>
          </div>
        </div>

        {/* Current Plan */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm">Current Plan</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {currentPlan?.name ?? "Free"}
                </p>
                {currentPlan && (
                  <p className="text-cyan-400 text-sm mt-1">
                    ${((currentPlan.priceMonthly ?? 0) / 100).toFixed(2)}/month
                  </p>
                )}
              </div>
              <Badge className={currentPlan ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/50 border-white/10"}>
                {currentPlan ? "Active" : "Free Tier"}
              </Badge>
            </div>
            {(sub as any)?.expiresAt && (
              <p className="text-white/30 text-xs mt-3">
                Renews {new Date((sub as any).expiresAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(plans ?? []).map((plan: any) => (
              <Card
                key={plan.id}
                className={`bg-[#0f0f1a] border-white/10 hover:border-cyan-500/40 transition-colors ${currentPlan?.id === plan.id ? "border-cyan-500/40" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold">{plan.name}</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">
                        ${((plan.priceMonthly ?? 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-white/40 text-xs">/month</p>
                    </div>
                    {currentPlan?.id === plan.id && (
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-white/50 text-xs mb-4">{plan.description}</p>
                  <ul className="space-y-1.5 mb-4">
                    {(plan.features ?? []).slice(0, 4).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={currentPlan?.id === plan.id}
                    className={`w-full ${currentPlan?.id === plan.id ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"}`}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {currentPlan?.id === plan.id ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!plans || (plans as any[]).length === 0) && (
              <div className="col-span-3 p-8 text-center text-white/40">
                <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No plans available yet.</p>
                <p className="text-xs mt-1">Plans will appear here once configured in Stripe.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
