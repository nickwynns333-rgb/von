import { ArrowRight, Building2, CheckCircle2, DollarSign, Flag, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateEligibleCommission, getClaimStatus, getPerformanceMilestone } from "@shared/vonworkProgress";

type ProductionSource = {
  contacted?: number;
  interested?: number;
  inSalesProcess?: number;
  purchased?: number;
  qualifyingCompanies?: number;
  monthlyRecurringRevenue?: number;
  baseCommission?: number;
  claimScore?: number;
  evidenceComplete?: boolean;
  membershipLevel?: string;
  joinForceLevel?: string;
};

type DashboardProps = {
  gateStatus?: unknown;
  onStartMission: () => void;
};

function readProduction(gateStatus: unknown): ProductionSource {
  const status = gateStatus as { production?: ProductionSource; progression?: ProductionSource } | null | undefined;
  return status?.production ?? status?.progression ?? {};
}

function readProgramContext(gateStatus: unknown) {
  const status = gateStatus as { gates?: { hfnMembership?: { pass?: boolean }; jfLevel?: { level?: string | null } } } | null | undefined;
  return {
    membership: status?.gates?.hfnMembership?.pass ? "Active" : "Pending verification",
    joinForce: status?.gates?.jfLevel?.level ?? "Not connected",
  };
}

function MetricCard({ icon, label, value, detail, accent }: { icon: React.ReactNode; label: string; value: string; detail: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</span>
        <span className="text-2xl font-extrabold tracking-tight text-gray-900">{value}</span>
      </div>
      <p className="mt-4 text-sm font-bold text-gray-900">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{detail}</p>
    </div>
  );
}

export default function VonWorkProductionDashboard({ gateStatus, onStartMission }: DashboardProps) {
  const production = readProduction(gateStatus);
  const contacted = Math.max(0, production.contacted ?? 0);
  const interested = Math.max(0, production.interested ?? 0);
  const inSalesProcess = Math.max(0, production.inSalesProcess ?? 0);
  const purchased = Math.max(0, production.purchased ?? 0);
  const qualifyingCompanies = Math.max(0, production.qualifyingCompanies ?? 0);
  const mrr = Math.max(0, production.monthlyRecurringRevenue ?? 0);
  const baseCommission = Math.min(30, Math.max(0, production.baseCommission ?? 0));
  const claimScore = Math.min(1000, Math.max(0, production.claimScore ?? 0));
  const evidenceComplete = Boolean(production.evidenceComplete);
  const programContext = readProgramContext(gateStatus);
  const milestone = getPerformanceMilestone(qualifyingCompanies);
  const eligibleCommission = calculateEligibleCommission(baseCommission, qualifyingCompanies);
  const claimStatus = getClaimStatus(claimScore, evidenceComplete);
  const companyProgress = milestone.nextTarget ? Math.min(100, Math.round((qualifyingCompanies / milestone.nextTarget) * 100)) : 100;
  const firstCustomerComplete = purchased > 0;
  const tenCompanyComplete = qualifyingCompanies >= 10;

  return (
    <section className="mb-8 space-y-5" aria-labelledby="business-building-title">
      <div className="overflow-hidden rounded-3xl border border-[#CFE0FF] bg-gradient-to-br from-[#F4F8FF] via-white to-[#EEFBFA] shadow-sm">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-[#B9D1FF] bg-[#EAF2FF] text-[#1454B8]">VON WORK PRODUCTION</Badge>
              <Badge variant="outline" className="border-gray-200 bg-white text-gray-600">Customer-first pathway</Badge>
            </div>
            <h2 id="business-building-title" className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">You earned your way to Von Work. Now build.</h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-gray-600">Sell valuable AI services to real businesses. This dashboard tracks verified production activity—not recruiting—and keeps commission eligibility clearly separate from any income guarantee.</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm lg:min-w-[220px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-500">Eligible commission</p>
            <p className="mt-1 text-3xl font-extrabold text-[#1454B8]">{eligibleCommission}%</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{baseCommission}% base + {milestone.performanceRate}% verified performance potential</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-600 shadow-sm"><span>Human First membership: <strong className="text-gray-900">{production.membershipLevel ?? programContext.membership}</strong></span><span>Join Force: <strong className="text-gray-900">{production.joinForceLevel ?? programContext.joinForce}</strong></span><span>Production reporting: <strong className="text-[#1454B8]">Verified records only</strong></span></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Building2 className="h-4 w-4 text-[#1454B8]" />} label="Companies contacted" value={contacted.toLocaleString()} detail="Tracked outreach activity" accent="bg-[#EAF2FF]" />
        <MetricCard icon={<Users className="h-4 w-4 text-[#0E766E]" />} label="Interested" value={interested.toLocaleString()} detail="Businesses showing interest" accent="bg-[#E6F8F5]" />
        <MetricCard icon={<TrendingUp className="h-4 w-4 text-[#9A6500]" />} label="In sales process" value={inSalesProcess.toLocaleString()} detail="Active, customer-led opportunities" accent="bg-[#FFF6DB]" />
        <MetricCard icon={<DollarSign className="h-4 w-4 text-[#147A45]" />} label="Qualifying companies" value={qualifyingCompanies.toLocaleString()} detail={`Target for first unlock: ${Math.max(0, QUALIFYING_COMPANY_TARGET - qualifyingCompanies)} more`} accent="bg-[#EAF8EF]" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-extrabold text-gray-900"><Target className="h-4 w-4 text-[#1A6FFF]" /> First Customer Mission</CardTitle>
                <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">Real customers → real services → real commissions.</p>
              </div>
              <Badge className={firstCustomerComplete ? "border-green-200 bg-green-50 text-green-700" : "border-[#B9D1FF] bg-[#EAF2FF] text-[#1454B8]"}>{firstCustomerComplete ? "Complete" : "Active"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${firstCustomerComplete ? "bg-green-100" : "bg-white border border-gray-200"}`}>{firstCustomerComplete ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Flag className="h-4 w-4 text-[#1A6FFF]" />}</span>
              <div className="flex-1"><p className="text-sm font-bold text-gray-900">Get your first customer</p><p className="text-xs text-gray-500">{firstCustomerComplete ? "A verified purchased company is recorded." : "Start with a business that needs a clear AI outcome."}</p></div>
              <span className="text-sm font-extrabold text-gray-700">{purchased}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tenCompanyComplete ? "bg-green-100" : "bg-white border border-gray-200"}`}>{tenCompanyComplete ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <span className="text-xs font-extrabold text-[#1A6FFF]">10</span>}</span>
              <div className="flex-1"><p className="text-sm font-bold text-gray-900">Get 10 qualifying companies</p><p className="text-xs text-gray-500">Recruiting and non-paying referrals do not count.</p></div>
              <span className="text-sm font-extrabold text-gray-700">{qualifyingCompanies}/10</span>
            </div>
            <Button onClick={onStartMission} className="w-full bg-[#1A6FFF] font-bold text-white hover:bg-[#0F5BD8]">{firstCustomerComplete ? "Find the next customer" : "Start the mission"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold text-gray-900"><Sparkles className="h-4 w-4 text-[#0E766E]" /> Claim Score</CardTitle>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">Built through documentation, verification, education, and legitimate contribution.</p>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex items-end justify-between gap-4"><div><p className="text-4xl font-extrabold tracking-tight text-gray-950">{claimScore}<span className="text-base font-bold text-gray-400"> / 1000</span></p><p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Status: <span className="text-[#1454B8]">{claimStatus}</span></p></div><Badge variant="outline" className="border-gray-200 text-gray-600">Evidence {evidenceComplete ? "complete" : "in progress"}</Badge></div>
            <Progress value={claimScore / 10} className="mt-5 h-2 bg-gray-100" />
            <p className="mt-3 text-xs leading-relaxed text-gray-500">Claim Score is not a dollar amount, legal determination, guaranteed recovery, or guarantee of Trust acceptance.</p>
            {claimStatus === "REVIEW READY" || claimStatus === "TRUST CONSIDERATION" ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold leading-relaxed text-green-800">Your file has satisfied the current program requirements for potential Recovery Review. Formal Trust decisions happen later.</div> : <div className="mt-4 rounded-xl border border-[#D9E8FF] bg-[#F5F9FF] p-3 text-xs font-semibold leading-relaxed text-[#24518E]">Next step: keep building your case and your verified business contribution.</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-extrabold text-gray-900">Next performance milestone</p><p className="mt-1 text-xs font-medium text-gray-500">{milestone.label}{milestone.nextTarget ? ` · ${Math.max(0, milestone.nextTarget - qualifyingCompanies)} qualifying companies to go` : " · highest configured level"}</p></div><span className="text-lg font-extrabold text-[#1454B8]">+{milestone.performanceRate}%</span></div><Progress value={companyProgress} className="mt-3 h-2 bg-gray-100" /></div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs font-medium leading-relaxed text-gray-600 lg:max-w-[300px]">MRR tracked: <strong className="text-gray-900">${mrr.toLocaleString()}</strong>. Eligible amounts depend on qualifying customer sales, refunds, cancellations, fees, and applicable program rules.</div>
        </CardContent>
      </Card>
    </section>
  );
}

const QUALIFYING_COMPANY_TARGET = 10;
