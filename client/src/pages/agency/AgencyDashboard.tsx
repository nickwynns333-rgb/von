import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agencyNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import {
  Users,
  Palette,
  Zap,
  Globe,
  Building2,
  Plus,
  Activity,
} from "lucide-react";
import { useState } from "react";

export default function AgencyDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "agency" && user?.role !== "admin") navigate("/dashboard");
  }, [loading, isAuthenticated, user]);

  if (loading || !isAuthenticated || (user?.role !== "agency" && user?.role !== "admin")) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <DashboardShell navItems={agencyNavItems} title="Agency Overview" role="agency">
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[#0f0f1a] border-white/5">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50">Active Clients</p>
                  <p className="text-2xl font-bold text-white mt-1">—</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10"><Users className="w-5 h-5 text-purple-400" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0f0f1a] border-white/5">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50">Credits Allocated</p>
                  <p className="text-2xl font-bold text-white mt-1">—</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10"><Zap className="w-5 h-5 text-cyan-400" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0f0f1a] border-white/5">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50">Total Usage</p>
                  <p className="text-2xl font-bold text-white mt-1">—</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10"><Activity className="w-5 h-5 text-green-400" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClientsPanel />
          <WhiteLabelPanel />
        </div>
      </div>
    </DashboardShell>
  );
}

// ─── Clients Panel ────────────────────────────────────────────────────────────

function ClientsPanel() {
  const clientsQuery = trpc.agency.clients.useQuery();
  const allocateMutation = trpc.credits.agencyAllocate.useMutation({
    onSuccess: () => { toast.success("Credits allocated"); clientsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="bg-[#0f0f1a] border-white/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" /> Client Accounts
          </CardTitle>
          <Button size="sm" className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 gap-1">
            <Plus className="w-3 h-3" /> Add Client
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {clientsQuery.isLoading ? (
          <div className="text-white/40 text-sm">Loading clients...</div>
        ) : (clientsQuery.data ?? []).length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No clients yet</p>
            <p className="text-white/20 text-xs mt-1">Add your first client to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(clientsQuery.data ?? []).map(({ client, allocation }) => (
              <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {client.name?.charAt(0)?.toUpperCase() ?? "C"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{client.name ?? "Client"}</div>
                  <div className="text-xs text-white/40">{allocation.creditsAllocated.toLocaleString()} credits allocated</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  onClick={() => allocateMutation.mutate({ clientUserId: client.id, amount: 500 })}
                >
                  +500
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── White Label Panel ────────────────────────────────────────────────────────

function WhiteLabelPanel() {
  const settingsQuery = trpc.agency.whiteLabelSettings.useQuery();
  const updateMutation = trpc.agency.updateWhiteLabel.useMutation({
    onSuccess: () => { toast.success("White label settings saved"); settingsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    brandName: "",
    primaryColor: "#6366f1",
    accentColor: "#22d3ee",
    customDomain: "",
    hideVonworkBranding: false,
  });

  const handleSave = () => {
    updateMutation.mutate({
      brandName: form.brandName || undefined,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      customDomain: form.customDomain || undefined,
      hideVonworkBranding: form.hideVonworkBranding,
    });
  };

  return (
    <Card className="bg-[#0f0f1a] border-white/5">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-400" /> White Label Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70 text-sm">Brand Name</Label>
          <Input
            placeholder="Your Company Name"
            value={form.brandName}
            onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">Accent Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
              />
              <Input
                value={form.accentColor}
                onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white/70 text-sm flex items-center gap-2">
            <Globe className="w-3 h-3" /> Custom Domain
          </Label>
          <Input
            placeholder="app.yourcompany.com"
            value={form.customDomain}
            onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/3">
          <input
            type="checkbox"
            id="hidebranding"
            checked={form.hideVonworkBranding}
            onChange={(e) => setForm((f) => ({ ...f, hideVonworkBranding: e.target.checked }))}
            className="w-4 h-4 accent-purple-500"
          />
          <Label htmlFor="hidebranding" className="text-white/70 text-sm cursor-pointer">
            Hide VonWork branding from client-facing pages
          </Label>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
        >
          {updateMutation.isPending ? "Saving..." : "Save White Label Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
