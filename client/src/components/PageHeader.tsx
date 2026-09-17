import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  stats?: Array<{ label: string; value: string | number; icon?: React.ReactNode }>;
  tabs?: Array<{ label: string; value: string }>;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  breadcrumbs,
  stats,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <div
      className="px-6 pt-7 pb-0 text-white shrink-0"
      style={{ background: "radial-gradient(circle at 90% 12%, rgba(20,217,196,0.34), transparent 28%), linear-gradient(118deg, #0B1736 0%, #1647B9 46%, #246BFD 78%, #3C83FF 100%)" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3 h-3 text-blue-300" />}
                {crumb.path ? (
                  <button
                    className="text-blue-200 text-xs hover:text-white transition-colors"
                    onClick={() => setLocation(crumb.path!)}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-xs text-white font-medium">{crumb.label}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap pb-5">
          <div>
            {icon && (
              <div className="flex items-center gap-2 mb-1">
                <span className="opacity-80">{icon}</span>
                {badge && (
                  <span className="text-xs font-medium text-blue-100 uppercase tracking-widest">{badge}</span>
                )}
              </div>
            )}
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-blue-100 text-sm mt-0.5 max-w-2xl">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Stats row */}
        {stats && stats.length > 0 && (
          <div className={`grid gap-3 mb-5 grid-cols-2 md:grid-cols-${Math.min(stats.length, 4)}`}>
            {stats.map((s, i) => (
              <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
                {s.icon && <span className="text-white/70 shrink-0">{s.icon}</span>}
                <div>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-blue-100 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom children (e.g. alert banners) */}
        {children && <div className="mb-4">{children}</div>}

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-0 -mb-px mt-2">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => onTabChange?.(tab.value)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? "border-white text-white"
                    : "border-transparent text-blue-200 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
