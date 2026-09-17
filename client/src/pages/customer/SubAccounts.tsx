import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { customerNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { Users, Plus, Mail, CreditCard, Settings, MoreHorizontal, Shield } from "lucide-react";
import { toast } from "sonner";

export default function SubAccounts() {
  const { isAuthenticated, loading, user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const clientsQuery = trpc.agency.clients.useQuery(undefined, {
    enabled: !!isAuthenticated,
  });

  const inviteMutation = trpc.whiteLabel.inviteClient.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setInviteEmail("");
      setInviteOpen(false);
      clientsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const clients = (clientsQuery.data ?? []) as any[];

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    invited: "bg-yellow-100 text-yellow-700",
    suspended: "bg-red-100 text-red-700",
    removed: "bg-gray-100 text-gray-500",
  };

  return (
    <DashboardShell navItems={customerNavItems} title="Sub-Accounts" role="customer">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sub-Accounts</h1>
            <p className="text-sm text-gray-500 mt-1">Manage client accounts under your agency</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Invite Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite a Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Client Email</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="border-gray-300"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  An invitation email will be sent. Once they accept, they will appear as an active sub-account.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => inviteMutation.mutate({ email: inviteEmail })}
                    disabled={!inviteEmail || inviteMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
                <div className="text-xs text-gray-500">Total Clients</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {clients.filter((c) => c.status === "active").length}
                </div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {clients.filter((c) => c.status === "invited").length}
                </div>
                <div className="text-xs text-gray-500">Pending Invites</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client list */}
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">Client Accounts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {clientsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">No clients yet</p>
                <p className="text-xs text-gray-400 mt-1">Invite your first client to get started</p>
                <Button
                  onClick={() => setInviteOpen(true)}
                  size="sm"
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" /> Invite Client
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {clients.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
                        {(client.inviteEmail?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.client?.name ?? client.inviteEmail}
                        </div>
                        <div className="text-xs text-gray-500">{client.inviteEmail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-gray-500">Credits Allocated</div>
                        <div className="text-sm font-semibold text-gray-900">{client.creditsAllocated?.toLocaleString() ?? 0}</div>
                      </div>
                      <Badge className={`text-xs ${statusColor[client.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {client.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
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
