import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell, adminNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Search, Shield, User, Building2 } from "lucide-react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const usersQuery = trpc.admin.users.useQuery({ limit: 200, offset: 0 });
  const users = usersQuery.data;
  const refetch = usersQuery.refetch;
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); refetch(); setUpdatingId(null); },
    onError: (e) => { toast.error(e.message); setUpdatingId(null); },
  });

  const filtered = (users ?? []).filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const roleIcon = (role: string) => {
    if (role === "admin") return <Shield className="w-3 h-3" />;
    if (role === "agency") return <Building2 className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (role === "agency") return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    return "bg-white/10 text-white/60 border-white/10";
  };

  return (
    <DashboardShell navItems={adminNavItems} title="Admin — Users" role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-white/50 text-sm">{users?.length ?? 0} total users</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Users", value: users?.length ?? 0, color: "text-cyan-400" },
            { label: "Admins", value: users?.filter(u => u.role === "admin").length ?? 0, color: "text-red-400" },
            { label: "Agencies", value: users?.filter(u => u.role === "agency").length ?? 0, color: "text-violet-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-[#0f0f1a] border-white/10">
              <CardContent className="p-4">
                <p className="text-white/50 text-sm">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white">All Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
                      {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name ?? "Unnamed"}</p>
                      <p className="text-xs text-white/40 truncate">{user.email ?? user.openId}</p>
                    </div>
                    <Badge className={`border text-xs flex items-center gap-1 ${roleColor(user.role)}`}>
                      {roleIcon(user.role)}
                      {user.role}
                    </Badge>
                    <p className="text-xs text-white/30 w-24 text-right">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <Select
                      value={user.role}
                      onValueChange={(role) => {
                        setUpdatingId(user.id);
                        updateRole.mutate({ userId: user.id, role: role as "user" | "admin" | "agency" });
                      }}
                      disabled={updatingId === user.id}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="agency">agency</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
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
