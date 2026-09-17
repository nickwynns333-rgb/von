/**
 * My Rebuilt Sites — Dashboard
 * Shows all sites rebuilt by the current user.
 * Includes bulk CSV URL import for batch prospecting.
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Globe, Sparkles, Plus, Upload, Eye, Mail, Zap,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Download,
  Wand2, BarChart3, TrendingUp
} from "lucide-react";
import PageShell from "@/components/PageShell";

type Site = {
  id: number;
  businessName: string;
  businessType: string;
  status: string;
  planStatus: string;
  createdAt: string;
  description?: string;
};

type BulkJob = {
  url: string;
  status: "pending" | "processing" | "done" | "error";
  siteId?: number;
  businessName?: string;
  error?: string;
};

export default function MySites() {
  const [, navigate] = useLocation();
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sites = [], refetch } = trpc.websiteBuilder.listMySites.useQuery();

  const rebuildMutation = trpc.websiteBuilder.rebuildFromUrl.useMutation();

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const urls = text
        .split(/[\n,;]+/)
        .map((u) => u.trim().replace(/^["']|["']$/g, ""))
        .filter((u) => u.length > 3 && (u.startsWith("http") || u.includes(".")));
      setBulkUrls(urls.join("\n"));
      toast.success(`Loaded ${urls.length} URLs from CSV`);
    };
    reader.readAsText(file);
  };

  const runBulkRebuild = async () => {
    const urls = bulkUrls
      .split(/[\n,;]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 3);

    if (urls.length === 0) { toast.error("Please enter at least one URL"); return; }
    if (urls.length > 20) { toast.error("Maximum 20 URLs per batch"); return; }

    const jobs: BulkJob[] = urls.map((url) => ({ url, status: "pending" }));
    setBulkJobs(jobs);
    setIsBulkRunning(true);

    for (let i = 0; i < jobs.length; i++) {
      setBulkJobs((prev) => prev.map((j, idx) => idx === i ? { ...j, status: "processing" } : j));
      try {
        let url = jobs[i].url;
        if (!url.startsWith("http")) url = "https://" + url;
        const result = await rebuildMutation.mutateAsync({ url });
        setBulkJobs((prev) => prev.map((j, idx) => idx === i
          ? { ...j, status: "done", siteId: result.siteId, businessName: result.businessName }
          : j
        ));
      } catch (err: any) {
        setBulkJobs((prev) => prev.map((j, idx) => idx === i
          ? { ...j, status: "error", error: err.message }
          : j
        ));
      }
      // Small delay between requests
      if (i < jobs.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }

    setIsBulkRunning(false);
    refetch();
    toast.success(`Batch complete! ${jobs.filter((j) => j.status === "done").length} sites rebuilt.`);
  };

  const getStatusBadge = (status: string, planStatus: string) => {
    if (planStatus === "paid") return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
    if (status === "preview") return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Preview</Badge>;
    if (status === "generating") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Generating</Badge>;
    return <Badge className="bg-gray-100 text-gray-600 border-gray-200">{status}</Badge>;
  };

  const getMeta = (description?: string) => {
    try { return JSON.parse(description ?? "{}"); } catch { return {}; }
  };

  return (
    <PageShell
      title="My Rebuilt Sites"
      subtitle="Track your pipeline of AI-rebuilt websites and follow up with prospects"
      icon={<Globe className="w-5 h-5" />}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/20 gap-1.5"
            onClick={() => setShowBulk(!showBulk)}
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </Button>
          <Button
            className="bg-white text-[#1A6FFF] hover:bg-white/90 font-bold gap-1.5"
            onClick={() => navigate("/website-builder")}
          >
            <Plus className="w-4 h-4" /> Rebuild New Site
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Rebuilt", value: sites.length, Icon: Globe, color: "text-blue-600 bg-blue-50" },
            { label: "Active Sites", value: sites.filter((s: Site) => s.planStatus === "paid").length, Icon: CheckCircle2, color: "text-green-600 bg-green-50" },
            { label: "Pending Pitch", value: sites.filter((s: Site) => s.status === "preview" && s.planStatus !== "paid").length, Icon: Mail, color: "text-orange-600 bg-orange-50" },
            { label: "MRR Potential", value: `$${sites.filter((s: Site) => s.status === "preview").length * 9}/mo`, Icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Import Panel */}
        {showBulk && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-[#1A6FFF]" />
              <h3 className="font-bold text-gray-900">Bulk URL Import</h3>
              <Badge className="bg-[#1A6FFF]/10 text-[#1A6FFF] border-[#1A6FFF]/20 text-xs ml-auto">Max 20 URLs per batch</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Paste URLs (one per line)</label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder={"https://plumber-dallas.com\nhttps://hvac-houston.com\nhttps://dentist-miami.com"}
                  className="w-full h-32 text-sm border border-gray-200 rounded-lg p-3 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6FFF]/30"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Or upload a CSV file</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" /> Upload CSV
                  </Button>
                  <p className="text-xs text-gray-400 mt-1">CSV with one URL per row, or comma-separated</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-700">How bulk import works:</p>
                  <p>• AI rebuilds each site one by one</p>
                  <p>• Takes ~60 seconds per site</p>
                  <p>• Preview links generated for each</p>
                  <p>• Email pitch ready for each owner</p>
                </div>
                <Button
                  onClick={runBulkRebuild}
                  disabled={isBulkRunning || !bulkUrls.trim()}
                  className="bg-gradient-to-r from-[#1A6FFF] to-[#3B8BFF] text-white font-bold gap-2"
                >
                  {isBulkRunning ? (
                    <><Sparkles className="w-4 h-4 animate-pulse" /> Rebuilding...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Start Bulk Rebuild</>
                  )}
                </Button>
              </div>
            </div>

            {/* Bulk job progress */}
            {bulkJobs.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Batch Progress</p>
                {bulkJobs.map((job, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-5 h-5 shrink-0">
                      {job.status === "done" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {job.status === "processing" && <Sparkles className="w-5 h-5 text-[#1A6FFF] animate-pulse" />}
                      {job.status === "pending" && <Clock className="w-5 h-5 text-gray-300" />}
                      {job.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    <span className="text-sm text-gray-700 flex-1 truncate">{job.url}</span>
                    {job.businessName && <span className="text-xs text-gray-500 truncate max-w-32">{job.businessName}</span>}
                    {job.status === "done" && job.siteId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#1A6FFF] text-xs gap-1 h-7"
                        onClick={() => navigate(`/website-preview/${job.siteId}`)}
                      >
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    )}
                    {job.status === "error" && <span className="text-xs text-red-500 truncate max-w-32">{job.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sites grid */}
        {sites.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1A6FFF]/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-[#1A6FFF]" />
            </div>
            <h3 className="font-extrabold text-gray-900 text-xl mb-2">No sites rebuilt yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Paste any business website URL to rebuild it with AI in 60 seconds — then email the owner the preview as a pitch.</p>
            <Button
              className="bg-gradient-to-r from-[#1A6FFF] to-[#3B8BFF] text-white font-bold gap-2"
              onClick={() => navigate("/website-builder")}
            >
              <Sparkles className="w-4 h-4" /> Rebuild Your First Site
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(sites as Site[]).map((site) => {
              const meta = getMeta(site.description);
              return (
                <div key={site.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1A6FFF]/30 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A6FFF]/10 to-[#5BA3FF]/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-[#1A6FFF]" />
                    </div>
                    {getStatusBadge(site.status, site.planStatus)}
                  </div>

                  <h3 className="font-extrabold text-gray-900 mb-0.5 truncate">{site.businessName}</h3>
                  {meta.originalUrl && (
                    <p className="text-xs text-gray-400 truncate mb-3">{meta.originalUrl}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Clock className="w-3 h-3" />
                    {new Date(site.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold text-xs gap-1"
                      onClick={() => navigate(`/website-preview/${site.id}`)}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </Button>
                    {site.planStatus !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200 text-gray-700 text-xs gap-1"
                        onClick={() => navigate(`/website-preview/${site.id}`)}
                      >
                        <Zap className="w-3 h-3" /> Activate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new card */}
            <button
              onClick={() => navigate("/website-builder")}
              className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-[#1A6FFF]/40 hover:bg-[#1A6FFF]/5 transition-all flex flex-col items-center justify-center gap-3 text-center min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-bold text-gray-600 text-sm">Rebuild Another Site</p>
                <p className="text-xs text-gray-400">Paste a URL to generate</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
