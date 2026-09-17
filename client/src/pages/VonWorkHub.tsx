/**
 * VON WORK Qualification Hub — Build Spec Document 3 of 4
 *
 * Shows the member's gate status panel and guides them through:
 *   1. Gate verification (HFN + JOINFORCE)
 *   2. Proof of Work submission
 *   3. Business information
 *   4. Agreement acceptance
 *   5. Account activation
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import PageShell from "@/components/PageShell";
import VonWorkProductionDashboard from "@/components/VonWorkProductionDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Shield, FileText, Building2,
  ChevronRight, AlertTriangle, RefreshCw, Lock, Unlock,
  ExternalLink, Upload, Plus, Trash2, Info,
} from "lucide-react";

// ─── Gate Status Panel ────────────────────────────────────────────────────────

const GATE_LABELS: Record<string, { label: string; description: string; unlockHint: string }> = {
  hfnMembership: { label: "Humans First Network", description: "Active membership required", unlockHint: "Visit humansfirstnetwork.com to activate your membership" },
  jfProofOfLoyalty: { label: "JOINFORCE Proof of Loyalty", description: "Verified loyalty credential required", unlockHint: "Complete your JOINFORCE Proof of Loyalty verification" },
  jfLevel: { label: "JOINFORCE Level", description: "Qualifying tier required", unlockHint: "Advance your JOINFORCE level to meet the minimum requirement" },
  pow: { label: "Proof of Work", description: "Verified work submission required", unlockHint: "Submit your Proof of Work below and await admin verification" },
  agreement: { label: "Business Agreement", description: "VON WORK Business Agreement required", unlockHint: "Complete business registration and sign the agreement" },
};

function GateRow({ gateKey, gate, required }: { gateKey: string; gate: any; required?: string }) {
  const meta = GATE_LABELS[gateKey];
  const pass = gate?.pass ?? false;
  const status = gate?.status ?? gate?.level ?? (gate?.accepted ? "ACCEPTED" : "NOT_STARTED");

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${pass ? "border-green-100 bg-green-50/30" : "border-gray-100 bg-gray-50/30"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${pass ? "bg-green-100" : "bg-gray-100"}`}>
        {pass ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{meta?.label ?? gateKey}</span>
          {required && <span className="text-xs text-gray-500">(required: {required})</span>}
          <Badge className={`text-xs border ${pass ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {pass ? "✓ Verified" : status === "NOT_STARTED" ? "○ Not started" : `○ ${status}`}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{meta?.description}</p>
        {!pass && (
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" /> {meta?.unlockHint}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── POW Categories ───────────────────────────────────────────────────────────

const POW_CATEGORIES = [
  { value: "business_operation", label: "Business Operation" },
  { value: "project_participation", label: "Project Participation" },
  { value: "mining", label: "Mining" },
  { value: "node_validator", label: "Node / Validator Operation" },
  { value: "development", label: "Development" },
  { value: "open_source", label: "Open-Source Contribution" },
  { value: "community_building", label: "Community Building" },
  { value: "education_content", label: "Education / Content" },
  { value: "early_adoption", label: "Early Adoption" },
  { value: "referral_network", label: "Referral / Network Activity" },
  { value: "training_completion", label: "Training Completion" },
  { value: "other", label: "Other Approved Activity" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VonWorkHub() {
  const [hfnMemberId, setHfnMemberId] = useState("");
  const [activeTab, setActiveTab] = useState("status");

  // Gate status
  const { data: gateStatus, refetch: refetchStatus, isLoading: statusLoading } = trpc.vonwork.getGateStatus.useQuery();

  // Create account
  const createAccount = trpc.vonwork.getOrCreateAccount.useMutation({
    onSuccess: () => { toast.success("VW account created!"); refetchStatus(); },
    onError: (e) => toast.error(e.message),
  });

  // Check gates
  const checkGates = trpc.vonwork.checkGates.useMutation({
    onSuccess: (data) => {
      if (data.allGatesPass) toast.success("All gates verified! You may proceed to Proof of Work.");
      else toast.error(`Gate check failed: ${data.failedGates.join(", ")}`);
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  // POW submission
  const [powForm, setPowForm] = useState({
    category: "", businessName: "", role: "", objectives: "", productsServices: "",
    contributionDescription: "", dateStart: "", dateEnd: "", isOngoing: false,
    referenceUrls: [""], transactionHashes: [""], walletAddress: "", witnessContact: "",
    attestationChecked: false,
  });
  const [powErrors, setPowErrors] = useState<Record<string, string>>({});

  const submitPow = trpc.vonwork.submitPow.useMutation({
    onSuccess: (data) => {
      toast.success(`Proof of Work submitted! Reference: ${data.powRef}`);
      setActiveTab("status");
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: powList } = trpc.vonwork.listPowSubmissions.useQuery();

  // Business info
  const [bizForm, setBizForm] = useState({
    legalName: "", structure: "", jurisdiction: "", regNumber: "",
    principalAddress: "", signatoryName: "", signatoryRole: "", taxStatus: "",
  });

  const saveBusinessInfo = trpc.vonwork.saveBusinessInfo.useMutation({
    onSuccess: () => { toast.success("Business information saved!"); setActiveTab("agreement"); },
    onError: (e) => toast.error(e.message),
  });

  // Agreement
  const { data: agreement } = trpc.vonwork.getAgreement.useQuery();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const agreementRef = useRef<HTMLDivElement>(null);

  const handleAgreementScroll = () => {
    if (!agreementRef.current) return;
    const el = agreementRef.current;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolledToEnd(true);
  };

  const acceptAgreement = trpc.vonwork.acceptAgreement.useMutation({
    onSuccess: (data) => {
      toast.success(`Account activated! Your VW Account ID: ${data.accountId}`);
      setActiveTab("status");
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const validatePow = () => {
    const errors: Record<string, string> = {};
    if (!powForm.category) errors.category = "Category is required";
    if (!powForm.contributionDescription || powForm.contributionDescription.length < 10) errors.contributionDescription = "Description must be at least 10 characters";
    if (!powForm.attestationChecked) errors.attestation = "You must check the attestation";
    setPowErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPow = () => {
    if (!validatePow()) return;
    if (!hfnMemberId.trim()) { toast.error("Please enter your HFN Member ID first"); return; }
    submitPow.mutate({
      hfnMemberId,
      category: powForm.category,
      businessName: powForm.businessName || undefined,
      role: powForm.role || undefined,
      objectives: powForm.objectives || undefined,
      productsServices: powForm.productsServices || undefined,
      contributionDescription: powForm.contributionDescription,
      dateStart: powForm.dateStart || undefined,
      dateEnd: powForm.dateEnd || undefined,
      isOngoing: powForm.isOngoing,
      referenceUrls: powForm.referenceUrls.filter(Boolean),
      transactionHashes: powForm.transactionHashes.filter(Boolean),
      walletAddress: powForm.walletAddress || undefined,
      witnessContact: powForm.witnessContact || undefined,
      attestationChecked: powForm.attestationChecked,
    });
  };

  const gates = gateStatus?.gates;
  const allGatesPass = gates && Object.values(gates).every((g: any) => g.pass);

  return (
    <PageShell
      title="VON WORK Qualification"
      subtitle="Gate 3 of 4 — Proof of Work & Business Platform Access"
      icon={<Shield className="w-5 h-5" />}
    >
      {/* Customer-first production layer; qualification gates remain unchanged below. */}
      <VonWorkProductionDashboard
        gateStatus={gateStatus}
        onStartMission={() => { window.location.href = "/prospecting"; }}
      />

      {/* Account setup banner */}
      {!gateStatus && !statusLoading && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-blue-900 text-sm">Set up your VON WORK account</p>
            <p className="text-xs text-blue-700 mt-0.5">Enter your HFN Member ID to begin the qualification process.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Input value={hfnMemberId} onChange={(e) => setHfnMemberId(e.target.value)} placeholder="HFN-00000184" className="w-40 text-sm border-blue-200" />
            <Button size="sm" className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white" onClick={() => createAccount.mutate({ hfnMemberId })} disabled={createAccount.isPending || !hfnMemberId.trim()}>
              {createAccount.isPending ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="status" className="rounded-lg text-sm">Gate Status</TabsTrigger>
          <TabsTrigger value="pow" className="rounded-lg text-sm">Proof of Work</TabsTrigger>
          <TabsTrigger value="business" className="rounded-lg text-sm">Business Info</TabsTrigger>
          <TabsTrigger value="agreement" className="rounded-lg text-sm">Agreement</TabsTrigger>
        </TabsList>

        {/* ── Gate Status Tab ── */}
        <TabsContent value="status">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#1A6FFF]" /> Qualification Gates
                    </CardTitle>
                    {gateStatus && (
                      <Button size="sm" variant="outline" className="text-xs border-gray-200" onClick={() => { if (hfnMemberId) checkGates.mutate({ hfnMemberId }); else toast.error("Enter your HFN Member ID first"); }} disabled={checkGates.isPending}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${checkGates.isPending ? "animate-spin" : ""}`} /> Re-check Gates
                      </Button>
                    )}
                  </div>
                  {gateStatus?.lastChecked && (
                    <p className="text-xs text-gray-400 mt-1">Last checked: {new Date(gateStatus.lastChecked).toLocaleString()}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {statusLoading ? (
                    <div className="py-8 text-center text-gray-400 text-sm">Loading gate status...</div>
                  ) : !gateStatus ? (
                    <div className="py-8 text-center">
                      <Lock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">Create your VW account to begin</p>
                      <p className="text-xs text-gray-400 mt-1">Enter your HFN Member ID above</p>
                    </div>
                  ) : (
                    <>
                      {gates && Object.entries(gates).map(([key, gate]: [string, any]) => (
                        <GateRow key={key} gateKey={key} gate={gate} required={key === "jfLevel" ? gateStatus.qualifyingLevel : undefined} />
                      ))}
                      {allGatesPass && (
                        <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-800">All gates verified!</p>
                          <p className="text-xs text-green-700 mt-1">Your account is active. Access the platform from the sidebar.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* POW history */}
              {powList && powList.length > 0 && (
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-3 border-b border-gray-100">
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1A6FFF]" /> Proof of Work Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {powList.map((pow: any) => (
                      <div key={pow.id} className="flex items-center gap-4 p-4 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-blue-700 font-semibold">{pow.powRef}</span>
                            <Badge className={`text-xs border ${pow.status === "VERIFIED" ? "bg-green-100 text-green-700 border-green-200" : pow.status === "REJECTED" ? "bg-red-100 text-red-700 border-red-200" : pow.status === "MORE_INFO_REQUIRED" ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
                              {pow.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{pow.category.replace("_", " ")} · {new Date(pow.submittedAt).toLocaleDateString()}</p>
                        </div>
                        {pow.validUntil && (
                          <span className="text-xs text-gray-400">Valid until {new Date(pow.validUntil).toLocaleDateString()}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: VW Account info */}
            <div>
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-sm text-gray-900">Your VW Account</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {gateStatus?.vwAccount ? (
                    <>
                      <div>
                        <p className="text-xs text-gray-500">Account ID</p>
                        <p className="font-mono text-sm font-bold text-gray-900">{gateStatus.vwAccount.vwAccountId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <Badge className={`text-xs border mt-1 ${gateStatus.vwAccount.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-200" : gateStatus.vwAccount.status === "SUSPENDED_UPSTREAM" ? "bg-red-100 text-red-700 border-red-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                          {gateStatus.vwAccount.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tier</p>
                        <Badge className="text-xs border mt-1 bg-blue-100 text-blue-700 border-blue-200">{gateStatus.vwAccount.tier}</Badge>
                      </div>
                      {gateStatus.vwAccount.status === "SUSPENDED_UPSTREAM" && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                          <p className="text-xs font-semibold text-red-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Account Suspended</p>
                          <p className="text-xs text-red-600 mt-1">{gateStatus.vwAccount.suspendedReason}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">HFN Member ID</p>
                        <div className="flex gap-2">
                          <Input value={hfnMemberId} onChange={(e) => setHfnMemberId(e.target.value)} placeholder="HFN-00000184" className="text-xs border-gray-200 h-8" />
                          <Button size="sm" className="text-xs bg-[#1A6FFF] hover:bg-[#0052CC] text-white h-8 px-2" onClick={() => checkGates.mutate({ hfnMemberId })} disabled={checkGates.isPending || !hfnMemberId.trim()}>
                            Check
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No account yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Important notice */}
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Important</p>
                <p className="text-xs text-amber-700">Your Humans First Network membership does not create a business relationship with VON WORK. Platform access requires a separate, affirmative business agreement.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Proof of Work Tab ── */}
        <TabsContent value="pow">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1A6FFF]" /> Submit Proof of Work
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Document what you are actively building or contributing. Every submission receives a unique reference number (POW-XXXXXXXX).</p>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* HFN Member ID */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">HFN Member ID *</Label>
                <Input value={hfnMemberId} onChange={(e) => setHfnMemberId(e.target.value)} placeholder="HFN-00000184" className="mt-1 border-gray-200" />
                <p className="text-xs text-gray-400 mt-1">Required for gate verification before submission.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Category *</Label>
                  <Select value={powForm.category} onValueChange={(v) => setPowForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className={`mt-1 border-gray-200 ${powErrors.category ? "border-red-400" : ""}`}>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {POW_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {powErrors.category && <p className="text-xs text-red-500 mt-1">{powErrors.category}</p>}
                </div>

                {/* Business/Project Name */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Business / Project Name</Label>
                  <Input value={powForm.businessName} onChange={(e) => setPowForm((f) => ({ ...f, businessName: e.target.value }))} placeholder="Acme Corp / Project Alpha" className="mt-1 border-gray-200" />
                </div>

                {/* Role */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Your Role</Label>
                  <Input value={powForm.role} onChange={(e) => setPowForm((f) => ({ ...f, role: e.target.value }))} placeholder="Founder / Developer / Validator" className="mt-1 border-gray-200" />
                </div>

                {/* Date range */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-700">Start Date</Label>
                    <Input type="date" value={powForm.dateStart} onChange={(e) => setPowForm((f) => ({ ...f, dateStart: e.target.value }))} className="mt-1 border-gray-200" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-700">End Date</Label>
                    <Input type="date" value={powForm.dateEnd} onChange={(e) => setPowForm((f) => ({ ...f, dateEnd: e.target.value }))} disabled={powForm.isOngoing} className="mt-1 border-gray-200" />
                  </div>
                </div>
              </div>

              {/* Ongoing toggle */}
              <div className="flex items-center gap-2">
                <button onClick={() => setPowForm((f) => ({ ...f, isOngoing: !f.isOngoing }))} className={`relative w-10 h-5 rounded-full transition-colors ${powForm.isOngoing ? "bg-[#1A6FFF]" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${powForm.isOngoing ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-gray-700">This work is ongoing</span>
              </div>

              {/* Business objectives */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Business Objectives / Description of Work</Label>
                <Textarea value={powForm.objectives} onChange={(e) => setPowForm((f) => ({ ...f, objectives: e.target.value }))} placeholder="Describe the business objectives or project goals..." rows={3} className="mt-1 border-gray-200 resize-none" />
              </div>

              {/* Products/Services */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Products or Services</Label>
                <Input value={powForm.productsServices} onChange={(e) => setPowForm((f) => ({ ...f, productsServices: e.target.value }))} placeholder="AI SaaS platform, consulting services, mining hardware..." className="mt-1 border-gray-200" />
              </div>

              {/* Contribution description */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Description of Contribution *</Label>
                <Textarea value={powForm.contributionDescription} onChange={(e) => setPowForm((f) => ({ ...f, contributionDescription: e.target.value }))} placeholder="Describe specifically what you have built, contributed, or are actively doing..." rows={4} className={`mt-1 border-gray-200 resize-none ${powErrors.contributionDescription ? "border-red-400" : ""}`} />
                {powErrors.contributionDescription && <p className="text-xs text-red-500 mt-1">{powErrors.contributionDescription}</p>}
              </div>

              {/* Reference URLs */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Reference URLs</Label>
                <p className="text-xs text-gray-400 mb-2">GitHub, package registry, website, publication, chain explorer, etc.</p>
                {powForm.referenceUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input value={url} onChange={(e) => { const urls = [...powForm.referenceUrls]; urls[i] = e.target.value; setPowForm((f) => ({ ...f, referenceUrls: urls })); }} placeholder="https://github.com/..." className="border-gray-200 text-sm" />
                    <button onClick={() => setPowForm((f) => ({ ...f, referenceUrls: f.referenceUrls.filter((_, j) => j !== i) }))} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="text-xs border-gray-200" onClick={() => setPowForm((f) => ({ ...f, referenceUrls: [...f.referenceUrls, ""] }))}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add URL
                </Button>
              </div>

              {/* Wallet address (evidence only) */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Wallet Address <span className="font-normal text-gray-400">(optional, evidence only)</span></Label>
                <Input value={powForm.walletAddress} onChange={(e) => setPowForm((f) => ({ ...f, walletAddress: e.target.value }))} placeholder="0x... or bc1..." className="mt-1 border-gray-200" />
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> VON WORK does not verify wallet control. This address is for evidence purposes only.</p>
              </div>

              {/* Witness contact */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Witness / Reference Contact <span className="font-normal text-gray-400">(optional)</span></Label>
                <Input value={powForm.witnessContact} onChange={(e) => setPowForm((f) => ({ ...f, witnessContact: e.target.value }))} placeholder="Name, email, or profile URL" className="mt-1 border-gray-200" />
              </div>

              {/* Attestation */}
              <div className={`p-4 rounded-xl border ${powErrors.attestation ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setPowForm((f) => ({ ...f, attestationChecked: !f.attestationChecked }))}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${powForm.attestationChecked ? "bg-[#1A6FFF] border-[#1A6FFF]" : "border-gray-300 bg-white"}`}
                  >
                    {powForm.attestationChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <p className="text-sm text-gray-700">I affirm that this submission is true and complete. I understand that false submissions are grounds for immediate account termination.</p>
                </div>
                {powErrors.attestation && <p className="text-xs text-red-500 mt-2">{powErrors.attestation}</p>}
              </div>

              <Button className="w-full bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-semibold" onClick={handleSubmitPow} disabled={submitPow.isPending}>
                {submitPow.isPending ? "Submitting..." : "Submit Proof of Work"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Business Info Tab ── */}
        <TabsContent value="business">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1A6FFF]" /> Business Information
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Provide your legal business details. This information is required before executing the VON WORK Business Agreement.</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Legal Entity Name *</Label>
                  <Input value={bizForm.legalName} onChange={(e) => setBizForm((f) => ({ ...f, legalName: e.target.value }))} placeholder="Acme Corporation LLC" className="mt-1 border-gray-200" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Business Structure</Label>
                  <Select value={bizForm.structure} onValueChange={(v) => setBizForm((f) => ({ ...f, structure: v }))}>
                    <SelectTrigger className="mt-1 border-gray-200"><SelectValue placeholder="Select structure..." /></SelectTrigger>
                    <SelectContent>
                      {["LLC", "Corporation", "S-Corporation", "Partnership", "Sole Proprietor", "Non-Profit", "Other"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Jurisdiction of Formation</Label>
                  <Input value={bizForm.jurisdiction} onChange={(e) => setBizForm((f) => ({ ...f, jurisdiction: e.target.value }))} placeholder="Delaware, USA" className="mt-1 border-gray-200" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Registration Number</Label>
                  <Input value={bizForm.regNumber} onChange={(e) => setBizForm((f) => ({ ...f, regNumber: e.target.value }))} placeholder="EIN / Company Number" className="mt-1 border-gray-200" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Tax Status</Label>
                  <Input value={bizForm.taxStatus} onChange={(e) => setBizForm((f) => ({ ...f, taxStatus: e.target.value }))} placeholder="For-profit / Tax-exempt 501(c)(3)" className="mt-1 border-gray-200" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Principal Address</Label>
                  <Textarea value={bizForm.principalAddress} onChange={(e) => setBizForm((f) => ({ ...f, principalAddress: e.target.value }))} placeholder="123 Main St, Suite 100, New York, NY 10001" rows={2} className="mt-1 border-gray-200 resize-none" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Authorized Signatory Name</Label>
                  <Input value={bizForm.signatoryName} onChange={(e) => setBizForm((f) => ({ ...f, signatoryName: e.target.value }))} placeholder="Jane Smith" className="mt-1 border-gray-200" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Signatory Role</Label>
                  <Input value={bizForm.signatoryRole} onChange={(e) => setBizForm((f) => ({ ...f, signatoryRole: e.target.value }))} placeholder="CEO / Managing Member / President" className="mt-1 border-gray-200" />
                </div>
              </div>
              <Button className="mt-6 w-full bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-semibold" onClick={() => { if (!bizForm.legalName.trim()) { toast.error("Legal entity name is required"); return; } saveBusinessInfo.mutate(bizForm); }} disabled={saveBusinessInfo.isPending}>
                {saveBusinessInfo.isPending ? "Saving..." : "Save & Continue to Agreement"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Agreement Tab ── */}
        <TabsContent value="agreement">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1A6FFF]" /> VON WORK Business Agreement
              </CardTitle>
              {agreement && <p className="text-xs text-gray-500 mt-1">Version: {agreement.versionId} · Effective: {new Date(agreement.effectiveFrom).toLocaleDateString()}</p>}
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-sm font-semibold text-amber-800">Important Notice</p>
                <p className="text-sm text-amber-700 mt-1">Your Humans First Network membership does not create a business relationship with VON WORK. By activating, you are entering a <strong>separate agreement</strong> with VON WORK for the platform described in this agreement.</p>
              </div>

              {/* Agreement text — scroll to end required */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-gray-700">Agreement Text</Label>
                  {!scrolledToEnd && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Scroll to the end to continue</span>}
                  {scrolledToEnd && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Read complete</span>}
                </div>
                <div
                  ref={agreementRef}
                  onScroll={handleAgreementScroll}
                  className="h-64 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed"
                >
                  {agreement?.body ?? "Loading agreement..."}
                </div>
              </div>

              {/* Checkbox */}
              <div className={`p-4 rounded-xl border ${!agreementChecked ? "border-gray-200 bg-gray-50" : "border-green-200 bg-green-50"}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setAgreementChecked((v) => !v)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${agreementChecked ? "bg-[#1A6FFF] border-[#1A6FFF]" : "border-gray-300 bg-white"}`}
                  >
                    {agreementChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <p className="text-sm text-gray-700">I have read this Agreement in full, understand its terms, and am authorized to bind the Business to it.</p>
                </div>
              </div>

              {/* Typed signature */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Typed Signature *</Label>
                <Input value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} placeholder="Type your full legal name to sign" className="mt-1 border-gray-200 font-serif italic text-lg" />
                <p className="text-xs text-gray-400 mt-1">By typing your name, you are providing an electronic signature with the same legal effect as a handwritten signature.</p>
              </div>

              <Button
                className="w-full bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-semibold"
                disabled={!scrolledToEnd || !agreementChecked || !typedSignature.trim() || acceptAgreement.isPending || !agreement}
                onClick={() => {
                  if (!agreement) return;
                  acceptAgreement.mutate({ versionId: agreement.versionId, typedSignature, scrolledToEnd, checkboxChecked: agreementChecked });
                }}
              >
                {acceptAgreement.isPending ? "Activating..." : !scrolledToEnd ? "Scroll to end of agreement to continue" : !agreementChecked ? "Check the agreement checkbox to continue" : !typedSignature.trim() ? "Type your signature to continue" : "Activate VON WORK Business Account"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
