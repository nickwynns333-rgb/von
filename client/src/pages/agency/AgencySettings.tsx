import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardShell, agencyNavItems } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Palette, Globe, Save } from "lucide-react";

export default function AgencySettings() {
  const { data: settings, refetch } = trpc.agency.whiteLabelSettings.useQuery();
  const wl = (settings as any) ?? {};

  const [brandName, setBrandName] = useState(wl.brandName ?? "");
  const [primaryColor, setPrimaryColor] = useState(wl.primaryColor ?? "#06b6d4");
  const [logoUrl, setLogoUrl] = useState(wl.logoUrl ?? "");
  const [supportEmail, setSupportEmail] = useState(wl.supportEmail ?? "");

  const update = trpc.agency.updateWhiteLabel.useMutation({
    onSuccess: () => { toast.success("Settings saved!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardShell navItems={agencyNavItems} title="Agency — Settings" role="agency">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Agency Settings</h1>
            <p className="text-white/50 text-sm">Configure your white-label branding and preferences</p>
          </div>
        </div>

        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-violet-400" />
              Brand Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white/70">Brand Name</Label>
                <Input
                  placeholder="Your Agency Name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Support Email</Label>
                <Input
                  placeholder="support@youragency.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-9 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-white/5 border-white/10 text-white font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Logo URL</Label>
                <Input
                  placeholder="https://youragency.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <Button
              onClick={() => update.mutate({ brandName, primaryColor })}
              disabled={update.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {update.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Custom Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/50 text-sm">
              Manage custom domains for your white-label portal in the{" "}
              <a href="/agency/white-label" className="text-cyan-400 hover:underline">White-Label Portal</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
