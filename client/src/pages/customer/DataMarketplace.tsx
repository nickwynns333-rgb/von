import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { customerNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import {
  Database, Search, MapPin, Building2, Phone, Mail, BarChart3,
  Play, Pause, CheckCircle, Clock, Zap, ShoppingCart, Eye, ChevronRight, Target
} from "lucide-react";
import { toast } from "sonner";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const INDUSTRIES = [
  { id: "dentists", label: "Dentist Offices", icon: "🦷" },
  { id: "doctors", label: "Medical Practices", icon: "🏥" },
  { id: "lawyers", label: "Law Firms", icon: "⚖️" },
  { id: "chiropractors", label: "Chiropractors", icon: "🦴" },
  { id: "realtors", label: "Real Estate Agents", icon: "🏠" },
  { id: "restaurants", label: "Restaurants", icon: "🍽️" },
  { id: "gyms", label: "Gyms & Fitness", icon: "💪" },
  { id: "salons", label: "Salons & Spas", icon: "💅" },
  { id: "contractors", label: "Home Services", icon: "🔧" },
  { id: "insurance", label: "Insurance Agents", icon: "🛡️" },
];

type Tab = "browse" | "purchased" | "campaigns";

export default function DataMarketplace() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [industryFilter, setIndustryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignPkgId, setCampaignPkgId] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignDetailOpen, setCampaignDetailOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const packagesQuery = trpc.dataMarketplace.listPackages.useQuery(
    { industry: industryFilter || undefined, state: stateFilter || undefined, search: search || undefined },
    { enabled: !!isAuthenticated }
  );

  const purchasesQuery = trpc.dataMarketplace.myPurchases.useQuery(undefined, {
    enabled: !!isAuthenticated && activeTab === "purchased",
  });

  const campaignsQuery = trpc.dataMarketplace.myCampaigns.useQuery(undefined, {
    enabled: !!isAuthenticated && activeTab === "campaigns",
  });

  const creditsQuery = trpc.credits.balance.useQuery(undefined, { enabled: !!isAuthenticated });

  const purchaseMutation = trpc.dataMarketplace.purchasePackage.useMutation({
    onSuccess: () => {
      toast.success("Package purchased! You can now launch campaigns.");
      setPurchaseOpen(false);
      packagesQuery.refetch();
      creditsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const createCampaignMutation = trpc.dataMarketplace.createCampaign.useMutation({
    onSuccess: (data) => {
      toast.success("Campaign created! Ready to launch.");
      setCampaignOpen(false);
      campaignsQuery.refetch();
      setActiveTab("campaigns");
    },
    onError: (e) => toast.error(e.message),
  });

  const launchMutation = trpc.dataMarketplace.launchCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign launched! ${data.leadsSeeded} leads queued for AI calling.`);
      campaignsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const pauseMutation = trpc.dataMarketplace.updateCampaignStatus.useMutation({
    onSuccess: () => {
      toast.success("Campaign paused");
      campaignsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const packages = (packagesQuery.data ?? []) as any[];
  const purchases = (purchasesQuery.data ?? []) as any[];
  const campaigns = (campaignsQuery.data ?? []) as any[];
  const creditBalance = (creditsQuery.data as any)?.balance ?? 0;

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    queued: "bg-yellow-100 text-yellow-700",
    running: "bg-blue-100 text-blue-700",
    paused: "bg-orange-100 text-orange-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <DashboardShell navItems={customerNavItems} title="Data Marketplace" role="customer">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" /> Data Marketplace
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Buy targeted business data, launch AI outbound campaigns, and close prospects automatically
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">{creditBalance.toLocaleString()} credits</span>
          </div>
        </div>

        {/* How it works banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
          <h2 className="font-bold text-base mb-3">How the AI Campaign Engine Works</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { step: "1", icon: "🛒", title: "Buy Data", desc: "Purchase targeted business lists by industry & state" },
              { step: "2", icon: "🤖", title: "AI Calls", desc: "AI calls each business, asks for decision-maker email" },
              { step: "3", icon: "🔗", title: "Demo Link", desc: "AI drops your personalized demo link during the call" },
              { step: "4", icon: "💰", title: "Auto-Close", desc: "Demo presents & closes — schedules meetings or converts" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-2">
                <div className="text-2xl flex-shrink-0">{s.icon}</div>
                <div>
                  <div className="text-xs font-bold opacity-75">Step {s.step}</div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs opacity-80 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-0">
            {(["browse", "purchased", "campaigns"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "browse" ? "Browse Packages" : tab === "purchased" ? "My Purchases" : "My Campaigns"}
                {tab === "campaigns" && campaigns.length > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">{campaigns.length}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Browse tab ── */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search packages..."
                  className="pl-9 border-gray-300"
                />
              </div>
              <Select value={industryFilter || "all"} onValueChange={(v) => setIndustryFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44 border-gray-300">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.icon} {i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stateFilter || "all"} onValueChange={(v) => setStateFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36 border-gray-300">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Industry quick-filter pills */}
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setIndustryFilter(industryFilter === ind.id ? "" : ind.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    industryFilter === ind.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {ind.icon} {ind.label}
                </button>
              ))}
            </div>

            {/* Package grid */}
            {packagesQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No packages available yet</p>
                <p className="text-xs text-gray-400 mt-1">Check back soon — the admin is uploading new data packages</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg: any) => {
                  const industry = INDUSTRIES.find((i) => i.id === pkg.industry);
                  return (
                    <Card key={pkg.id} className={`border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer ${pkg.alreadyPurchased ? "ring-2 ring-green-300" : ""}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{industry?.icon ?? "📋"}</div>
                          {pkg.alreadyPurchased && (
                            <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                              <CheckCircle className="w-3 h-3" /> Purchased
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{pkg.name}</h3>
                        {pkg.description && (
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{pkg.description}</p>
                        )}
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="capitalize">{industry?.label ?? pkg.industry}</span>
                          </div>
                          {pkg.state && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{pkg.city ? `${pkg.city}, ` : ""}{pkg.state}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{pkg.recordCount.toLocaleString()} businesses</span>
                          </div>
                        </div>

                        {/* Sample data preview */}
                        {pkg.sampleData?.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-2 mb-3 text-xs text-gray-500">
                            <div className="font-medium text-gray-700 mb-1">Sample records:</div>
                            {pkg.sampleData.slice(0, 2).map((row: any, i: number) => (
                              <div key={i} className="truncate">{Object.values(row).slice(0, 2).join(" · ")}</div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-gray-900">{pkg.priceCredits.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">credits</div>
                          </div>
                          {pkg.alreadyPurchased ? (
                            <Button
                              size="sm"
                              onClick={() => { setCampaignPkgId(pkg.id); setCampaignName(`${pkg.name} Campaign`); setCampaignOpen(true); }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                            >
                              <Play className="w-3 h-3" /> Launch Campaign
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => { setSelectedPkg(pkg); setPurchaseOpen(true); }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                            >
                              <ShoppingCart className="w-3 h-3" /> Purchase
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Purchased tab ── */}
        {activeTab === "purchased" && (
          <div className="space-y-3">
            {purchasesQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No purchases yet</p>
                <Button onClick={() => setActiveTab("browse")} size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Browse Packages
                </Button>
              </div>
            ) : (
              purchases.map((row: any) => {
                const industry = INDUSTRIES.find((i) => i.id === row.pkg.industry);
                return (
                  <div key={row.purchase.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors bg-white">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{industry?.icon ?? "📋"}</div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{row.pkg.name}</div>
                        <div className="text-xs text-gray-500">
                          {row.pkg.recordCount.toLocaleString()} records · Purchased {new Date(row.purchase.purchasedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-gray-500">Paid</div>
                        <div className="text-sm font-semibold text-gray-900">{row.purchase.creditsSpent.toLocaleString()} cr</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => { setCampaignPkgId(row.pkg.id); setCampaignName(`${row.pkg.name} Campaign`); setCampaignOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                      >
                        <Play className="w-3 h-3" /> New Campaign
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Campaigns tab ── */}
        {activeTab === "campaigns" && (
          <div className="space-y-3">
            {campaignsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No campaigns yet</p>
                <p className="text-xs text-gray-400 mt-1">Purchase a data package and launch your first AI campaign</p>
                <Button onClick={() => setActiveTab("browse")} size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Browse Data Packages
                </Button>
              </div>
            ) : (
              campaigns.map((row: any) => {
                const c = row.campaign;
                const answerRate = c.callsCompleted > 0 ? Math.round((c.callsAnswered / c.callsCompleted) * 100) : 0;
                const convRate = c.callsAnswered > 0 ? Math.round((c.meetingsBooked / c.callsAnswered) * 100) : 0;
                return (
                  <Card key={c.id} className="border-gray-200 hover:border-blue-300 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{c.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{row.pkg.name} · {c.callsTotal.toLocaleString()} total leads</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${statusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {c.status}
                          </Badge>
                          {c.status === "queued" || c.status === "running" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseMutation.mutate({ campaignId: c.id, status: "paused" })}
                              className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50 gap-1"
                            >
                              <Pause className="w-3 h-3" /> Pause
                            </Button>
                          ) : c.status === "paused" ? (
                            <Button
                              size="sm"
                              onClick={() => pauseMutation.mutate({ campaignId: c.id, status: "queued" })}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            >
                              <Play className="w-3 h-3" /> Resume
                            </Button>
                          ) : c.status === "draft" ? (
                            <Button
                              size="sm"
                              onClick={() => launchMutation.mutate({ campaignId: c.id })}
                              disabled={launchMutation.isPending}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                            >
                              <Play className="w-3 h-3" /> {launchMutation.isPending ? "Launching..." : "Launch"}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: "Calls Made", value: c.callsCompleted, icon: <Phone className="w-3.5 h-3.5" /> },
                          { label: "Answered", value: c.callsAnswered, icon: <CheckCircle className="w-3.5 h-3.5" /> },
                          { label: "Emails Got", value: c.emailsCollected, icon: <Mail className="w-3.5 h-3.5" /> },
                          { label: "Links Sent", value: c.linksDropped, icon: <Zap className="w-3.5 h-3.5" /> },
                          { label: "Meetings", value: c.meetingsBooked, icon: <BarChart3 className="w-3.5 h-3.5" /> },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                              {stat.icon}
                              <span className="text-xs">{stat.label}</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Demo link */}
                      {c.demoLinkSlug && (
                        <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-blue-700 font-medium">AI Demo Link: </span>
                            <span className="text-xs text-blue-600 font-mono truncate">/demo/{c.demoLinkSlug}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/demo/${c.demoLinkSlug}`);
                              toast.success("Demo link copied!");
                            }}
                            className="text-xs text-blue-600 hover:bg-blue-100 h-7 px-2"
                          >
                            Copy
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ── Purchase dialog ── */}
        <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Purchase Data Package</DialogTitle>
            </DialogHeader>
            {selectedPkg && (
              <div className="space-y-4 pt-2">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-semibold text-gray-900">{selectedPkg.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{selectedPkg.recordCount.toLocaleString()} business records</div>
                  {selectedPkg.state && (
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {selectedPkg.city ? `${selectedPkg.city}, ` : ""}{selectedPkg.state}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                  <div>
                    <div className="text-sm text-gray-500">Package Price</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedPkg.priceCredits.toLocaleString()} credits</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Your Balance</div>
                    <div className={`text-lg font-semibold ${creditBalance >= selectedPkg.priceCredits ? "text-green-600" : "text-red-600"}`}>
                      {creditBalance.toLocaleString()} credits
                    </div>
                  </div>
                </div>
                {creditBalance < selectedPkg.priceCredits && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    Insufficient credits. You need {(selectedPkg.priceCredits - creditBalance).toLocaleString()} more credits.
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setPurchaseOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => purchaseMutation.mutate({ packageId: selectedPkg.id })}
                    disabled={purchaseMutation.isPending || creditBalance < selectedPkg.priceCredits}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {purchaseMutation.isPending ? "Purchasing..." : "Confirm Purchase"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Create campaign dialog ── */}
        <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create AI Outbound Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Campaign Name</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Texas Dentists Q3 Campaign"
                  className="border-gray-300"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                  <Zap className="w-4 h-4" /> What the AI will do on each call:
                </div>
                <ul className="text-xs text-blue-600 space-y-1 ml-6 list-disc">
                  <li>Introduce itself as VonWork AI</li>
                  <li>Explain how AI automates the front desk</li>
                  <li>Ask for the decision maker's email</li>
                  <li>Automatically drop your personalized demo link</li>
                  <li>Demo link opens an AI video presentation that closes the prospect</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                The AI call script will be auto-generated based on your data package. You can customize it after creation.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!campaignPkgId || !campaignName) return;
                    createCampaignMutation.mutate({ packageId: campaignPkgId, name: campaignName });
                  }}
                  disabled={!campaignName || !campaignPkgId || createCampaignMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
