import { trpc } from "@/lib/trpc";
import { DashboardShell, customerNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Coins, ShoppingCart, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";

export default function DashboardCredits() {
  const { data: balance } = trpc.credits.balance.useQuery();
  const { data: packs } = trpc.credits.packs.useQuery();
  const { data: txns } = trpc.credits.transactions.useQuery({ limit: 20 });

  const handleBuy = (packId: number) => {
    toast.info("Redirecting to checkout...");
    // Stripe checkout would be triggered here
  };

  return (
    <DashboardShell navItems={customerNavItems} title="Credits" role="customer">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Coins className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Credits</h1>
            <p className="text-white/50 text-sm">Buy credits and view your usage history</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/20">
          <CardContent className="p-6">
            <p className="text-white/50 text-sm">Available Balance</p>
            <p className="text-5xl font-bold text-cyan-400 mt-1">
              {((balance as any)?.balance ?? 0).toLocaleString()}
            </p>
            <p className="text-white/30 text-xs mt-1">credits</p>
          </CardContent>
        </Card>

        {/* Credit Packs */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Buy Credits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(packs ?? []).map((pack: any) => (
              <Card key={pack.id} className="bg-[#0f0f1a] border-white/10 hover:border-cyan-500/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold">{pack.name}</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">{(pack.credits ?? 0).toLocaleString()}</p>
                      <p className="text-white/40 text-xs">credits</p>
                    </div>
                    {pack.popular && (
                      <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs">Popular</Badge>
                    )}
                  </div>
                  <p className="text-white/50 text-xs mb-4">{pack.description}</p>
                  <Button
                    onClick={() => handleBuy(pack.id)}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    ${((pack.priceUsd ?? 0) / 100).toFixed(2)}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!packs || packs.length === 0) && (
              <div className="col-span-3 p-8 text-center text-white/40">
                <Coins className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No credit packs available yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-white/50" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!(txns as any)?.transactions || (txns as any).transactions.length === 0) ? (
              <div className="p-6 text-center text-white/40 text-sm">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {((txns as any).transactions ?? []).map((tx: any) => (
                  <div key={tx.id} className="flex items-center gap-4 p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.amount > 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                      {tx.amount > 0
                        ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{tx.description ?? tx.type}</p>
                      <p className="text-xs text-white/40">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <p className={`font-bold text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
