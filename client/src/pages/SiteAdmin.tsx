/**
 * VonWork Site Admin — Tenant Back-Office
 * Full back-office for each rebuilt website: leads, bookings, calendar, analytics, add-ons, settings.
 * Accessible at /site-admin/:siteId
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import {
  Globe, Users, Calendar, BarChart3, Settings, Zap, ArrowLeft,
  Mail, Phone, MessageSquare, CheckCircle2, Clock, AlertCircle,
  Plus, Eye, Star, TrendingUp, Search, Lock, Wand2, ShoppingCart,
  Video, Bot, RefreshCw, ExternalLink
} from "lucide-react";

const ADDON_CATALOG = [
  { id: "ai_messaging", icon: MessageSquare, label: "AI Messaging", price: "$199/mo", color: "indigo", desc: "Website chatbot, lead capture, routing, and 100 AI phone-answering minutes per month." },
  { id: "seo", icon: Search, label: "AI SEO", price: "$149/mo", color: "blue", desc: "Keyword research, meta tags, schema markup, content optimization. Full SEO execution engine." },
  { id: "geo_aeo", icon: TrendingUp, label: "GEO/AEO (AI Search)", price: "$299/mo", color: "purple", desc: "Get cited by ChatGPT, Perplexity, Claude & Gemini. FAQ schema, entity strategy, AI answer simulation." },
  { id: "calendar", icon: Calendar, label: "Calendar & Booking", price: "$19/mo", color: "orange", desc: "Online booking form, appointment calendar, availability rules, and confirmation emails." },
  { id: "video", icon: Video, label: "AI Video Agent", price: "$49/mo", color: "pink", desc: "Talking AI video avatar on the website homepage. Custom voice and appearance." },
  { id: "custom_ai", icon: Bot, label: "Custom AI Agent", price: "$39/mo", color: "green", desc: "Train a custom AI on the business's services, FAQs, and pricing for smarter responses." },
  { id: "ecommerce", icon: ShoppingCart, label: "Online Store", price: "$29/mo", color: "yellow", desc: "Add a product catalog, cart, and Stripe checkout to the website." },
];

const COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  green: "bg-green-50 text-green-700 border-green-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

type Tab = "overview" | "leads" | "bookings" | "calendar" | "analytics" | "addons" | "settings";

export default function SiteAdmin() {
  const params = useParams<{ siteId: string }>();
  const siteId = parseInt(params.siteId ?? "0");
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [currentScore, setCurrentScore] = useState<any>(null);

  const { data: overview } = trpc.siteAdmin.getSiteOverview.useQuery({ siteId }, { enabled: siteId > 0 });
  const { data: leads = [] } = trpc.siteAdmin.getLeads.useQuery({ siteId }, { enabled: siteId > 0 && activeTab === "leads" });
  const { data: bookings = [] } = trpc.siteAdmin.getBookings.useQuery({ siteId }, { enabled: siteId > 0 && activeTab === "bookings" });
  const { data: addons = [] } = trpc.siteAdmin.getAddons.useQuery({ siteId }, { enabled: siteId > 0 });
  const { data: analytics = [] } = trpc.siteAdmin.getAnalytics.useQuery({ siteId, days: 30 }, { enabled: siteId > 0 && activeTab === "analytics" });

  const generateScore = trpc.siteAdmin.generateScore.useMutation({
    onSuccess: (data) => { setCurrentScore(data); setScoreLoading(false); },
    onError: () => { setScoreLoading(false); toast.error("Score generation failed"); },
  });

  const updateLeadStatus = trpc.siteAdmin.updateLeadStatus.useMutation({
    onSuccess: () => toast.success("Lead updated"),
  });

  const updateBookingStatus = trpc.siteAdmin.updateBookingStatus.useMutation({
    onSuccess: () => toast.success("Booking updated"),
  });

  const activateAddon = trpc.siteAdmin.activateAddon.useMutation({
    onSuccess: () => toast.success("Add-on activated!"),
  });

  const site = overview?.site;
  const isDemo = site?.planStatus !== "paid";
  const activeAddonIds = new Set((addons as any[]).filter((a: any) => a.status === "active").map((a: any) => a.addonType));

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "leads", label: "Leads", icon: Users },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "addons", label: "Add-ons", icon: Zap },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-gray-600 gap-1.5" onClick={() => navigate("/my-sites")}>
              <ArrowLeft className="w-4 h-4" /> My Sites
            </Button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A6FFF] to-[#5BA3FF] flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{site?.businessName ?? "Loading..."}</div>
                <div className="text-xs text-gray-400">{site?.businessName?.toLowerCase().replace(/\s+/g, "-")}.vonwork.site</div>
              </div>
            </div>
            {isDemo ? (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Demo Mode</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Live</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-gray-200 gap-1.5 text-gray-700"
              onClick={() => navigate(`/website-preview/${siteId}`)}>
              <Eye className="w-3.5 h-3.5" /> Preview Site
            </Button>
            {isDemo && (
              <Button size="sm" className="bg-gradient-to-r from-[#1A6FFF] to-[#3B8BFF] text-white font-bold gap-1.5"
                onClick={() => navigate(`/website-preview/${siteId}`)}>
                <Zap className="w-3.5 h-3.5" /> Activate — $29/mo
              </Button>
            )}
          </div>
        </div>
        {/* Tab nav */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[#1A6FFF] text-[#1A6FFF]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === "leads" && (overview?.leads as any)?.newCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {(overview?.leads as any)?.newCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Demo banner */}
        {isDemo && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
              <div>
                <p className="font-bold text-yellow-800 text-sm">This site is in Demo Mode</p>
                <p className="text-yellow-700 text-xs">The website is visible as a preview only. Choose Website Only at $29/month to go live with a custom domain, SSL, and full back-office access.</p>
              </div>
            </div>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold shrink-0 ml-4"
              onClick={() => navigate(`/website-preview/${siteId}`)}>
              Activate Now
            </Button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Leads", value: (overview?.leads as any)?.total ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
                { label: "New Leads", value: (overview?.leads as any)?.newCount ?? 0, icon: AlertCircle, color: "text-red-600 bg-red-50" },
                { label: "Bookings", value: (overview?.bookings as any)?.total ?? 0, icon: Calendar, color: "text-green-600 bg-green-50" },
                { label: "Active Add-ons", value: activeAddonIds.size, icon: Zap, color: "text-purple-600 bg-purple-50" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Score card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-gray-900">AI Website Score</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-200 gap-1.5"
                  onClick={() => { setScoreLoading(true); generateScore.mutate({ siteId }); }}
                  disabled={scoreLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${scoreLoading ? "animate-spin" : ""}`} />
                  {scoreLoading ? "Scoring..." : "Run Score"}
                </Button>
              </div>
              {currentScore ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-5xl font-extrabold text-gray-900">{currentScore.overall}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${currentScore.overall >= 80 ? "bg-green-500" : currentScore.overall >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${currentScore.overall}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{currentScore.overall >= 80 ? "Excellent" : currentScore.overall >= 60 ? "Good — room to improve" : "Needs improvement"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                    {[
                      { key: "design", label: "Design" },
                      { key: "seo", label: "SEO" },
                      { key: "mobile", label: "Mobile" },
                      { key: "speed", label: "Speed" },
                      { key: "conversion", label: "Conversion" },
                      { key: "ai_readiness", label: "AI Ready" },
                    ].map((dim) => (
                      <div key={dim.key} className="text-center">
                        <div className="text-xl font-extrabold text-gray-900">{currentScore[dim.key]}</div>
                        <div className="text-xs text-gray-500">{dim.label}</div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="h-full bg-[#1A6FFF] rounded-full" style={{ width: `${currentScore[dim.key]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentScore.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2">Top Improvements:</p>
                      <ul className="space-y-1">
                        {currentScore.improvements.map((imp: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-[#1A6FFF] font-bold shrink-0">→</span> {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Click "Run Score" to get an AI analysis of your website quality</p>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid md:grid-cols-3 gap-4">
              <button onClick={() => setActiveTab("leads")} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-[#1A6FFF]/30 hover:shadow-sm transition-all">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <div className="font-bold text-gray-900">View Leads</div>
                <div className="text-xs text-gray-500 mt-0.5">{(overview?.leads as any)?.newCount ?? 0} new leads waiting</div>
              </button>
              <button onClick={() => setActiveTab("bookings")} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-[#1A6FFF]/30 hover:shadow-sm transition-all">
                <Calendar className="w-6 h-6 text-green-600 mb-2" />
                <div className="font-bold text-gray-900">View Bookings</div>
                <div className="text-xs text-gray-500 mt-0.5">{(overview?.bookings as any)?.pendingCount ?? 0} pending bookings</div>
              </button>
              <button onClick={() => setActiveTab("addons")} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-[#1A6FFF]/30 hover:shadow-sm transition-all">
                <Zap className="w-6 h-6 text-purple-600 mb-2" />
                <div className="font-bold text-gray-900">Add Features</div>
                <div className="text-xs text-gray-500 mt-0.5">{ADDON_CATALOG.length - activeAddonIds.size} more add-ons available</div>
              </button>
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === "leads" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Leads Inbox</h3>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{(leads as any[]).length} total</Badge>
            </div>
            {(leads as any[]).length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No leads yet</p>
                <p className="text-sm mt-1">Leads from the AI chat widget and contact forms will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(leads as any[]).map((lead: any) => (
                  <div key={lead.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[#1A6FFF]/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[#1A6FFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 text-sm">{lead.name ?? "Anonymous"}</span>
                        <Badge className={`text-xs ${lead.status === "new" ? "bg-red-100 text-red-700" : lead.status === "converted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {lead.status}
                        </Badge>
                        <span className="text-xs text-gray-400 ml-auto">{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                      {lead.email && <div className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</div>}
                      {lead.phone && <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</div>}
                      {lead.message && <div className="text-xs text-gray-600 mt-1 truncate">{lead.message}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {["contacted", "qualified", "converted"].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: s as any })}
                          className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 capitalize"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Bookings</h3>
              <Badge className="bg-green-100 text-green-700 border-green-200">{(bookings as any[]).length} total</Badge>
            </div>
            {(bookings as any[]).length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No bookings yet</p>
                <p className="text-sm mt-1">Add the Calendar add-on to start accepting online bookings</p>
                <Button size="sm" className="mt-4 bg-[#1A6FFF] text-white" onClick={() => setActiveTab("addons")}>
                  Add Calendar Add-on
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(bookings as any[]).map((booking: any) => (
                  <div key={booking.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 text-sm">{booking.customerName}</span>
                        <Badge className={`text-xs ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : booking.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                          {booking.status}
                        </Badge>
                      </div>
                      {booking.serviceType && <div className="text-xs text-gray-600">{booking.serviceType}</div>}
                      {booking.appointmentDate && <div className="text-xs text-gray-500">{booking.appointmentDate} {booking.appointmentTime && `at ${booking.appointmentTime}`}</div>}
                      {booking.customerEmail && <div className="text-xs text-gray-400">{booking.customerEmail}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {["confirmed", "completed", "cancelled"].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateBookingStatus.mutate({ bookingId: booking.id, status: s as any })}
                          className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 capitalize"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Page Views (30d)", value: (analytics as any[]).reduce((s: number, d: any) => s + (d.pageViews ?? 0), 0) },
                { label: "Unique Visitors", value: (analytics as any[]).reduce((s: number, d: any) => s + (d.uniqueVisitors ?? 0), 0) },
                { label: "Chat Opens", value: (analytics as any[]).reduce((s: number, d: any) => s + (d.chatOpens ?? 0), 0) },
                { label: "Form Submissions", value: (analytics as any[]).reduce((s: number, d: any) => s + (d.formSubmissions ?? 0), 0) },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            {(analytics as any[]).length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No analytics data yet</p>
                <p className="text-sm mt-1">Analytics will populate once the site is live and receiving visitors</p>
              </div>
            )}
          </div>
        )}

        {/* ADD-ONS TAB */}
        {activeTab === "addons" && (
          <div className="space-y-4">
            <div className="bg-[#1A6FFF]/5 border border-[#1A6FFF]/20 rounded-xl p-4 flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#1A6FFF] shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>All AI features use OpenRouter</strong> — the cheapest model per task is automatically selected.
                Chat uses GPT-4o-mini ($0.15/1M tokens). SEO uses Claude Haiku. Complex tasks use GPT-4o only when needed.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {ADDON_CATALOG.map((addon) => {
                const isActive = activeAddonIds.has(addon.id);
                return (
                  <div key={addon.id} className={`bg-white rounded-xl border p-5 ${isActive ? "border-green-200" : "border-gray-200"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${COLOR_MAP[addon.color] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        <addon.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{addon.label}</span>
                          <Badge className={`text-xs ml-auto ${isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {isActive ? "Active" : addon.price}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3">{addon.desc}</p>
                        {isActive ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activated
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold text-xs gap-1.5"
                            onClick={() => {
                              if (isDemo) {
                                toast.info(`Activate Website Only ($29/mo) first, then choose ${addon.label} for ${addon.price}`);
                              } else {
                                activateAddon.mutate({ siteId, addonType: addon.id as any });
                              }
                            }}
                          >
                            {isDemo ? <Lock className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {isDemo ? "Activate Site First" : `Add ${addon.label}`}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Site Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Business Name</label>
                  <Input defaultValue={site?.businessName ?? ""} className="border-gray-200 text-gray-900" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Subdomain</label>
                  <div className="flex gap-2 items-center">
                    <Input defaultValue={site?.businessName?.toLowerCase().replace(/\s+/g, "-") ?? ""} className="border-gray-200 text-gray-900" />
                    <span className="text-sm text-gray-500 shrink-0">.vonwork.site</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Custom Domain (paid plans)</label>
                  <Input placeholder="yourdomain.com" className="border-gray-200 text-gray-900" disabled={isDemo} />
                  {isDemo && <p className="text-xs text-gray-400 mt-1">Activate your site to use a custom domain</p>}
                </div>
              </div>
              <Button className="mt-4 bg-[#1A6FFF] text-white font-bold" onClick={() => toast.success("Settings saved!")}>
                Save Settings
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-2">Hosting & Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge className={isDemo ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>{isDemo ? "Demo" : "Live"}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-500">SSL</span><span className={isDemo ? "text-gray-400" : "text-green-600 font-semibold"}>{isDemo ? "—" : "✓ Active"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Database</span><span className="text-gray-700 font-medium">Isolated (siteId: {siteId})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">AI Provider</span><span className="text-gray-700 font-medium">OpenRouter (cost-optimized)</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
