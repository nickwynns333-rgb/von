import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, LogOut, Bot, Phone, MessageSquare, Calendar,
  BarChart3, Brain, TrendingUp, BookOpen, ShoppingBag, Settings,
  DollarSign, Globe, Inbox, Building2, CreditCard, Scale, Banknote,
  Zap, Megaphone, PhoneCall, Radio, BookMarked, Users, ChevronDown,
  ChevronRight, Menu, Bell, Wrench, Sparkles, Star, PhoneIncoming,
  Briefcase, TrendingUpIcon, Cpu, Shield, Wand2, Search
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { BrandMark } from "./BrandMark";

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

type NavGroup = {
  title: string;
  icon: React.ElementType;
  landingPath: string;   // clicking the heading navigates here
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    landingPath: "/dashboard",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
    ],
  },
  {
    title: "AI Agents",
    icon: Bot,
    landingPath: "/agents",
    items: [
      { icon: Bot, label: "Chat Agents", path: "/agents" },
      { icon: Phone, label: "Voice Agents", path: "/telephony-agents" },
      { icon: MessageSquare, label: "Chat Widgets", path: "/chat-widgets" },
      { icon: Brain, label: "Memory Brain", path: "/memory" },
    ],
  },
  {
    title: "AI Call Center",
    icon: PhoneIncoming,
    landingPath: "/call-center",
    items: [
      { icon: Inbox, label: "Inbox", path: "/communications" },
      { icon: PhoneCall, label: "Call Center", path: "/call-center" },
      { icon: Radio, label: "Broadcast", path: "/broadcast" },
      { icon: Calendar, label: "Appointments", path: "/appointments" },
    ],
  },
  {
    title: "AI Services",
    icon: Briefcase,
    landingPath: "/crm",
    items: [
      { icon: Building2, label: "CRM", path: "/crm" },
      { icon: Zap, label: "AI Sales", path: "/sales" },
      { icon: Megaphone, label: "Marketing", path: "/marketing" },
      { icon: CreditCard, label: "Collections", path: "/collections" },
    ],
  },
  {
    title: "AI Accounting CFO",
    icon: DollarSign,
    landingPath: "/aicfo",
    items: [
      { icon: DollarSign, label: "AI CFO", path: "/aicfo" },
      { icon: BookMarked, label: "Accounting", path: "/accounting" },
      { icon: Banknote, label: "Payroll", path: "/payroll" },
      { icon: Scale, label: "Legal", path: "/legal" },
    ],
  },
  {
    title: "AI SEO & Growth",
    icon: TrendingUp,
    landingPath: "/seo",
    items: [
      { icon: TrendingUp, label: "AI SEO", path: "/seo" },
      { icon: BookOpen, label: "Knowledge Base", path: "/knowledge-base" },
      { icon: Globe, label: "Indian Team", path: "/indian-team" },
    ],
  },
  {
    title: "AI Field Service",
    icon: Wrench,
    landingPath: "/fsm",
    items: [
      { icon: Wrench, label: "FSM Hub", path: "/fsm" },
      { icon: LayoutDashboard, label: "Job Board", path: "/fsm/jobs" },
      { icon: Sparkles, label: "AI Pre-Calls", path: "/fsm/pre-calls" },
      { icon: Star, label: "Customer Reports", path: "/fsm/reports" },
      { icon: Users, label: "Technicians", path: "/fsm/technicians" },
    ],
  },
  {
    title: "VON WORK",
    icon: Shield,
    landingPath: "/vonwork",
    items: [
      { icon: Shield, label: "Qualification Hub", path: "/vonwork" },
    ],
  },
  {
    title: "Platform",
    icon: Cpu,
    landingPath: "/agency",
    items: [
      { icon: ShoppingBag, label: "Marketplace", path: "/marketplace" },
      { icon: Users, label: "Agency", path: "/agency" },
      { icon: Settings, label: "Settings", path: "/settings" },
      { icon: Wand2, label: "Website Rebuilder", path: "/website-builder" },
      { icon: Globe, label: "My Rebuilt Sites", path: "/my-sites" },
      { icon: Search, label: "Website Prospecting", path: "/prospecting" },
      { icon: MessageSquare, label: "Social AI Control", path: "/social-control" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center text-foreground">
              Sign in to VonWork
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access your AI Business OS dashboard. Sign in to continue.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track which groups are expanded — default all open
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navGroups.map(g => [g.title, true]))
  );

  const { data: convData = [] } = trpc.communications.listConversations.useQuery(
    { status: "open" },
    { refetchInterval: 15000 }
  );
  const unreadCount = convData.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const activeItem = navGroups.flatMap(g => g.items).find(i => i.path === location);
  const activeGroup = navGroups.find(g => g.items.some(i => i.path === location));

  const navigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        <BrandMark iconClassName="w-8 h-8" className="text-base" />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navGroups.map(group => {
          const isExpanded = expandedGroups[group.title] ?? true;
          const isGroupActive = activeGroup?.title === group.title;
          const GroupIcon = group.icon;

          return (
            <div key={group.title}>
              {/* Group heading — clickable, navigates to landing path, toggles dropdown */}
              <div
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-semibold transition-all group
                  ${isGroupActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-foreground hover:bg-primary/8 hover:text-primary"
                  }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    navigate(group.landingPath);
                    if (isGroupActive) {
                      toggleGroup(group.title);
                    } else {
                      setExpandedGroups(prev => ({ ...prev, [group.title]: true }));
                    }
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <GroupIcon className={`w-4 h-4 shrink-0 ${isGroupActive ? "text-white" : "text-primary"}`} />
                  <span className="flex-1 truncate">{group.title}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(group.title);
                  }}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${group.title}`}
                  className={`p-0.5 rounded transition-colors ${isGroupActive ? "hover:bg-white/20" : "hover:bg-primary/10"}`}
                >
                  {isExpanded
                    ? <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isGroupActive ? "text-white" : "text-muted-foreground"}`} />
                    : <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isGroupActive ? "text-white" : "text-muted-foreground"}`} />
                  }
                </button>
              </div>

              {/* Sub-items — shown when expanded */}
              {isExpanded && (
                <div className="ml-3 pl-3 border-l border-border/60 mt-0.5 mb-1 space-y-0.5">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    const showUnread = item.path === "/communications" && unreadCount > 0;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all
                          ${isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground font-normal"
                          }`}
                      >
                        <item.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {showUnread && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-secondary transition-colors text-left">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-none">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email || ""}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-card border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Blue gradient top bar */}
        <header
          className="h-14 shrink-0 flex items-center justify-between px-5 text-white shadow-sm"
          style={{ background: "radial-gradient(circle at 92% 10%, rgba(20,217,196,0.34), transparent 30%), linear-gradient(118deg, #0B1736 0%, #1647B9 46%, #246BFD 78%, #3C83FF 100%)" }}
        >
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-md hover:bg-white/20 transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight">
              {activeItem?.label ?? activeGroup?.title ?? "VonWork"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-md hover:bg-white/20 transition-colors relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full" />
              )}
            </button>
            <Avatar className="h-7 w-7 border-2 border-white/30">
              <AvatarFallback className="text-xs font-semibold bg-white/20 text-white">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#F5F7FA]">
          {children}
        </main>
      </div>
    </div>
  );
}
