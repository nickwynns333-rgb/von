import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, DollarSign, TrendingUp, MousePointer, Copy, QrCode,
  Download, Trophy, Clock, CheckCircle, Banknote, Zap, Star,
  ChevronUp, ExternalLink, Package, LayoutDashboard, Link, BarChart3
} from "lucide-react";

const affiliateNavItems = [
  { label: "Overview", href: "/affiliate", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Commissions", href: "/affiliate#commissions", icon: <DollarSign className="w-4 h-4" /> },
  { label: "Payouts", href: "/affiliate#payouts", icon: <Banknote className="w-4 h-4" /> },
  { label: "Leaderboard", href: "/affiliate#leaderboard", icon: <Trophy className="w-4 h-4" /> },
  { label: "Marketing", href: "/affiliate#marketing", icon: <Package className="w-4 h-4" /> },
];

// ─── Partner Level Badge ──────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  bronze: "bg-amber-700 text-amber-100",
  silver: "bg-slate-400 text-slate-900",
  gold: "bg-yellow-500 text-yellow-900",
  platinum: "bg-cyan-400 text-cyan-900",
  diamond: "bg-purple-500 text-white",
};

function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${LEVEL_COLORS[level] ?? "bg-gray-600 text-white"}`}>
      {level}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color = "text-indigo-400" }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color?: string;
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-gray-800 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AffiliateDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [payoutMethod, setPayoutMethod] = useState<string>("manual");
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const { data: partner, refetch: refetchPartner } = trpc.affiliate.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats } = trpc.affiliate.stats.useQuery(undefined, { enabled: isAuthenticated && !!partner });
  const { data: commissions } = trpc.affiliate.commissions.useQuery({ limit: 20, offset: 0 }, { enabled: isAuthenticated && !!partner });
  const { data: payouts } = trpc.affiliate.payouts.useQuery(undefined, { enabled: isAuthenticated && !!partner });
  const { data: assets } = trpc.affiliate.marketingAssets.useQuery(undefined, { enabled: isAuthenticated });
  const { data: leaderboard } = trpc.affiliate.leaderboard.useQuery(undefined, { enabled: isAuthenticated });

  const registerMutation = trpc.affiliate.register.useMutation({
    onSuccess: () => {
      toast.success("Partner application submitted! You'll be approved shortly.");
      refetchPartner();
    },
    onError: (e) => toast.error(e.message),
  });

  const payoutMutation = trpc.affiliate.requestPayout.useMutation({
    onSuccess: () => {
      toast.success("Payout request submitted!");
      setPayoutAmount("");
    },
    onError: (e) => toast.error(e.message),
  });

  const referralUrl = partner ? `${window.location.origin}/?ref=${partner.referralCode}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not yet a partner — show registration
  if (!partner) {
    return (
      <DashboardShell title="Partner Program" navItems={affiliateNavItems} role="customer">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Join the VonWork Partner Program</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Earn recurring commissions by referring customers to VonWork. Start at Bronze (20%) and advance to Diamond (40%+) as you grow.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { level: "Bronze", rate: "20%", req: "0 subscribers" },
              { level: "Gold", rate: "30%", req: "20 subscribers" },
              { level: "Diamond", rate: "40%+", req: "150 subscribers" },
            ].map((l) => (
              <div key={l.level} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <LevelBadge level={l.level.toLowerCase()} />
                <p className="text-2xl font-bold text-white mt-3">{l.rate}</p>
                <p className="text-gray-500 text-xs mt-1">{l.req}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => registerMutation.mutate({ type: "affiliate" })}
              disabled={registerMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
            >
              {registerMutation.isPending ? "Applying..." : "Join as Affiliate"}
            </Button>
            <Button
              variant="outline"
              onClick={() => registerMutation.mutate({ type: "reseller" })}
              disabled={registerMutation.isPending}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Join as Reseller
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Partner Dashboard" navItems={affiliateNavItems} role="customer">
      <div className="space-y-6">
        {/* Header: Status + Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LevelBadge level="bronze" />
            <Badge
              variant={partner.status === "active" ? "default" : "secondary"}
              className={partner.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
            >
              {partner.status}
            </Badge>
            <span className="text-gray-500 text-sm capitalize">{partner.type}</span>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">Next level: Silver</p>
            <p className="text-gray-500 text-xs">Need 5 subscribers & $1,000 MRR</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Clicks" value={stats?.totalClicks ?? 0} icon={MousePointer} color="text-blue-400" />
          <StatCard title="Signups" value={stats?.totalSignups ?? 0} icon={Users} color="text-green-400" />
          <StatCard title="Active Customers" value={stats?.totalActiveCustomers ?? 0} icon={CheckCircle} color="text-emerald-400" />
          <StatCard title="MRR Generated" value={`$${parseFloat(String(stats?.totalMrrGenerated ?? 0)).toFixed(0)}`} icon={TrendingUp} color="text-indigo-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Pending" value={`$${(stats?.pendingCommissions ?? 0).toFixed(2)}`} icon={Clock} color="text-yellow-400" />
          <StatCard title="Approved" value={`$${(stats?.approvedCommissions ?? 0).toFixed(2)}`} icon={CheckCircle} color="text-green-400" />
          <StatCard title="Paid Out" value={`$${(stats?.paidCommissions ?? 0).toFixed(2)}`} icon={Banknote} color="text-cyan-400" />
          <StatCard title="Credit Earnings" value={`${(stats?.creditEarnings ?? 0).toLocaleString()} cr`} icon={Zap} color="text-purple-400" />
        </div>

        {/* Referral Link */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-indigo-400" />
              Your Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 text-sm font-mono truncate">
                {referralUrl}
              </div>
              <Button onClick={copyLink} className="bg-indigo-600 hover:bg-indigo-500 shrink-0">
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="flex gap-2 text-sm text-gray-500">
              <span>Referral Code:</span>
              <code className="text-indigo-400 font-mono">{partner.referralCode}</code>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Commissions / Payouts / Leaderboard / Marketing */}
        <Tabs defaultValue="commissions">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="commissions" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
              Commissions
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
              Payouts
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="marketing" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
              Marketing
            </TabsTrigger>
          </TabsList>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                {!commissions?.length ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No commissions yet. Share your referral link to start earning!</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-500 text-xs px-4 py-3 font-medium">Date</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 font-medium">Type</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Amount</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Credits</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-sm capitalize">{c.type.replace("_", " ")}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-mono text-sm">
                            ${parseFloat(String(c.amount)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-purple-400 font-mono text-sm">
                            {c.creditAmount > 0 ? `+${c.creditAmount.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              variant="outline"
                              className={
                                c.status === "paid" ? "border-green-500/30 text-green-400" :
                                c.status === "approved" ? "border-blue-500/30 text-blue-400" :
                                c.status === "pending" ? "border-yellow-500/30 text-yellow-400" :
                                "border-red-500/30 text-red-400"
                              }
                            >
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-800 text-base">Request Payout</CardTitle>
                <CardDescription className="text-gray-500">
                  Available: ${(stats?.approvedCommissions ?? 0).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 text-sm mb-2 block">Amount ($)</label>
                    <input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="Minimum $10"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm mb-2 block">Payout Method</label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger className="bg-white border-gray-200 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {["stripe_connect", "paypal", "wise", "ach", "bitcoin", "usdt", "manual"].map((m) => (
                          <SelectItem key={m} value={m} className="text-gray-300 capitalize">
                            {m.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => payoutMutation.mutate({
                    amount: parseFloat(payoutAmount),
                    method: payoutMethod as any,
                  })}
                  disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) < 10}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {payoutMutation.isPending ? "Submitting..." : "Request Payout"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-gray-800 text-base">Payout History</CardTitle></CardHeader>
              <CardContent className="p-0">
                {!payouts?.length ? (
                  <div className="text-center py-8 text-gray-500 text-sm">No payout requests yet.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-500 text-xs px-4 py-3 font-medium">Date</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 font-medium">Method</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Amount</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id} className="border-b border-gray-800/50">
                          <td className="px-4 py-3 text-gray-500 text-sm">{new Date(p.requestedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-300 text-sm capitalize">{p.method.replace("_", " ")}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">${parseFloat(String(p.amount)).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant="outline" className={p.status === "paid" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}>
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-800 text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Top Affiliates This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!leaderboard?.length ? (
                  <div className="text-center py-8 text-gray-500 text-sm">Leaderboard will populate as partners generate revenue.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-500 text-xs px-4 py-3 font-medium">Rank</th>
                        <th className="text-left text-gray-500 text-xs px-4 py-3 font-medium">Partner</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">MRR</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Customers</th>
                        <th className="text-right text-gray-500 text-xs px-4 py-3 font-medium">Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => (
                        <tr key={entry.rank} className="border-b border-gray-800/50">
                          <td className="px-4 py-3 text-center">
                            {entry.rank <= 3 ? (
                              <span className={`text-lg ${entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-gray-400" : "text-amber-600"}`}>
                                {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">#{entry.rank}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{entry.name}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-mono text-sm">${entry.mrr.toFixed(0)}</td>
                          <td className="px-4 py-3 text-right text-gray-500 text-sm">{entry.customers}</td>
                          <td className="px-4 py-3 text-right text-indigo-400 font-mono text-sm">${entry.earned.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketing Assets Tab */}
          <TabsContent value="marketing">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {!assets?.length ? (
                <div className="col-span-3 text-center py-12 text-gray-500">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Marketing assets will appear here once uploaded by the admin.</p>
                </div>
              ) : (
                assets.map((asset) => (
                  <Card key={asset.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs capitalize">
                          {asset.type.replace("_", " ")}
                        </Badge>
                        <span className="text-gray-600 text-xs">{asset.downloadCount} downloads</span>
                      </div>
                      <h3 className="text-gray-800 font-medium text-sm mb-1">{asset.name}</h3>
                      {asset.description && (
                        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{asset.description}</p>
                      )}
                      {asset.url && (
                        <a href={asset.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full">
                            <Download className="w-3 h-3 mr-2" />
                            Download
                          </Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
