import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, CreditCard, BarChart3, LogOut, Zap, MessageSquare, Phone, Video } from "lucide-react";

/**
 * White-labeled client portal — applies the agency's brand config dynamically.
 * Clients of an agency see this portal instead of the standard VonWork dashboard.
 */
export default function ClientPortal() {
  const { user, loading, logout } = useAuth();
  const { data: brandConfig } = trpc.whiteLabel.getConfig.useQuery(undefined, { retry: false });
  const { data: credits } = trpc.credits.balance.useQuery(undefined, { enabled: !!user });
  const { data: agents = [] } = trpc.agents.list.useQuery(undefined, { enabled: !!user });

  const [themeApplied, setThemeApplied] = useState(false);

  // Apply brand colors dynamically to CSS variables
  useEffect(() => {
    if (!brandConfig) return;
    const root = document.documentElement;
    if (brandConfig.primaryColor) {
      root.style.setProperty("--brand-primary", brandConfig.primaryColor);
    }
    if (brandConfig.secondaryColor) {
      root.style.setProperty("--brand-secondary", brandConfig.secondaryColor);
    }
    if (brandConfig.accentColor) {
      root.style.setProperty("--brand-accent", brandConfig.accentColor);
    }
    if (brandConfig.backgroundColor) {
      root.style.setProperty("--brand-bg", brandConfig.backgroundColor);
    }
    if (brandConfig.textColor) {
      root.style.setProperty("--brand-text", brandConfig.textColor);
    }
    if (brandConfig.customCss) {
      const style = document.createElement("style");
      style.id = "brand-custom-css";
      style.textContent = brandConfig.customCss;
      document.head.appendChild(style);
    }
    setThemeApplied(true);
    return () => {
      document.getElementById("brand-custom-css")?.remove();
    };
  }, [brandConfig]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = getLoginUrl();
    }
  }, [user, loading]);

  if (loading || !themeApplied && brandConfig === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const brandName = brandConfig?.brandName ?? "VonWork";
  const primaryColor = brandConfig?.primaryColor ?? "#7c3aed";
  const logoUrl = brandConfig?.logoUrl;
  const supportEmail = brandConfig?.supportEmail;
  const hideVonwork = brandConfig?.hideVonworkBranding ?? false;
  const loginMessage = brandConfig?.customLoginMessage ?? `Welcome to ${brandName}`;
  const footerText = brandConfig?.footerText ?? `© ${new Date().getFullYear()} ${brandName}`;

  const agentTypeIcon = (type: string) => {
    if (type === "video_sales") return <Video className="w-4 h-4" />;
    if (type === "outbound_caller") return <Phone className="w-4 h-4" />;
    if (type === "chat") return <MessageSquare className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: brandConfig?.backgroundColor ?? "#030712",
        color: brandConfig?.textColor ?? "#f9fafb",
        fontFamily: brandConfig?.fontFamily ?? "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm"
        style={{ backgroundColor: `${brandConfig?.backgroundColor ?? "#030712"}cc` }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {brandName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-lg" style={{ color: brandConfig?.textColor ?? "#f9fafb" }}>
              {brandName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{user?.name ?? user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-gray-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Welcome Banner */}
        <div
          className="rounded-2xl p-6 mb-8 border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}20, ${brandConfig?.secondaryColor ?? "#06b6d4"}10)`,
            borderColor: `${primaryColor}30`,
          }}
        >
          <h1 className="text-2xl font-bold text-white">{loginMessage}</h1>
          <p className="text-gray-400 mt-1">
            Manage your AI workforce from your personalized dashboard.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Credit Balance",
              value: credits?.balance?.toLocaleString() ?? "—",
              icon: <CreditCard className="w-5 h-5" />,
              color: primaryColor,
            },
            {
              label: "Active Agents",
              value: agents.filter((a) => a.isActive).length,
              icon: <Bot className="w-5 h-5" />,
              color: brandConfig?.secondaryColor ?? "#06b6d4",
            },
            {
              label: "Total Agents",
              value: agents.length,
              icon: <BarChart3 className="w-5 h-5" />,
              color: brandConfig?.accentColor ?? "#10b981",
            },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white/5 border-white/10">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: `${stat.color}30`, color: stat.color }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agents Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your AI Agents</h2>
            <Button
              size="sm"
              style={{ backgroundColor: primaryColor }}
              className="text-white hover:opacity-90"
              onClick={() => window.location.href = "/dashboard"}
            >
              <Zap className="w-4 h-4 mr-2" /> Manage Agents
            </Button>
          </div>

          {agents.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <Bot className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No agents yet. Create your first AI agent to get started.</p>
                <Button
                  className="mt-4 text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => window.location.href = "/dashboard"}
                >
                  Create Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Card key={agent.id} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}
                      >
                        {agentTypeIcon(agent.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-sm truncate">{agent.name}</CardTitle>
                        <p className="text-gray-500 text-xs capitalize">{agent.type.replace(/_/g, " ")}</p>
                      </div>
                      <Badge
                        className={`text-xs border shrink-0 ${
                          agent.isActive
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        }`}
                      >
                        {agent.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 text-xs truncate">{agent.model}</p>
                    {agent.shareableSlug && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 text-xs text-gray-400 hover:text-white w-full justify-start p-0 h-auto"
                        onClick={() => {
                          const url = `${window.location.origin}/meet/${agent.shareableSlug}`;
                          navigator.clipboard.writeText(url);
                        }}
                      >
                        Copy meeting link
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Support Section */}
        {supportEmail && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">Need help?</p>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-sm hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {supportEmail}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-gray-500">
          <span>{footerText}</span>
          {!hideVonwork && (
            <span>
              Powered by{" "}
              <a href="https://vonwork.ai" className="text-purple-400 hover:underline">
                VonWork
              </a>
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
