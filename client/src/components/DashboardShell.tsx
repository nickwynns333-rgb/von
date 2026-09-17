import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { BrandMark } from "@/components/BrandMark";
import {
  Bot,
  BookOpen,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
  Zap,
  BarChart3,
  Building2,
  Palette,
  DollarSign,
  Activity,
  Menu,
  X,
  Database,
  MessageSquare,
  UserPlus,
  Calendar,
  Phone,
  Bell,
  ChevronRight,
  ArrowLeftRight,
  TrendingUp,
  Globe,
  Flag,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
  role: "admin" | "agency" | "customer";
}

export function DashboardShell({ children, navItems, title, role }: DashboardShellProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const creditsQuery = trpc.credits.balance.useQuery(undefined, { enabled: !!user });
  const agentsQuery = trpc.agents.list.useQuery(undefined, { enabled: !!user && role === "customer" });

  const roleColors = {
    admin: "bg-red-500/10 text-red-400 border-red-500/20",
    agency: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    customer: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  const roleLabels = { admin: "Admin", agency: "Agency", customer: "Pro" };

  const agents = (agentsQuery.data ?? []) as any[];
  const chatAgents = agents.filter((a: any) => a.type === "chat");
  const voiceAgents = agents.filter((a: any) => a.type === "receptionist" || a.type === "outbound_caller");

  // Account switcher options (role-based)
  const accountOptions = [
    { label: "Customer Dashboard", href: "/dashboard", active: role === "customer" },
    ...(user?.role === "admin" ? [{ label: "Admin Panel", href: "/admin", active: role === "admin" }] : []),
    ...(user?.role === "agency" || user?.role === "admin" ? [{ label: "Agency Portal", href: "/agency", active: role === "agency" }] : []),
    { label: "Affiliate Portal", href: "/affiliate", active: false },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gray-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="cursor-pointer">
            <BrandMark iconClassName="w-8 h-8" />
          </a>
          <button
            className="lg:hidden text-gray-400 hover:text-gray-700"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3">
          <Badge className={`text-xs border ${roleColors[role]}`}>
            {roleLabels[role]} Dashboard
          </Badge>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && item.href !== "/agency" && location.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => { e.preventDefault(); navigate(item.href); setMobileOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <span className={`${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <Badge className="ml-auto text-xs bg-blue-100 text-blue-600 border-0">
                    {item.badge}
                  </Badge>
                )}
              </a>
            );
          })}
        </nav>

        {/* Credits widget (non-admin) */}
        {role !== "admin" && creditsQuery.data && (
          <div className="mx-3 mb-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Credits</span>
              <Zap className="w-3 h-3 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-gray-800">
              {(creditsQuery.data.balance ?? 0).toLocaleString()}
            </div>
            <a href={role === "agency" ? "/agency/credits" : "/dashboard/credits"} onClick={(e) => { e.preventDefault(); navigate(role === "agency" ? "/agency/credits" : "/dashboard/credits"); }} className="text-xs text-blue-600 hover:underline cursor-pointer">Buy more →</a>
          </div>
        )}

        {/* Account Stats (customer only) */}
        {role === "customer" && (
          <div className="mx-3 mb-2">
            <a
              href="/dashboard/usage"
              onClick={(e) => { e.preventDefault(); navigate("/dashboard/usage"); }}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {chatAgents.length} chat · {voiceAgents.length} voice
                </span>
              </div>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Account Switcher */}
        <div className="mx-3 mb-2">
          <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Switch Account</span>
                <ChevronDown className="w-3 h-3 ml-auto" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 bg-white border-gray-200 shadow-lg mb-1">
              {accountOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.href}
                  onClick={() => { navigate(opt.href); setSwitcherOpen(false); }}
                  className={`flex items-center gap-2 cursor-pointer ${opt.active ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900"}`}
                >
                  {opt.active && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                  {!opt.active && <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User menu */}
        <div className="p-3 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{user?.name ?? "User"}</div>
                  <div className="text-xs text-gray-400 truncate">{user?.email ?? ""}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-gray-200 shadow-lg">
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-400 hover:text-red-300 cursor-pointer"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center px-4 lg:px-8 gap-4">
          <button
            className="lg:hidden text-gray-400 hover:text-gray-700"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-[#F5F7FA]">{children}</main>
      </div>
    </div>
  );
}

// ─── Nav configs ──────────────────────────────────────────────────────────────

export const adminNavItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Data Marketplace", href: "/admin/data-marketplace", icon: <Database className="w-4 h-4" /> },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: <CreditCard className="w-4 h-4" /> },
  { label: "Credits & Pricing", href: "/admin/credits", icon: <DollarSign className="w-4 h-4" /> },
  { label: "AI Models", href: "/admin/models", icon: <Bot className="w-4 h-4" /> },
  { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "System", href: "/admin/system", icon: <Shield className="w-4 h-4" /> },
  { label: "White Label", href: "/admin/white-label", icon: <Palette className="w-4 h-4" /> },
  { label: "Admin Tools", href: "/admin/tools", icon: <Flag className="w-4 h-4" /> },
];

export const agencyNavItems: NavItem[] = [
  { label: "Overview", href: "/agency", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Clients", href: "/agency/clients", icon: <Users className="w-4 h-4" /> },
  { label: "Credits", href: "/agency/credits", icon: <Zap className="w-4 h-4" /> },
  { label: "White Label", href: "/agency/white-label", icon: <Palette className="w-4 h-4" /> },
  { label: "Analytics", href: "/agency/analytics", icon: <Activity className="w-4 h-4" /> },
  { label: "Settings", href: "/agency/settings", icon: <Settings className="w-4 h-4" /> },
];

export const customerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Performance", href: "/dashboard/performance", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "AI Agents", href: "/dashboard/agents", icon: <Bot className="w-4 h-4" /> },
  { label: "Voice Agents", href: "/dashboard/voice-agents", icon: <Phone className="w-4 h-4" /> },
  { label: "Chat Agents", href: "/dashboard/chat-agents", icon: <MessageSquare className="w-4 h-4" /> },
  { label: "Telephony", href: "/dashboard/telephony", icon: <Globe className="w-4 h-4" /> },
  { label: "Chat Widgets", href: "/dashboard/widgets", icon: <MessageSquare className="w-4 h-4" /> },
  { label: "Appointments", href: "/dashboard/appointments", icon: <Calendar className="w-4 h-4" />, badge: "NEW" },
  { label: "Data Marketplace", href: "/dashboard/data-marketplace", icon: <Database className="w-4 h-4" /> },
  { label: "MasterChat", href: "/dashboard/master-chat", icon: <MessageSquare className="w-4 h-4" /> },
  { label: "Sub-Accounts", href: "/dashboard/sub-accounts", icon: <UserPlus className="w-4 h-4" /> },
  { label: "Knowledge Base", href: "/dashboard/knowledge", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Credits", href: "/dashboard/credits", icon: <Zap className="w-4 h-4" /> },
  { label: "Usage", href: "/dashboard/usage", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Subscription", href: "/dashboard/subscription", icon: <CreditCard className="w-4 h-4" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-4 h-4" /> },
];
