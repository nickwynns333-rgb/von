import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Package, Layers } from "lucide-react";

export default function AdminSubscriptions() {
  const { data: plans } = trpc.admin.plans.useQuery();

  return (
    <DashboardShell navItems={adminNavItems} title="Admin — Subscriptions" role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Subscriptions & Plans</h1>
            <p className="text-white/50 text-sm">Manage subscription tiers and plan features</p>
          </div>
        </div>

        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              Available Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!plans || (plans as any[]).length === 0) ? (
              <div className="p-8 text-center text-white/40">
                <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No plans configured yet.</p>
                <p className="text-xs mt-1">Plans are managed via Stripe Dashboard → Products.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {(plans as any[]).map((plan: any) => (
                  <div key={plan.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{plan.name}</p>
                      <p className="text-xs text-white/40">{plan.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-cyan-400 font-bold">${((plan.priceMonthly ?? 0) / 100).toFixed(2)}/mo</p>
                      <Badge className={plan.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/40 border-white/10"}>
                        {plan.isActive ? "active" : "inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f1a] border-white/10">
          <CardContent className="p-6">
            <p className="text-white/50 text-sm">
              Subscription plans are managed through your{" "}
              <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                Stripe Dashboard → Products
              </a>
              . Once you claim your Stripe sandbox and go live, all active subscriptions will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
