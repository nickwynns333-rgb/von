/**
 * Admin VON WORK Panel — Build Spec Document 3 of 4
 * POW review queue, tier matrix editor, config settings
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Shield, Settings, CheckCircle2, XCircle, AlertTriangle, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
  AUTO_REVIEW: "bg-purple-100 text-purple-700 border-purple-200",
  MANUAL_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  VERIFIED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  MORE_INFO_REQUIRED: "bg-orange-100 text-orange-700 border-orange-200",
  HISTORICAL: "bg-gray-100 text-gray-600 border-gray-200",
};

const TIERS = ["PIONEER", "FOUNDER", "VANGUARD", "LEGACY"] as const;
const DEFAULT_FEATURES = ["ai_agents", "voice_agents", "chat_agents", "storage_gb", "api_rate_per_min", "knowledge_bases", "seats", "fsm_jobs", "crm_contacts", "analytics", "white_label", "priority_support"];

export default function AdminVonWork() {
  const [activeTab, setActiveTab] = useState("pow");
  const [powFilter, setPowFilter] = useState("SUBMITTED");
  const [selectedPow, setSelectedPow] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ decision: "VERIFIED" as any, rationale: "", memberMessage: "" });

  const { data: powList, refetch: refetchPow } = trpc.vonwork.adminListPow.useQuery({ status: powFilter || undefined, limit: 50, offset: 0 });
  const { data: tierMatrix, refetch: refetchTier } = trpc.vonwork.getTierMatrix.useQuery();
  const { data: config, refetch: refetchConfig } = trpc.vonwork.getConfig.useQuery();

  const reviewPow = trpc.vonwork.adminReviewPow.useMutation({
    onSuccess: () => { toast.success("Review submitted!"); setSelectedPow(null); refetchPow(); },
    onError: (e) => toast.error(e.message),
  });

  const updateTier = trpc.vonwork.updateTierMatrix.useMutation({
    onSuccess: () => { toast.success("Tier matrix updated!"); refetchTier(); },
    onError: (e) => toast.error(e.message),
  });

  const updateConfig = trpc.vonwork.updateConfig.useMutation({
    onSuccess: () => { toast.success("Config updated!"); refetchConfig(); },
    onError: (e) => toast.error(e.message),
  });

  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});

  const getTierValue = (tier: string, feature: string) => {
    const row = tierMatrix?.find((r: any) => r.tier === tier && r.feature === feature);
    return row ? { enabled: !!row.enabled, quota: row.quota, quotaUnit: row.quotaUnit } : { enabled: false, quota: null, quotaUnit: null };
  };

  return (
    <PageShell
      title="Admin — VON WORK"
      subtitle="Proof of Work review queue, tier matrix, and platform configuration"
      icon={<Shield className="w-5 h-5" />}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="pow" className="rounded-lg text-sm">POW Review Queue</TabsTrigger>
          <TabsTrigger value="tier" className="rounded-lg text-sm">Tier Matrix</TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg text-sm">Platform Config</TabsTrigger>
        </TabsList>

        {/* ── POW Review Queue ── */}
        <TabsContent value="pow">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1A6FFF]" /> Proof of Work Submissions
                </CardTitle>
                <Select value={powFilter} onValueChange={setPowFilter}>
                  <SelectTrigger className="w-48 border-gray-200 text-sm h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    {["SUBMITTED", "AUTO_REVIEW", "MANUAL_REVIEW", "VERIFIED", "REJECTED", "MORE_INFO_REQUIRED"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!powList || powList.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No submissions found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {powList.map((pow: any) => (
                    <div key={pow.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-700">{pow.powRef}</span>
                          <Badge className={`text-xs border ${STATUS_COLORS[pow.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>{pow.status}</Badge>
                          <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">{pow.tier}</Badge>
                        </div>
                        <div className="text-sm text-gray-700 mt-0.5">{pow.name ?? pow.email} · <span className="text-gray-500">{pow.category?.replace("_", " ")}</span></div>
                        <div className="text-xs text-gray-400">{pow.businessName} · {new Date(pow.submittedAt).toLocaleDateString()}</div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs border-gray-200 flex-shrink-0" onClick={() => { setSelectedPow(pow); setReviewForm({ decision: "VERIFIED", rationale: "", memberMessage: "" }); }}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tier Matrix ── */}
        <TabsContent value="tier">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1A6FFF]" /> Tier × Feature Matrix
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Admin-editable entitlements. Changes apply immediately — no code deploy required.</p>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-semibold text-xs uppercase tracking-wide">Feature</th>
                    {TIERS.map((tier) => (
                      <th key={tier} className="text-center py-2 px-3 text-gray-700 font-semibold text-xs">{tier}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_FEATURES.map((feature) => (
                    <tr key={feature} className="border-b border-gray-50 hover:bg-gray-50/30">
                      <td className="py-2 pr-4 text-gray-700 font-medium text-xs">{feature.replace(/_/g, " ")}</td>
                      {TIERS.map((tier) => {
                        const val = getTierValue(tier, feature);
                        return (
                          <td key={tier} className="py-2 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => updateTier.mutate({ tier, feature, enabled: !val.enabled, quota: val.quota ?? undefined, quotaUnit: val.quotaUnit ?? undefined })}
                                className={`w-8 h-4 rounded-full transition-colors ${val.enabled ? "bg-[#1A6FFF]" : "bg-gray-200"}`}
                              >
                                <div className={`w-3 h-3 rounded-full bg-white shadow mx-0.5 transition-transform ${val.enabled ? "translate-x-4" : "translate-x-0"}`} />
                              </button>
                              {val.enabled && (
                                <input
                                  type="number"
                                  defaultValue={val.quota ?? ""}
                                  placeholder="∞"
                                  className="w-14 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
                                  onBlur={(e) => updateTier.mutate({ tier, feature, enabled: true, quota: e.target.value ? parseInt(e.target.value) : undefined })}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Platform Config ── */}
        <TabsContent value="config">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#1A6FFF]" /> Platform Configuration
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">All settings are admin-editable without a code deploy. Changes take effect immediately.</p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {config?.map((row: any) => (
                <div key={row.key} className="flex items-start gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-bold text-gray-800">{row.key}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input
                      defaultValue={row.value}
                      className="w-48 text-xs border-gray-200 h-8"
                      onChange={(e) => setEditingConfig((prev) => ({ ...prev, [row.key]: e.target.value }))}
                    />
                    <Button size="sm" className="text-xs bg-[#1A6FFF] hover:bg-[#0052CC] text-white h-8 px-2"
                      onClick={() => { const val = editingConfig[row.key] ?? row.value; updateConfig.mutate({ key: row.key, value: val }); }}>
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* POW Review Dialog */}
      <Dialog open={!!selectedPow} onOpenChange={() => setSelectedPow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-700">{selectedPow?.powRef}</span>
              <Badge className={`text-xs border ${STATUS_COLORS[selectedPow?.status] ?? ""}`}>{selectedPow?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedPow && (
            <div className="space-y-4">
              {/* Submission details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Member:</span> <span className="font-medium">{selectedPow.name ?? selectedPow.email}</span></div>
                <div><span className="text-gray-500">HFN ID:</span> <span className="font-mono">{selectedPow.hfnMemberId}</span></div>
                <div><span className="text-gray-500">JF Tier:</span> <Badge className="text-xs">{selectedPow.tier}</Badge></div>
                <div><span className="text-gray-500">Category:</span> <span>{selectedPow.category?.replace("_", " ")}</span></div>
                <div><span className="text-gray-500">Business:</span> <span>{selectedPow.businessName ?? "—"}</span></div>
                <div><span className="text-gray-500">Role:</span> <span>{selectedPow.role ?? "—"}</span></div>
                <div><span className="text-gray-500">Submitted:</span> <span>{new Date(selectedPow.submittedAt).toLocaleString()}</span></div>
              </div>

              {selectedPow.contributionDescription && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Contribution Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPow.contributionDescription}</p>
                </div>
              )}

              {selectedPow.objectives && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Objectives</p>
                  <p className="text-sm text-gray-700">{selectedPow.objectives}</p>
                </div>
              )}

              {/* Review form */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="font-semibold text-sm text-gray-900">Submit Review Decision</p>
                <div>
                  <Label className="text-xs font-semibold text-gray-600">Decision *</Label>
                  <Select value={reviewForm.decision} onValueChange={(v) => setReviewForm((f) => ({ ...f, decision: v as any }))}>
                    <SelectTrigger className="mt-1 border-gray-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERIFIED">✓ VERIFIED</SelectItem>
                      <SelectItem value="REJECTED">✗ REJECTED</SelectItem>
                      <SelectItem value="MORE_INFO_REQUIRED">○ MORE INFO REQUIRED</SelectItem>
                      <SelectItem value="ESCALATED">↑ ESCALATED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-600">Rationale * (internal, required)</Label>
                  <Textarea value={reviewForm.rationale} onChange={(e) => setReviewForm((f) => ({ ...f, rationale: e.target.value }))} placeholder="Mandatory written rationale for this decision..." rows={3} className="mt-1 border-gray-200 resize-none text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-600">Message to Member (shown to member)</Label>
                  <Textarea value={reviewForm.memberMessage} onChange={(e) => setReviewForm((f) => ({ ...f, memberMessage: e.target.value }))} placeholder="Optional message visible to the member..." rows={2} className="mt-1 border-gray-200 resize-none text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-gray-200" onClick={() => setSelectedPow(null)}>Cancel</Button>
                  <Button
                    className="flex-1 bg-[#1A6FFF] hover:bg-[#0052CC] text-white"
                    disabled={!reviewForm.rationale.trim() || reviewPow.isPending}
                    onClick={() => reviewPow.mutate({ powRef: selectedPow.powRef, decision: reviewForm.decision, rationale: reviewForm.rationale, memberMessage: reviewForm.memberMessage || undefined })}
                  >
                    {reviewPow.isPending ? "Submitting..." : "Submit Decision"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
