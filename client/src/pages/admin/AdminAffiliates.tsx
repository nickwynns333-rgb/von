import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Shield, BarChart3, Package, Settings, LayoutDashboard,
  CreditCard, Activity
} from "lucide-react";

const adminNavItems = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Affiliates", href: "/admin/affiliates", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Credits", href: "/admin/credits", icon: <CreditCard className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

export default function AdminAffiliates() {
  const [selectedPlanType, setSelectedPlanType] = useState("percentage");
  const [newPlan, setNewPlan] = useState({ name: "", rate: "", fixedAmount: "", creditReward: "", isRecurring: false });
  const [newAsset, setNewAsset] = useState({ name: "", type: "banner" as const, url: "", description: "" });

  const { data: partners, refetch: refetchPartners } = trpc.affiliate.adminListPartners.useQuery();
  const { data: payouts, refetch: refetchPayouts } = trpc.affiliate.adminListPayouts.useQuery();
  const { data: fraudFlags, refetch: refetchFraud } = trpc.affiliate.adminFraudFlags.useQuery();
  const { data: commissionPlans, refetch: refetchPlans } = trpc.affiliate.adminListCommissionPlans.useQuery();

  const updateStatusMutation = trpc.affiliate.adminUpdatePartnerStatus.useMutation({
    onSuccess: () => { toast.success("Partner status updated"); refetchPartners(); },
    onError: (e) => toast.error(e.message),
  });

  const processPayoutMutation = trpc.affiliate.adminProcessPayout.useMutation({
    onSuccess: () => { toast.success("Payout processed"); refetchPayouts(); },
    onError: (e) => toast.error(e.message),
  });

  const resolveFraudMutation = trpc.affiliate.adminResolveFraudFlag.useMutation({
    onSuccess: () => { toast.success("Fraud flag resolved"); refetchFraud(); },
    onError: (e) => toast.error(e.message),
  });

  const createPlanMutation = trpc.affiliate.adminCreateCommissionPlan.useMutation({
    onSuccess: () => { toast.success("Commission plan created"); refetchPlans(); setNewPlan({ name: "", rate: "", fixedAmount: "", creditReward: "", isRecurring: false }); },
    onError: (e) => toast.error(e.message),
  });

  const createAssetMutation = trpc.affiliate.adminCreateMarketingAsset.useMutation({
    onSuccess: () => { toast.success("Marketing asset added"); setNewAsset({ name: "", type: "banner", url: "", description: "" }); },
    onError: (e) => toast.error(e.message),
  });

  const pendingPayouts = payouts?.filter((p) => p.status === "pending") ?? [];
  const activePartners = partners?.filter((p) => p.status === "active").length ?? 0;
  const totalMrr = partners?.reduce((sum, p) => sum + parseFloat(String(p.totalMrrGenerated ?? 0)), 0) ?? 0;
  const openFraudFlags = fraudFlags?.length ?? 0;

  return (
    <DashboardShell title="Affiliate Management" navItems={adminNavItems} role="admin">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Partners", value: partners?.length ?? 0, icon: Users, color: "text-indigo-400" },
            { label: "Active Partners", value: activePartners, icon: CheckCircle, color: "text-green-400" },
            { label: "Partner MRR", value: `$${totalMrr.toFixed(0)}`, icon: DollarSign, color: "text-cyan-400" },
            { label: "Fraud Flags", value: openFraudFlags, icon: AlertTriangle, color: openFraudFlags > 0 ? "text-red-400" : "text-gray-500" },
          ].map((s) => (
            <Card key={s.label} className="bg-gray-900 border-gray-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{s.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gray-800 ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="partners">
          <TabsList className="bg-gray-900 border border-gray-800">
            {[
              { value: "partners", label: "Partners" },
              { value: "payouts", label: `Payouts ${pendingPayouts.length > 0 ? `(${pendingPayouts.length})` : ""}` },
              { value: "fraud", label: `Fraud ${openFraudFlags > 0 ? `(${openFraudFlags})` : ""}` },
              { value: "plans", label: "Commission Plans" },
              { value: "assets", label: "Marketing Assets" },
            ].map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {["Partner", "Type", "Status", "MRR", "Customers", "Earned", "Fraud", "Actions"].map((h) => (
                        <th key={h} className="text-left text-gray-500 text-xs px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(partners ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="px-4 py-3">
                          <p className="text-gray-800 text-sm font-medium">{p.userName ?? "Unknown"}</p>
                          <p className="text-gray-500 text-xs">{p.userEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs capitalize">{p.type}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={
                            p.status === "active" ? "border-green-500/30 text-green-400" :
                            p.status === "pending" ? "border-yellow-500/30 text-yellow-400" :
                            "border-red-500/30 text-red-400"
                          }>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-green-400 font-mono text-sm">
                          ${parseFloat(String(p.totalMrrGenerated ?? 0)).toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{p.totalActiveCustomers}</td>
                        <td className="px-4 py-3 text-indigo-400 font-mono text-sm">
                          ${parseFloat(String(p.totalCommissionsEarned ?? 0)).toFixed(0)}
                        </td>
                        <td className="px-4 py-3">
                          {p.isFraudFlagged && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {p.status === "pending" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-500 text-white h-7 text-xs px-2"
                                onClick={() => updateStatusMutation.mutate({ partnerId: p.id, status: "active" })}
                              >
                                Approve
                              </Button>
                            )}
                            {p.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs px-2"
                                onClick={() => updateStatusMutation.mutate({ partnerId: p.id, status: "suspended" })}
                              >
                                Suspend
                              </Button>
                            )}
                            {p.status === "suspended" && (
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-500 h-7 text-xs px-2"
                                onClick={() => updateStatusMutation.mutate({ partnerId: p.id, status: "active" })}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!partners?.length && (
                  <div className="text-center py-10 text-gray-500 text-sm">No partners registered yet.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {["Partner", "Amount", "Method", "Status", "Requested", "Actions"].map((h) => (
                        <th key={h} className="text-left text-gray-500 text-xs px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(payouts ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="px-4 py-3">
                          <p className="text-white text-sm">{p.userName ?? "Unknown"}</p>
                          <p className="text-gray-500 text-xs">{p.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-green-400 font-mono font-bold">
                          ${parseFloat(String(p.amount)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm capitalize">{p.method.replace("_", " ")}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={
                            p.status === "paid" ? "border-green-500/30 text-green-400" :
                            p.status === "pending" ? "border-yellow-500/30 text-yellow-400" :
                            "border-red-500/30 text-red-400"
                          }>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(p.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {p.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-500 h-7 text-xs px-2"
                                onClick={() => processPayoutMutation.mutate({ payoutId: p.id, status: "paid" })}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Pay
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs px-2"
                                onClick={() => processPayoutMutation.mutate({ payoutId: p.id, status: "rejected" })}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!payouts?.length && (
                  <div className="text-center py-10 text-gray-500 text-sm">No payout requests.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Flags Tab */}
          <TabsContent value="fraud">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                {!fraudFlags?.length ? (
                  <div className="text-center py-10 text-gray-500 text-sm flex flex-col items-center gap-2">
                    <Shield className="w-8 h-8 opacity-30" />
                    <p>No open fraud flags. System is clean.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {["Partner ID", "Reason", "Severity", "Details", "Flagged", "Action"].map((h) => (
                          <th key={h} className="text-left text-gray-500 text-xs px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fraudFlags.map((f) => (
                        <tr key={f.id} className="border-b border-gray-800/50">
                          <td className="px-4 py-3 text-gray-500 text-sm">#{f.partnerId}</td>
                          <td className="px-4 py-3 text-red-400 text-sm capitalize">{f.reason.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={
                              f.severity === "high" ? "border-red-500/30 text-red-400" :
                              f.severity === "medium" ? "border-yellow-500/30 text-yellow-400" :
                              "border-gray-500/30 text-gray-400"
                            }>
                              {f.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{f.details}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.flaggedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7 text-xs px-2"
                              onClick={() => resolveFraudMutation.mutate({ flagId: f.id })}
                            >
                              Resolve
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commission Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            {/* Existing Plans */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-gray-800 text-base">Active Commission Plans</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {["Name", "Type", "Rate", "Fixed", "Credits", "Recurring", "Default"].map((h) => (
                        <th key={h} className="text-left text-gray-500 text-xs px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(commissionPlans ?? []).map((plan) => (
                      <tr key={plan.id} className="border-b border-gray-800/50">
                        <td className="px-4 py-3 text-white text-sm font-medium">{plan.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm capitalize">{plan.type.replace("_", " ")}</td>
                        <td className="px-4 py-3 text-green-400 font-mono text-sm">{plan.rate ? `${plan.rate}%` : "—"}</td>
                        <td className="px-4 py-3 text-cyan-400 font-mono text-sm">{parseFloat(String(plan.fixedAmount ?? 0)) > 0 ? `$${plan.fixedAmount}` : "—"}</td>
                        <td className="px-4 py-3 text-purple-400 font-mono text-sm">{(plan.creditReward ?? 0) > 0 ? plan.creditReward?.toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{plan.isRecurring ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{plan.isDefault && <Badge className="bg-indigo-600 text-white text-xs">Default</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!commissionPlans?.length && (
                  <div className="text-center py-8 text-gray-500 text-sm">No commission plans yet.</div>
                )}
              </CardContent>
            </Card>

            {/* Create New Plan */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-gray-800 text-base">Create Commission Plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Plan Name</label>
                    <input
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                      placeholder="e.g. Standard Affiliate"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Type</label>
                    <Select value={selectedPlanType} onValueChange={setSelectedPlanType}>
                      <SelectTrigger className="bg-white border-gray-200 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {["percentage", "fixed", "percentage_bonus", "tiered", "recurring", "one_time", "credit_reward", "hybrid"].map((t) => (
                          <SelectItem key={t} value={t} className="text-gray-300 capitalize">{t.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Rate (%)</label>
                    <input
                      type="number"
                      value={newPlan.rate}
                      onChange={(e) => setNewPlan({ ...newPlan, rate: e.target.value })}
                      placeholder="e.g. 30"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Fixed Amount ($)</label>
                    <input
                      type="number"
                      value={newPlan.fixedAmount}
                      onChange={(e) => setNewPlan({ ...newPlan, fixedAmount: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Credit Reward</label>
                    <input
                      type="number"
                      value={newPlan.creditReward}
                      onChange={(e) => setNewPlan({ ...newPlan, creditReward: e.target.value })}
                      placeholder="e.g. 1000"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createPlanMutation.mutate({
                    name: newPlan.name,
                    type: selectedPlanType as any,
                    rate: newPlan.rate ? parseFloat(newPlan.rate) : undefined,
                    fixedAmount: newPlan.fixedAmount ? parseFloat(newPlan.fixedAmount) : undefined,
                    creditReward: newPlan.creditReward ? parseInt(newPlan.creditReward) : undefined,
                    isRecurring: selectedPlanType === "recurring",
                  })}
                  disabled={createPlanMutation.isPending || !newPlan.name}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketing Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-gray-800 text-base">Add Marketing Asset</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Asset Name</label>
                    <input
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      placeholder="e.g. VonWork Banner 728x90"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Type</label>
                    <Select value={newAsset.type} onValueChange={(v) => setNewAsset({ ...newAsset, type: v as any })}>
                      <SelectTrigger className="bg-white border-gray-200 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {["banner", "logo", "email_template", "social_graphic", "presentation", "video", "case_study", "sales_script", "other"].map((t) => (
                          <SelectItem key={t} value={t} className="text-gray-300 capitalize">{t.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-500 text-xs mb-1 block">Download URL</label>
                    <input
                      value={newAsset.url}
                      onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-500 text-xs mb-1 block">Description</label>
                    <input
                      value={newAsset.description}
                      onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                      placeholder="Brief description..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createAssetMutation.mutate(newAsset)}
                  disabled={createAssetMutation.isPending || !newAsset.name || !newAsset.url}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {createAssetMutation.isPending ? "Adding..." : "Add Asset"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
