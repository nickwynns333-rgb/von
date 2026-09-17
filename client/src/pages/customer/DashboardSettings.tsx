import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardShell, customerNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, User, Bell, Shield, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DashboardSettings() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  return (
    <DashboardShell navItems={customerNavItems} title="Settings" role="customer">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Account Settings</h1>
            <p className="text-white/50 text-sm">Manage your profile and preferences</p>
          </div>
        </div>

        {/* Profile */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
                {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{user?.name ?? "Unnamed"}</p>
                <p className="text-white/50 text-sm">{user?.email ?? "No email"}</p>
                <Badge className="mt-1 bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs capitalize">
                  {user?.role ?? "user"}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-white/70">Display Name</Label>
                <Input
                  defaultValue={user?.name ?? ""}
                  placeholder="Your name"
                  className="bg-white/5 border-white/10 text-white"
                  disabled
                />
                <p className="text-xs text-white/30">Managed via Manus OAuth</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Email</Label>
                <Input
                  defaultValue={user?.email ?? ""}
                  placeholder="your@email.com"
                  className="bg-white/5 border-white/10 text-white"
                  disabled
                />
                <p className="text-xs text-white/30">Managed via Manus OAuth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-400" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div>
                <p className="text-sm text-white">Email Notifications</p>
                <p className="text-xs text-white/40">Receive updates about your campaigns and agents</p>
              </div>
              <button
                onClick={() => { setNotifications(!notifications); toast.success(notifications ? "Notifications disabled" : "Notifications enabled"); }}
                className={`relative w-10 h-6 rounded-full transition-colors ${notifications ? "bg-cyan-500" : "bg-white/20"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div>
                <p className="text-sm text-white">Authentication</p>
                <p className="text-xs text-white/40">Secured via Manus OAuth 2.0</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
            </div>
            <Button
              onClick={() => logout()}
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
