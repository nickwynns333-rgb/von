import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell, agencyNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, UserPlus, Search, Mail } from "lucide-react";

export default function AgencyClients() {
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: clients, refetch } = trpc.agency.clients.useQuery();
  const invite = trpc.whiteLabel.inviteClient.useMutation({
    onSuccess: () => { toast.success("Invitation sent!"); setInviteEmail(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (clients ?? []).filter((c: any) =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase()) || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell navItems={agencyNavItems} title="Agency — Clients" role="agency">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Client Accounts</h1>
              <p className="text-white/50 text-sm">{clients?.length ?? 0} clients under your agency</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Invite */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Invite New Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="client@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button
                onClick={() => invite.mutate({ email: inviteEmail })}
                disabled={!inviteEmail || invite.isPending}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {invite.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">All Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No clients yet. Invite your first client above.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((client: any) => (
                  <div key={client.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
                      {(client.name ?? client.email ?? "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{client.name ?? "Unnamed"}</p>
                      <p className="text-xs text-white/40 truncate">{client.email}</p>
                    </div>
                    <Badge className="bg-white/10 text-white/60 border-white/10 text-xs">
                      {client.role ?? "user"}
                    </Badge>
                    <p className="text-xs text-white/30">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}
                    </p>
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
