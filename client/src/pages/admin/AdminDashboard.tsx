import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import {
  Users,
  CreditCard,
  Zap,
  TrendingUp,
  Bot,
  DollarSign,
  Activity,
  Shield,
} from "lucide-react";

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card className="bg-[#0f0f1a] border-white/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/50">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "admin") navigate("/dashboard");
  }, [loading, isAuthenticated, user]);

  if (loading || !isAuthenticated || user?.role !== "admin") return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <DashboardShell navItems={adminNavItems} title="Admin Overview" role="admin">
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value="—" sub="All time" icon={<Users className="w-5 h-5 text-cyan-400" />} color="bg-cyan-500/10" />
          <StatCard title="Active Subs" value="—" sub="Monthly recurring" icon={<CreditCard className="w-5 h-5 text-violet-400" />} color="bg-violet-500/10" />
          <StatCard title="Credits Sold" value="—" sub="This month" icon={<Zap className="w-5 h-5 text-amber-400" />} color="bg-amber-500/10" />
          <StatCard title="MRR" value="—" sub="Monthly revenue" icon={<DollarSign className="w-5 h-5 text-green-400" />} color="bg-green-500/10" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminUsersPanel />
          <AdminCreditPricingPanel />
          <AdminModelsPanel />
        </div>
      </div>
    </DashboardShell>
  );
}

// ─── Users Panel ──────────────────────────────────────────────────────────────

function AdminUsersPanel() {
  const usersQuery = trpc.admin.users.useQuery({ limit: 10, offset: 0 });
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); usersQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const grantCreditsMutation = trpc.credits.adminGrant.useMutation({
    onSuccess: () => toast.success("Credits granted"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="bg-[#0f0f1a] border-white/5 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> Recent Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {usersQuery.isLoading ? (
          <div className="text-white/40 text-sm">Loading...</div>
        ) : (
          <div className="space-y-2">
            {(usersQuery.data ?? []).slice(0, 8).map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{u.name ?? "Unnamed"}</div>
                  <div className="text-xs text-white/40 truncate">{u.email ?? u.openId}</div>
                </div>
                <Badge className={`text-xs border-0 ${
                  u.role === "admin" ? "bg-red-500/20 text-red-400" :
                  u.role === "agency" ? "bg-purple-500/20 text-purple-400" :
                  "bg-white/10 text-white/50"
                }`}>
                  {u.role}
                </Badge>
                <Select
                  value={u.role}
                  onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role: role as "user" | "admin" | "agency" })}
                >
                  <SelectTrigger className="w-24 h-7 text-xs bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    <SelectItem value="user" className="text-white/70">User</SelectItem>
                    <SelectItem value="agency" className="text-purple-400">Agency</SelectItem>
                    <SelectItem value="admin" className="text-red-400">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  onClick={() => grantCreditsMutation.mutate({ userId: u.id, amount: 1000, description: "Admin bonus" })}
                >
                  +1k
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Credit Pricing Panel ─────────────────────────────────────────────────────

function AdminCreditPricingPanel() {
  const pricingQuery = trpc.admin.creditPricing.useQuery();
  const updateMutation = trpc.admin.updateCreditPricing.useMutation({
    onSuccess: () => { toast.success("Pricing updated"); pricingQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="bg-[#0f0f1a] border-white/5">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Credit Pricing
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pricingQuery.isLoading ? (
          <div className="text-white/40 text-sm">Loading...</div>
        ) : (
          <div className="space-y-2">
            {(pricingQuery.data ?? []).map((p) => (
              <div key={p.featureType} className="flex items-center justify-between p-2 rounded-lg bg-white/3 hover:bg-white/5">
                <div>
                  <div className="text-xs font-medium text-white capitalize">{p.featureType.replace(/_/g, " ")}</div>
                  <div className="text-xs text-white/40">{p.creditsPerUnit} credit/{p.unitLabel}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={p.creditsPerUnit}
                    className="w-16 h-7 text-xs bg-white/5 border-white/10 text-white text-center"
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val !== p.creditsPerUnit) {
                        updateMutation.mutate({ featureType: p.featureType, creditsPerUnit: val, unitLabel: p.unitLabel });
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Models Panel ─────────────────────────────────────────────────────────────

function AdminModelsPanel() {
  const modelsQuery = trpc.admin.openRouterModels.useQuery();

  return (
    <Card className="bg-[#0f0f1a] border-white/5 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-400" /> Available OpenRouter Models
        </CardTitle>
      </CardHeader>
      <CardContent>
        {modelsQuery.isLoading ? (
          <div className="text-white/40 text-sm">Loading models from OpenRouter...</div>
        ) : modelsQuery.data?.length === 0 ? (
          <div className="text-white/40 text-sm">Add OPENROUTER_API_KEY to see available models.</div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {(modelsQuery.data ?? []).slice(0, 20).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 text-xs">
                <div className="text-white/70 truncate flex-1 mr-2">{m.id}</div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.isFree ? (
                    <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">FREE</Badge>
                  ) : (
                    <span className="text-white/40">${m.inputPricePerM.toFixed(3)}/M</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
