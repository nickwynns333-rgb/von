import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Users,
  Building2,
  ExternalLink,
} from "lucide-react";

export default function AdminWhiteLabel() {
  const { user, loading } = useAuth();
  const { data: allDomains = [], refetch: refetchDomains } = trpc.whiteLabel.adminListDomains.useQuery();
  const updateDomainStatus = trpc.whiteLabel.adminUpdateDomainStatus.useMutation({
    onSuccess: () => {
      toast.success("Domain status updated successfully");
      refetchDomains();
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: allUsers = [] } = trpc.admin.users.useQuery({ limit: 200, offset: 0 });

  useEffect(() => {
    if (!loading && !user) window.location.href = getLoginUrl();
    if (!loading && user && user.role !== "admin") window.location.href = "/dashboard";
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const agencyUsers = allUsers.filter((u) => u.role === "agency");
  const pendingDomains = allDomains.filter((d) => d.domain.status === "pending" || d.domain.status === "verifying");
  const activeDomains = allDomains.filter((d) => d.domain.status === "active");
  const failedDomains = allDomains.filter((d) => d.domain.status === "failed");

  const statusIcon = (status: string) => {
    if (status === "active") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "pending" || status === "verifying") return <Clock className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const statusBadge = (status: string) => {
    const classes =
      status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" :
      status === "pending" || status === "verifying" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
      "bg-red-500/10 text-red-400 border-red-500/20";
    return <Badge className={`text-xs border ${classes}`}>{status}</Badge>;
  };

  return (
    <DashboardShell
      title="White-Label Admin"
      role="admin"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">White-Label Administration</h1>
          <p className="text-gray-400 mt-1">
            Approve custom domains, manage agency tiers, and oversee white-label configurations.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Agency Partners", value: agencyUsers.length, icon: <Building2 className="w-5 h-5" />, color: "text-purple-400" },
            { label: "Active Domains", value: activeDomains.length, icon: <Globe className="w-5 h-5" />, color: "text-green-400" },
            { label: "Pending Approval", value: pendingDomains.length, icon: <Clock className="w-5 h-5" />, color: "text-yellow-400" },
            { label: "Failed/Rejected", value: failedDomains.length, icon: <XCircle className="w-5 h-5" />, color: "text-red-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-gray-500 text-xs">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Domain Approvals */}
        {pendingDomains.length > 0 && (
          <Card className="bg-yellow-500/5 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Pending Domain Approvals ({pendingDomains.length})
              </CardTitle>
              <CardDescription>These domains are awaiting DNS verification and admin approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingDomains.map((d) => (
                  <div key={d.domain.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium truncate">{d.domain.domain}</p>
                      <p className="text-gray-500 text-xs">Agency: {d.agency?.name ?? d.agency?.email ?? `ID ${d.domain.agencyUserId}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        onClick={() => updateDomainStatus.mutate({ domainId: d.domain.id, status: "active" })}
                        disabled={updateDomainStatus.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:text-red-300 text-xs"
                        onClick={() => updateDomainStatus.mutate({ domainId: d.domain.id, status: "failed" })}
                        disabled={updateDomainStatus.isPending}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Domains */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> All Custom Domains ({allDomains.length})
            </CardTitle>
            <CardDescription>Every custom domain registered across all agency accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {allDomains.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No custom domains registered yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Domain</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Status</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">SSL</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Primary</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Agency ID</th>
                      <th className="text-right text-gray-400 font-medium py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDomains.map((d) => (
                      <tr key={d.domain.id} className="border-b border-gray-800/50 hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {statusIcon(d.domain.status)}
                            <span className="text-gray-800 font-medium">{d.domain.domain}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{statusBadge(d.domain.status)}</td>
                        <td className="py-3 pr-4">
                          <Badge className={`text-xs border ${
                            d.domain.sslStatus === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                            "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          }`}>
                            {d.domain.sslStatus}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {d.domain.isPrimary ? (
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">Primary</Badge>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">{d.agency?.name ?? d.agency?.email ?? `ID ${d.domain.agencyUserId}`}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {d.domain.status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-white h-7 w-7 p-0"
                                onClick={() => window.open(`https://${d.domain.domain}`, "_blank")}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                            {d.domain.status !== "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300 text-xs h-7 px-2"
                                onClick={() => updateDomainStatus.mutate({ domainId: d.domain.id, status: "active" })}
                                disabled={updateDomainStatus.isPending}
                              >
                                Approve
                              </Button>
                            )}
                            {d.domain.status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 text-xs h-7 px-2"
                                onClick={() => updateDomainStatus.mutate({ domainId: d.domain.id, status: "failed" })}
                                disabled={updateDomainStatus.isPending}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agency Partners */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Agency Partners ({agencyUsers.length})
            </CardTitle>
            <CardDescription>All users with the agency role and their white-label access.</CardDescription>
          </CardHeader>
          <CardContent>
            {agencyUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No agency partners yet. Promote a user to agency role from the Users admin page.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agencyUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-700">
                    <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                      {(u.name ?? u.email ?? "A").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium truncate">{u.name ?? "—"}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                        <Shield className="w-3 h-3 mr-1" /> Agency
                      </Badge>
                      <span className="text-gray-500 text-xs">
                        {allDomains.filter((d) => d.domain.agencyUserId === u.id).length} domain(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
