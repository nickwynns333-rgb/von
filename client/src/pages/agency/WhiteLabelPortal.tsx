import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import {
  Globe,
  Palette,
  Users,
  BarChart3,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  ExternalLink,
  Mail,
  CreditCard,
  Settings,
  Eye,
} from "lucide-react";

const navItems = [
  { label: "Brand Editor", icon: <Palette className="w-4 h-4" />, href: "/agency/white-label" },
  { label: "Custom Domains", icon: <Globe className="w-4 h-4" />, href: "/agency/white-label" },
  { label: "Client Accounts", icon: <Users className="w-4 h-4" />, href: "/agency/white-label" },
  { label: "Usage Reports", icon: <BarChart3 className="w-4 h-4" />, href: "/agency/white-label" },
];

// ─── Brand Editor ─────────────────────────────────────────────────────────────

function BrandEditor() {
  const { data: config, refetch } = trpc.whiteLabel.getConfig.useQuery();
  const saveConfig = trpc.whiteLabel.saveConfig.useMutation({
    onSuccess: () => { toast.success("Brand settings saved!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    brandName: config?.brandName ?? "VonWork",
    logoUrl: config?.logoUrl ?? "",
    faviconUrl: config?.faviconUrl ?? "",
    primaryColor: config?.primaryColor ?? "#7c3aed",
    secondaryColor: config?.secondaryColor ?? "#06b6d4",
    accentColor: config?.accentColor ?? "#10b981",
    backgroundColor: config?.backgroundColor ?? "#030712",
    textColor: config?.textColor ?? "#f9fafb",
    fontFamily: config?.fontFamily ?? "Inter",
    customCss: config?.customCss ?? "",
    supportEmail: config?.supportEmail ?? "",
    supportPhone: config?.supportPhone ?? "",
    footerText: config?.footerText ?? "",
    hideVonworkBranding: config?.hideVonworkBranding ?? false,
    customLoginMessage: config?.customLoginMessage ?? "",
  });

  // Sync form when config loads
  useEffect(() => {
    if (config) {
      setForm({
        brandName: config.brandName ?? "VonWork",
        logoUrl: config.logoUrl ?? "",
        faviconUrl: config.faviconUrl ?? "",
        primaryColor: config.primaryColor ?? "#7c3aed",
        secondaryColor: config.secondaryColor ?? "#06b6d4",
        accentColor: config.accentColor ?? "#10b981",
        backgroundColor: config.backgroundColor ?? "#030712",
        textColor: config.textColor ?? "#f9fafb",
        fontFamily: config.fontFamily ?? "Inter",
        customCss: config.customCss ?? "",
        supportEmail: config.supportEmail ?? "",
        supportPhone: config.supportPhone ?? "",
        footerText: config.footerText ?? "",
        hideVonworkBranding: config.hideVonworkBranding ?? false,
        customLoginMessage: config.customLoginMessage ?? "",
      });
    }
  }, [config]);

  const colorFields = [
    { key: "primaryColor", label: "Primary Color" },
    { key: "secondaryColor", label: "Secondary Color" },
    { key: "accentColor", label: "Accent Color" },
    { key: "backgroundColor", label: "Background Color" },
    { key: "textColor", label: "Text Color" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Live Preview Banner */}
      <Card className="border border-purple-500/30 bg-purple-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm font-medium text-white">Live Preview</p>
              <p className="text-xs text-gray-400">Your clients see your brand, not VonWork</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border border-white/20"
                style={{ backgroundColor: form.primaryColor }}
              />
              <span className="text-sm font-semibold text-white">{form.brandName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Identity */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base">Brand Identity</CardTitle>
            <CardDescription>Your company name and visual assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Brand Name</Label>
              <Input
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <Label className="text-gray-300">Logo URL</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="https://yoursite.com/logo.png"
              />
            </div>
            <div>
              <Label className="text-gray-300">Favicon URL</Label>
              <Input
                value={form.faviconUrl}
                onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="https://yoursite.com/favicon.ico"
              />
            </div>
            <div>
              <Label className="text-gray-300">Font Family</Label>
              <Input
                value={form.fontFamily}
                onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="Inter"
              />
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base">Color Palette</CardTitle>
            <CardDescription>Customize your brand colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {colorFields.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-700 bg-transparent"
                />
                <div className="flex-1">
                  <Label className="text-gray-300 text-sm">{label}</Label>
                  <Input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="bg-white border-gray-200 text-white mt-0.5 h-8 text-sm font-mono"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Support & Contact */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base">Support & Contact</CardTitle>
            <CardDescription>Shown to your clients in the portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Support Email</Label>
              <Input
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="support@yourcompany.com"
              />
            </div>
            <div>
              <Label className="text-gray-300">Support Phone</Label>
              <Input
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <Label className="text-gray-300">Footer Text</Label>
              <Input
                value={form.footerText}
                onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="© 2025 Your Company. All rights reserved."
              />
            </div>
            <div>
              <Label className="text-gray-300">Custom Login Message</Label>
              <Input
                value={form.customLoginMessage}
                onChange={(e) => setForm({ ...form, customLoginMessage: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                placeholder="Welcome to Your AI Workforce Platform"
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base">Advanced</CardTitle>
            <CardDescription>Custom CSS and branding options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-300">Hide VonWork Branding</Label>
                <p className="text-xs text-gray-500 mt-0.5">Remove "Powered by VonWork" from client portal</p>
              </div>
              <Switch
                checked={form.hideVonworkBranding}
                onCheckedChange={(v) => setForm({ ...form, hideVonworkBranding: v })}
              />
            </div>
            <div>
              <Label className="text-gray-300">Custom CSS</Label>
              <Textarea
                value={form.customCss}
                onChange={(e) => setForm({ ...form, customCss: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1 font-mono text-xs"
                rows={6}
                placeholder="/* Add custom CSS overrides here */&#10;.my-class { color: red; }"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveConfig.mutate(form)}
          disabled={saveConfig.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8"
        >
          {saveConfig.isPending ? "Saving..." : "Save Brand Settings"}
        </Button>
      </div>
    </div>
  );
}

// ─── Domain Manager ───────────────────────────────────────────────────────────

function DomainManager() {
  const { data: domains = [], refetch } = trpc.whiteLabel.listDomains.useQuery();
  const addDomain = trpc.whiteLabel.addDomain.useMutation({
    onSuccess: (data) => {
      toast.success(`Domain added! Set up DNS records to verify.`);
      setNewDomain("");
      setDnsInstructions(data);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const verifyDomain = trpc.whiteLabel.verifyDomain.useMutation({
    onSuccess: (data) => { toast.success(`${data.domain} verified and active!`); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const removeDomain = trpc.whiteLabel.removeDomain.useMutation({
    onSuccess: () => { toast.success("Domain removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setPrimary = trpc.whiteLabel.setPrimaryDomain.useMutation({
    onSuccess: () => { toast.success("Primary domain updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [newDomain, setNewDomain] = useState("");
  const [dnsInstructions, setDnsInstructions] = useState<{
    domain: string;
    verificationToken: string;
    dnsInstructions: { type: string; name: string; value: string; ttl: number };
    cnameInstructions: { type: string; name: string; value: string; ttl: number };
  } | null>(null);

  const statusIcon = (status: string) => {
    if (status === "active") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "pending" || status === "verifying") return <Clock className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const statusColor = (status: string) => {
    if (status === "active") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (status === "pending" || status === "verifying") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Add Domain */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-800 text-base">Add Custom Domain</CardTitle>
          <CardDescription>Point your domain to VonWork to white-label your client portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="bg-white border-gray-200 text-white"
              placeholder="app.yourcompany.com"
              onKeyDown={(e) => e.key === "Enter" && newDomain && addDomain.mutate({ domain: newDomain })}
            />
            <Button
              onClick={() => newDomain && addDomain.mutate({ domain: newDomain })}
              disabled={addDomain.isPending || !newDomain}
              className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Domain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      {dnsInstructions && (
        <Card className="bg-blue-500/5 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400 text-base">DNS Setup Instructions</CardTitle>
            <CardDescription>Add these records to your DNS provider for <strong>{dnsInstructions.domain}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[dnsInstructions.dnsInstructions, dnsInstructions.cnameInstructions].map((record, i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <div className="grid grid-cols-4 gap-2 text-gray-500 text-xs mb-2">
                  <span>Type</span><span>Name</span><span className="col-span-2">Value</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-white">
                  <span className="text-cyan-400">{record.type}</span>
                  <span className="truncate">{record.name}</span>
                  <span className="col-span-2 truncate text-green-400">{record.value}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-gray-400 hover:text-white"
                  onClick={() => { navigator.clipboard.writeText(record.value); toast.success("Copied!"); }}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy Value
                </Button>
              </div>
            ))}
            <p className="text-xs text-gray-500">DNS propagation can take up to 48 hours. Click "Verify" once records are set.</p>
          </CardContent>
        </Card>
      )}

      {/* Domain List */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-800 text-base">Your Domains ({domains.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No custom domains yet. Add one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-700">
                  {statusIcon(d.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium truncate">{d.domain}</span>
                      {d.isPrimary && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-xs border ${statusColor(d.status)}`}>{d.status}</Badge>
                      <span className="text-xs text-gray-500">SSL: {d.sslStatus}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:text-white text-xs"
                        onClick={() => verifyDomain.mutate({ domainId: d.id })}
                        disabled={verifyDomain.isPending}
                      >
                        Verify
                      </Button>
                    )}
                    {d.status === "active" && !d.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:text-white text-xs"
                        onClick={() => setPrimary.mutate({ domainId: d.id })}
                      >
                        Set Primary
                      </Button>
                    )}
                    {d.status === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white"
                        onClick={() => window.open(`https://${d.domain}`, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => removeDomain.mutate({ domainId: d.id })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Client Accounts ─────────────────────────────────────────────────────────

function ClientAccounts() {
  const { data: clients = [], refetch } = trpc.whiteLabel.listClients.useQuery();
  const inviteClient = trpc.whiteLabel.inviteClient.useMutation({
    onSuccess: (data) => {
      toast.success(`Invite sent! Share this link: ${window.location.origin}${data.inviteUrl}`);
      setInviteForm({ email: "", creditLimit: 1000, agentLimit: 5, customLabel: "", notes: "" });
      setShowInvite(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateClient = trpc.whiteLabel.updateClient.useMutation({
    onSuccess: () => { toast.success("Client updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const allocateCredits = trpc.whiteLabel.allocateCredits.useMutation({
    onSuccess: (data) => { toast.success(`${data.creditsAllocated} credits allocated!`); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "", creditLimit: 1000, agentLimit: 5, customLabel: "", notes: "",
  });
  const [allocatingId, setAllocatingId] = useState<number | null>(null);
  const [allocAmount, setAllocAmount] = useState(100);

  const statusColor = (status: string) => {
    if (status === "active") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (status === "invited") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    if (status === "suspended") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Client Sub-Accounts</h3>
          <p className="text-gray-500 text-sm">{clients.length} client{clients.length !== 1 ? "s" : ""} under your agency</p>
        </div>
        <Button
          onClick={() => setShowInvite(!showInvite)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Invite Client
        </Button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <Card className="bg-gray-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-gray-800 text-base">Invite New Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Client Email *</Label>
                <Input
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="bg-white border-gray-200 text-white mt-1"
                  placeholder="client@company.com"
                  type="email"
                />
              </div>
              <div>
                <Label className="text-gray-300">Custom Label</Label>
                <Input
                  value={inviteForm.customLabel}
                  onChange={(e) => setInviteForm({ ...inviteForm, customLabel: e.target.value })}
                  className="bg-white border-gray-200 text-white mt-1"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <Label className="text-gray-300">Credit Limit</Label>
                <Input
                  type="number"
                  value={inviteForm.creditLimit}
                  onChange={(e) => setInviteForm({ ...inviteForm, creditLimit: parseInt(e.target.value) || 1000 })}
                  className="bg-white border-gray-200 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Agent Limit</Label>
                <Input
                  type="number"
                  value={inviteForm.agentLimit}
                  onChange={(e) => setInviteForm({ ...inviteForm, agentLimit: parseInt(e.target.value) || 5 })}
                  className="bg-white border-gray-200 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Notes</Label>
              <Textarea
                value={inviteForm.notes}
                onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
                className="bg-white border-gray-200 text-white mt-1"
                rows={2}
                placeholder="Internal notes about this client..."
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => inviteClient.mutate(inviteForm)}
                disabled={inviteClient.isPending || !inviteForm.email}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                {inviteClient.isPending ? "Sending..." : "Send Invite"}
              </Button>
              <Button variant="outline" onClick={() => setShowInvite(false)} className="border-gray-700 text-gray-300">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client List */}
      {clients.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 font-medium">No clients yet</p>
            <p className="text-gray-600 text-sm mt-1">Invite your first client to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((row) => (
            <Card key={row.client.id} className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                    {(row.client.customLabel ?? row.client.inviteEmail).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-800 font-medium">
                        {row.client.customLabel ?? row.user?.name ?? row.client.inviteEmail}
                      </span>
                      <Badge className={`text-xs border ${statusColor(row.client.status)}`}>
                        {row.client.status}
                      </Badge>
                    </div>
                    <p className="text-gray-500 text-sm">{row.client.inviteEmail}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span><CreditCard className="w-3 h-3 inline mr-1" />{row.client.creditsAllocated} / {row.client.creditLimit} credits</span>
                      <span><Settings className="w-3 h-3 inline mr-1" />{row.client.agentLimit} agent limit</span>
                      {row.user?.lastSignedIn && (
                        <span>Last active: {new Date(row.user.lastSignedIn).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.client.status === "active" && row.client.clientUserId && (
                      allocatingId === row.client.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={allocAmount}
                            onChange={(e) => setAllocAmount(parseInt(e.target.value) || 100)}
                            className="w-20 h-8 bg-white border-gray-200 text-white text-sm"
                          />
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            onClick={() => {
                              allocateCredits.mutate({ clientId: row.client.id, credits: allocAmount });
                              setAllocatingId(null);
                            }}
                          >
                            Allocate
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAllocatingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700 text-gray-300 hover:text-white text-xs"
                          onClick={() => setAllocatingId(row.client.id)}
                        >
                          <CreditCard className="w-3 h-3 mr-1" /> Credits
                        </Button>
                      )
                    )}
                    {row.client.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:text-red-300 text-xs"
                        onClick={() => updateClient.mutate({ clientId: row.client.id, status: "suspended" })}
                      >
                        Suspend
                      </Button>
                    )}
                    {row.client.status === "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-400 hover:text-green-300 text-xs"
                        onClick={() => updateClient.mutate({ clientId: row.client.id, status: "active" })}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Usage Reports ────────────────────────────────────────────────────────────

function UsageReports() {
  const { data: clients = [] } = trpc.whiteLabel.listClients.useQuery();

  const totalCreditsAllocated = clients.reduce((sum, c) => sum + c.client.creditsAllocated, 0);
  const activeClients = clients.filter((c) => c.client.status === "active").length;
  const invitedClients = clients.filter((c) => c.client.status === "invited").length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: clients.length, color: "text-purple-400" },
          { label: "Active", value: activeClients, color: "text-green-400" },
          { label: "Pending Invite", value: invitedClients, color: "text-yellow-400" },
          { label: "Credits Allocated", value: totalCreditsAllocated.toLocaleString(), color: "text-cyan-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-Client Usage Table */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-800 text-base">Per-Client Usage</CardTitle>
          <CardDescription>Credits allocated and consumed per client</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No client data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-400 font-medium py-2 pr-4">Client</th>
                    <th className="text-left text-gray-400 font-medium py-2 pr-4">Status</th>
                    <th className="text-right text-gray-400 font-medium py-2 pr-4">Allocated</th>
                    <th className="text-right text-gray-400 font-medium py-2 pr-4">Limit</th>
                    <th className="text-right text-gray-400 font-medium py-2">Agents</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((row) => (
                    <tr key={row.client.id} className="border-b border-gray-800/50 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="text-gray-800 font-medium">{row.client.customLabel ?? row.user?.name ?? "—"}</p>
                          <p className="text-gray-500 text-xs">{row.client.inviteEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={`text-xs border ${
                          row.client.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          row.client.status === "invited" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        }`}>
                          {row.client.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right text-cyan-400 font-mono">
                        {row.client.creditsAllocated.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-400 font-mono">
                        {row.client.creditLimit.toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-gray-400">
                        {row.client.agentLimit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhiteLabelPortal() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = getLoginUrl();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardShell
      title="White-Label Portal"
      role={(user.role === "user" ? "customer" : user.role) as "admin" | "agency" | "customer"}
      navItems={navItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">White-Label Agency Portal</h1>
          <p className="text-gray-400 mt-1">
            Customize your brand, manage custom domains, and control client sub-accounts.
          </p>
        </div>

        <Tabs defaultValue="brand" className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="brand" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400">
              <Palette className="w-4 h-4 mr-2" /> Brand Editor
            </TabsTrigger>
            <TabsTrigger value="domains" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400">
              <Globe className="w-4 h-4 mr-2" /> Custom Domains
            </TabsTrigger>
            <TabsTrigger value="clients" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400">
              <Users className="w-4 h-4 mr-2" /> Client Accounts
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400">
              <BarChart3 className="w-4 h-4 mr-2" /> Usage Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brand"><BrandEditor /></TabsContent>
          <TabsContent value="domains"><DomainManager /></TabsContent>
          <TabsContent value="clients"><ClientAccounts /></TabsContent>
          <TabsContent value="reports"><UsageReports /></TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
