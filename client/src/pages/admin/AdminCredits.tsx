import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Coins, Gift, Save, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminCredits() {
  const pricingQuery = trpc.admin.creditPricing.useQuery();
  const pricing = (pricingQuery.data ?? []) as Array<{
    featureType: string; creditsPerUnit: number; unitLabel: string;
    defaultModel: string | null; isActive: boolean;
  }>;

  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState("");

  const updatePricing = trpc.admin.updateCreditPricing.useMutation({
    onSuccess: () => { toast.success("Pricing updated"); pricingQuery.refetch(); setEditingRow(null); },
    onError: (e) => toast.error(e.message),
  });

  const grantCredits = trpc.credits.adminGrant.useMutation({
    onSuccess: () => { toast.success("Credits granted!"); setGrantUserId(""); setGrantAmount(""); },
    onError: (e) => toast.error(e.message),
  });

  const packsQuery = trpc.credits.packs.useQuery();

  return (
    <DashboardShell navItems={adminNavItems} title="Admin — Credits" role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Credits & Pricing</h1>
            <p className="text-white/50 text-sm">Manage credit packs, feature pricing, and manual grants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Credit Packs */}
          <Card className="bg-[#0f0f1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-400" />
                Credit Packs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(packsQuery.data ?? []).map((pack: any) => (
                <div key={pack.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">{pack.name}</p>
                    <p className="text-xs text-white/40">{pack.credits?.toLocaleString() ?? "—"} credits</p>
                  </div>
                  <p className="text-cyan-400 font-bold">${((pack.priceUsd ?? 0) / 100).toFixed(2)}</p>
                </div>
              ))}
              {packsQuery.isLoading && <p className="text-white/40 text-sm">Loading packs...</p>}
              {!packsQuery.isLoading && packsQuery.data?.length === 0 && (
                <p className="text-white/40 text-sm">No packs configured yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Manual Grant */}
          <Card className="bg-[#0f0f1a] border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-violet-400" />
                Grant Credits to User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70">User ID</Label>
                <Input
                  placeholder="Enter numeric user ID"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Credits to Grant</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1000"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button
                onClick={() => grantCredits.mutate({ userId: parseInt(grantUserId), amount: parseInt(grantAmount) })}
                disabled={!grantUserId || !grantAmount || grantCredits.isPending}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white"
              >
                <Gift className="w-4 h-4 mr-2" />
                {grantCredits.isPending ? "Granting..." : "Grant Credits"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Pricing Table */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              Feature Credit Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pricing.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">No pricing rules configured.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {pricing.map((row) => (
                  <div key={row.featureType} className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{row.featureType}</p>
                      <p className="text-xs text-white/40">{row.unitLabel}</p>
                    </div>
                    {editingRow === row.featureType ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editCredits}
                          onChange={(e) => setEditCredits(e.target.value)}
                          className="w-24 h-7 text-xs bg-white/5 border-white/10 text-white"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-cyan-500 hover:bg-cyan-400 text-black"
                          onClick={() => updatePricing.mutate({
                            featureType: row.featureType,
                            creditsPerUnit: parseFloat(editCredits),
                            unitLabel: row.unitLabel,
                            isActive: row.isActive,
                          })}
                          disabled={updatePricing.isPending}
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-white/50" onClick={() => setEditingRow(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          {row.creditsPerUnit} credits/{row.unitLabel}
                        </Badge>
                        <Badge className={row.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/40 border-white/10"}>
                          {row.isActive ? "active" : "inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-white/50 hover:text-white"
                          onClick={() => { setEditingRow(row.featureType); setEditCredits(row.creditsPerUnit.toString()); }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
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
