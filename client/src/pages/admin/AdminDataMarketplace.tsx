import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { customerNavItems, adminNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useRef, useState } from "react";
import { Database, Upload, Plus, Trash2, Eye, ToggleLeft, ToggleRight, BarChart3, Users, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function AdminDataMarketplace() {
  const { isAuthenticated, loading, user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgIndustry, setPkgIndustry] = useState("");
  const [pkgState, setPkgState] = useState("");
  const [pkgCity, setPkgCity] = useState("");
  const [pkgPrice, setPkgPrice] = useState("500");
  const [pkgTags, setPkgTags] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const packagesQuery = trpc.dataMarketplace.adminListPackages.useQuery(undefined, {
    enabled: !!isAuthenticated && user?.role === "admin",
  });

  const campaignsQuery = trpc.dataMarketplace.adminListCampaigns.useQuery(undefined, {
    enabled: !!isAuthenticated && campaignsOpen,
  });

  const createMutation = trpc.dataMarketplace.adminCreatePackage.useMutation({
    onSuccess: (data) => {
      toast.success(`Package created with ${data.recordCount.toLocaleString()} records`);
      setUploadOpen(false);
      packagesQuery.refetch();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.dataMarketplace.adminTogglePackage.useMutation({
    onSuccess: () => packagesQuery.refetch(),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.dataMarketplace.adminDeletePackage.useMutation({
    onSuccess: () => {
      toast.success("Package deleted");
      packagesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setPkgName(""); setPkgDesc(""); setPkgIndustry(""); setPkgState(""); setPkgCity("");
    setPkgPrice("500"); setPkgTags(""); setCsvFile(null); setCsvPreview([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").slice(0, 5);
      setCsvPreview(lines.map((l) => l.split(",")));
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvFile || !pkgName || !pkgIndustry) {
      toast.error("Please fill in all required fields and upload a CSV");
      return;
    }
    const buffer = await csvFile.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const base64 = btoa(Array.from(uint8).map(b => String.fromCharCode(b)).join(''));
    createMutation.mutate({
      name: pkgName,
      description: pkgDesc || undefined,
      industry: pkgIndustry,
      state: pkgState || undefined,
      city: pkgCity || undefined,
      priceCredits: parseInt(pkgPrice) || 500,
      tags: pkgTags || undefined,
      csvBase64: base64,
      fileName: csvFile.name,
    });
  };

  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const packages = (packagesQuery.data ?? []) as any[];
  const campaigns = (campaignsQuery.data ?? []) as any[];

  const totalRecords = packages.reduce((s: number, p: any) => s + (p.recordCount ?? 0), 0);
  const totalPurchases = packages.reduce((s: number, p: any) => s + (p.totalPurchases ?? 0), 0);

  return (
    <DashboardShell navItems={adminNavItems} title="Data Marketplace Admin" role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" /> Data Marketplace
            </h1>
            <p className="text-sm text-gray-500 mt-1">Upload and manage targeted business data packages</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCampaignsOpen(true)} className="gap-2 border-gray-300">
              <BarChart3 className="w-4 h-4" /> View Campaigns
            </Button>
            <Button onClick={() => setUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Upload Data Package
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{packages.length}</div>
                <div className="text-xs text-gray-500">Total Packages</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Total Business Records</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalPurchases}</div>
                <div className="text-xs text-gray-500">Total Purchases</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CSV format guide */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">📋 Required CSV Format</h3>
          <p className="text-xs text-amber-700 mb-2">Your CSV must have these column headers (case-insensitive):</p>
          <code className="text-xs bg-amber-100 px-2 py-1 rounded font-mono text-amber-800">
            businessName, phone, address, city, state, email (optional)
          </code>
          <p className="text-xs text-amber-600 mt-2">Example: <span className="font-mono">Sunshine Dental,+15551234567,123 Main St,Austin,TX,info@sunshine.com</span></p>
        </div>

        {/* Package table */}
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">Data Packages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {packagesQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No data packages yet</p>
                <Button onClick={() => setUploadOpen(true)} size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Upload className="w-4 h-4" /> Upload First Package
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Package</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Industry</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Records</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchases</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {packages.map((pkg: any) => {
                      const industry = INDUSTRIES.find((i) => i.id === pkg.industry);
                      return (
                        <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900">{pkg.name}</div>
                            {pkg.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{pkg.description}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm">{industry?.icon ?? "📋"} {industry?.label ?? pkg.industry}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {pkg.city ? `${pkg.city}, ` : ""}{pkg.state ?? "Nationwide"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{pkg.recordCount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{pkg.priceCredits.toLocaleString()} cr</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{pkg.totalPurchases}</td>
                          <td className="px-4 py-3 text-center">
                            <Switch
                              checked={pkg.isActive}
                              onCheckedChange={(v) => toggleMutation.mutate({ id: pkg.id, isActive: v })}
                            />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete "${pkg.name}"? This cannot be undone.`)) {
                                  deleteMutation.mutate({ id: pkg.id });
                                }
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Upload dialog ── */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Data Package</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Package Name <span className="text-red-500">*</span></Label>
                  <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="Texas Dentist Offices 2025" className="border-gray-300" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="Verified dentist offices in Texas with phone numbers..." className="border-gray-300 h-20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Industry <span className="text-red-500">*</span></Label>
                  <Select value={pkgIndustry} onValueChange={setPkgIndustry}>
                    <SelectTrigger className="border-gray-300"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i.id} value={i.id}>{i.icon} {i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">State</Label>
                  <Select value={pkgState || "all"} onValueChange={(v) => setPkgState(v === "all" ? "" : v)}>
                    <SelectTrigger className="border-gray-300"><SelectValue placeholder="All States" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Nationwide</SelectItem>
                      {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">City (optional)</Label>
                  <Input value={pkgCity} onChange={(e) => setPkgCity(e.target.value)} placeholder="Austin" className="border-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Price (credits)</Label>
                  <Input value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} type="number" min="1" className="border-gray-300" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Tags (comma-separated)</Label>
                  <Input value={pkgTags} onChange={(e) => setPkgTags(e.target.value)} placeholder="verified, 2025, high-intent" className="border-gray-300" />
                </div>
              </div>

              {/* CSV upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">CSV File <span className="text-red-500">*</span></Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {csvFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                      <p className="text-xs text-gray-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">Click to upload CSV file</p>
                      <p className="text-xs text-gray-400 mt-1">businessName, phone, address, city, state, email</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                </div>
              </div>

              {/* CSV preview */}
              {csvPreview.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Preview (first 5 rows)</Label>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50">
                        <tr>{csvPreview[0]?.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(1).map((row, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            {row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }}>Cancel</Button>
                <Button
                  onClick={handleUpload}
                  disabled={createMutation.isPending || !csvFile || !pkgName || !pkgIndustry}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createMutation.isPending ? "Uploading..." : "Upload Package"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Campaigns dialog ── */}
        <Dialog open={campaignsOpen} onOpenChange={setCampaignsOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>All Campaigns</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {campaignsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No campaigns yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Campaign</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Package</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Calls</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Answered</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Emails</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Meetings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {campaigns.map((row: any) => (
                        <tr key={row.campaign.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{row.campaign.name}</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">{row.pkg.name}</td>
                          <td className="px-4 py-2 text-center">
                            <Badge className="text-xs">{row.campaign.status}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right">{row.campaign.callsCompleted}</td>
                          <td className="px-4 py-2 text-right">{row.campaign.callsAnswered}</td>
                          <td className="px-4 py-2 text-right">{row.campaign.emailsCollected}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">{row.campaign.meetingsBooked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
