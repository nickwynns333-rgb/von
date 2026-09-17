import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell, agencyNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Coins, Send } from "lucide-react";

export default function AgencyCredits() {
  const { data: balance } = trpc.credits.balance.useQuery();
  const { data: clients } = trpc.agency.clients.useQuery();
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState("");

  const allocate = trpc.credits.agencyAllocate.useMutation({
    onSuccess: () => { toast.success("Credits allocated!"); setTargetUserId(""); setAmount(""); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardShell navItems={agencyNavItems} title="Agency — Credits" role="agency">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Coins className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Credit Management</h1>
            <p className="text-white/50 text-sm">Allocate credits to your clients</p>
          </div>
        </div>

        {/* Balance */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/20">
          <CardContent className="p-6">
            <p className="text-white/50 text-sm">Your Agency Credit Balance</p>
            <p className="text-4xl font-bold text-cyan-400 mt-1">
              {((balance as any)?.balance ?? 0).toLocaleString()}
            </p>
            <p className="text-white/30 text-xs mt-1">credits available to allocate</p>
          </CardContent>
        </Card>

        {/* Allocate */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-violet-400" />
              Allocate Credits to Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Client (User ID)</Label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
              >
                <option value="">Select a client...</option>
                {(clients ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.email ?? `User #${c.id}`}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Credits to Allocate</Label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button
              onClick={() => allocate.mutate({ clientUserId: parseInt(targetUserId), amount: parseInt(amount) })}
              disabled={!targetUserId || !amount || allocate.isPending}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              <Send className="w-4 h-4 mr-2" />
              {allocate.isPending ? "Allocating..." : "Allocate Credits"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
