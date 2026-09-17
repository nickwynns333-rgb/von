/**
 * VonWork Website Preview Page
 * Full modification menu + SEO upsells + AI chat upsell
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import {
  Send, Copy, Mail, Zap, Globe, Sparkles, CheckCircle2,
  MessageSquare, Lock, ExternalLink, RefreshCw, ArrowLeft,
  Monitor, Smartphone, TrendingUp, Search, Star, Calendar,
  Image, Users, ShoppingCart, Phone, BarChart3, Wand2, ChevronRight,
  Undo2, Redo2, Settings2, History, GitCompare, RotateCcw
} from "lucide-react";

// ── Upgrade / modification options ───────────────────────────────────────────
const UPGRADES = [
  {
    id: "modern",
    icon: Wand2,
    label: "More Modern Design",
    desc: "Sharper typography, dimensional gradients, micro-motion, and a premium layout.",
    price: "Free",
    priceColor: "bg-green-100 text-green-700",
    prompt: "Redesign this website with a premium contemporary aesthetic — use dimensional gradients, restrained motion, glass-depth cards, bold responsive typography, and an industry-appropriate art direction. Keep verified content intact while making the composition dramatically more polished.",
  },
  {
    id: "seo",
    icon: Search,
    label: "Add SEO Optimization",
    desc: "Meta tags, structured data, keyword-rich headings, and sitemap.",
    price: "$149/mo",
    priceColor: "bg-blue-100 text-blue-700",
    prompt: "Add comprehensive SEO optimization to this website: add proper meta title and description tags, add JSON-LD structured data (LocalBusiness schema), optimize all heading tags (H1, H2, H3) with target keywords, add alt text to images, add a canonical URL tag, add Open Graph tags for social sharing, and add a robots meta tag. Make the page content more keyword-rich for the business type.",
  },
  {
    id: "geo",
    icon: TrendingUp,
    label: "Add GEO/AEO (Get Found by AI)",
    desc: "Optimize to be cited by ChatGPT, Perplexity, Claude & Gemini.",
    price: "$299/mo",
    priceColor: "bg-purple-100 text-purple-700",
    prompt: "Optimize this website for Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO). Add an FAQ using questions grounded in the current services, improve entity clarity, add FAQPage and speakable schema, and structure concise source-backed answers. Use only facts, names, numbers, credentials, and claims already present in the website. Do not invent statistics, authority claims, awards, or named entities.",
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "Add AI Messaging",
    desc: "Website chatbot, lead capture, and limited AI phone answering.",
    price: "$199/mo",
    priceColor: "bg-indigo-100 text-indigo-700",
    prompt: "Add a fully functional AI chat widget to this website. The chat button should be a blue floating circle in the bottom-right. When clicked, it opens a chat panel with a header showing 'AI Assistant - Online', a messages area, and an input field. Pre-populate the chat with a greeting message: 'Hi! I can help answer questions about our services, pricing, and availability. What can I help you with today?' Style it professionally. The chat panel should have a close button.",
  },
  {
    id: "booking",
    icon: Calendar,
    label: "Add Online Booking",
    desc: "Appointment booking form with date/time picker and confirmation.",
    price: "$19/mo",
    priceColor: "bg-orange-100 text-orange-700",
    prompt: "Add an online booking-request section with customer name, email, phone, preferred date, preferred time, and notes. Populate service choices only from services already named on the website; if none are named, use one neutral 'Service inquiry' option. Clearly label it as a request pending confirmation, not a guaranteed appointment. Match the premium design and add a navigation link.",
  },
  {
    id: "verified_reviews",
    icon: Star,
    label: "Import Verified Reviews",
    desc: "Create a review layout only from customer-supplied, verified content.",
    price: "Free",
    priceColor: "bg-green-100 text-green-700",
    prompt: "Create a polished verified-reviews section using only review text, customer names, locations, dates, ratings, and platform badges already present in the current HTML. Never generate, rewrite, infer, or embellish a customer review or rating. If no verified review content exists, add a tasteful empty-state panel labeled 'Verified reviews can be added after owner approval' without names, quotes, stars, ratings, or testimonials.",
  },
  {
    id: "gallery",
    icon: Image,
    label: "Add Photo Gallery",
    desc: "Before/after or portfolio gallery section with lightbox.",
    price: "Free",
    priceColor: "bg-green-100 text-green-700",
    prompt: "Add a photo gallery/portfolio section to this website. Create a responsive grid of 6 gallery items with placeholder colored boxes (using CSS gradients) that represent work photos. Add labels like 'Project 1', 'Before/After', etc. Include a lightbox effect using pure CSS/JS. Style it to match the existing design. Add a 'View Our Work' heading and a brief description.",
  },
  {
    id: "team",
    icon: Users,
    label: "Add Team Section",
    desc: "Meet the team section with photos, names, and bios.",
    price: "Free",
    priceColor: "bg-green-100 text-green-700",
    prompt: "Add a premium team section using only people, roles, photos, and biographies already present in the current HTML. Do not invent names, roles, initials, photos, credentials, or biographies. If no team facts exist, add a neutral 'Meet the team' introduction with no individual profiles and make it ready for owner-supplied content.",
  },
  {
    id: "cta_bar",
    icon: Phone,
    label: "Add Sticky Call Bar",
    desc: "Sticky bottom bar with phone number and call-to-action.",
    price: "Free",
    priceColor: "bg-green-100 text-green-700",
    prompt: "Add a mobile-friendly sticky contact bar using the business phone number already present in the current HTML. Include a Call Now action and a neutral Request Information action. Do not invent a phone number or promise a free quote. Match the premium palette and preserve readable page content above the bar.",
  },
  {
    id: "verified_facts",
    icon: BarChart3,
    label: "Add Verified Business Facts",
    desc: "Highlight only owner-approved numbers, credentials, and milestones.",
    price: "Free",
    priceColor: "bg-green-100 text-green-700",
    prompt: "Add a visually striking verified-facts section using only numbers, years, certifications, service areas, credentials, or milestones already present in the current HTML. Do not invent clients served, years in business, satisfaction rates, project counts, credentials, or performance metrics. If no verified facts exist, do not add counters; add a non-quantified service-principles strip instead.",
  },
  {
    id: "ecommerce",
    icon: ShoppingCart,
    label: "Add Services Pricing",
    desc: "Pricing table for services with clear tiers and CTAs.",
    price: "$19/mo",
    priceColor: "bg-orange-100 text-orange-700",
    prompt: "Add a premium services-and-pricing section using only service names, prices, inclusions, and package labels already present in the current HTML. Do not invent prices, tiers, discounts, inclusions, or popularity claims. If no verified prices exist, present the real services with 'Request details' calls to action and no currency amounts or highlighted tier.",
  },
];

function stabilizePreviewHtml(html: string): string {
  if (!html || html.includes('id="vonwork-preview-visibility"')) return html;
  const safetyStyle = `<style id="vonwork-preview-visibility">
    .reveal,[data-reveal],.fade-up,.fade-in,.animate-in{opacity:1!important;visibility:visible!important;transform:none!important}
  </style>`;
  return html.includes("</head>") ? html.replace("</head>", `${safetyStyle}</head>`) : `${safetyStyle}${html}`;
}

export default function WebsitePreview() {
  const params = useParams<{ siteId: string }>();
  const siteId = parseInt(params.siteId ?? "0");
  const [, navigate] = useLocation();
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I'm your AI website editor. Click any upgrade below, or type a custom change — e.g. \"Make the hero headline bigger\", \"Change color to green\", \"Add a contact form\"." }
  ]);
  const [iframeKey, setIframeKey] = useState(0);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPitch, setShowPitch] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "upgrades" | "history">("upgrades");
  const [appliedUpgrades, setAppliedUpgrades] = useState<Set<string>>(new Set());
  const [compareRevisionId, setCompareRevisionId] = useState<number | null>(null);
  const [activating, setActivating] = useState(false);
  const [showActivatePlans, setShowActivatePlans] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: site, refetch: refetchSite } = trpc.websiteBuilder.getSite.useQuery(
    { siteId },
    { enabled: siteId > 0 }
  );

  const { data: revisionData, refetch: refetchRevisions } = trpc.websiteBuilder.listRevisions.useQuery(
    { siteId },
    { enabled: siteId > 0 }
  );

  const { data: pitchData } = trpc.websiteBuilder.getPitchEmail.useQuery(
    { siteId, previewBaseUrl: window.location.origin },
    { enabled: siteId > 0 && showPitch }
  );

  const chatRevise = trpc.websiteBuilder.chatRevise.useMutation({
    onSuccess: (data) => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setCompareRevisionId(null);
      setIframeKey((k) => k + 1);
      refetchSite();
      refetchRevisions();
    },
    onError: (err) => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    },
  });
  const navigateRevision = trpc.websiteBuilder.navigateRevision.useMutation({
    onSuccess: (_, variables) => {
      setCompareRevisionId(null);
      setIframeKey((key) => key + 1);
      refetchSite();
      refetchRevisions();
      toast.success(variables.direction === "undo" ? "Earlier version restored." : "Later version restored.");
    },
    onError: (error) => toast.error(error.message),
  });
  const restoreRevision = trpc.websiteBuilder.restoreRevision.useMutation({
    onSuccess: () => {
      setCompareRevisionId(null);
      setIframeKey((key) => key + 1);
      refetchSite();
      refetchRevisions();
      toast.success("Website version restored.");
    },
    onError: (error) => toast.error(error.message),
  });
  const sendPitchEmail = trpc.websiteBuilder.sendPitchEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.ownerEmail ? `Pitch notification sent! Owner: ${data.ownerEmail}` : "Pitch notification sent to your dashboard!");
    },
    onError: (err) => toast.error(`Failed to send pitch: ${err.message}`),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatRevise.isPending) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    chatRevise.mutate({ siteId, message: msg });
  };

  const applyUpgrade = (upgrade: typeof UPGRADES[0]) => {
    if (chatRevise.isPending) return;
    setChatMessages((prev) => [...prev, { role: "user", content: `Add: ${upgrade.label}` }]);
    setActiveTab("editor");
    chatRevise.mutate({ siteId, message: upgrade.prompt });
    setAppliedUpgrades((prev) => { const next = new Set(prev); next.add(upgrade.id); return next; });
  };

  const copyPitch = () => {
    if (pitchData?.pitch) {
      navigator.clipboard.writeText(pitchData.pitch);
      setPitchCopied(true);
      toast.success("Email pitch copied to clipboard!");
      setTimeout(() => setPitchCopied(false), 3000);
    }
  };

  const revisions = revisionData?.revisions ?? [];
  const activeRevision = revisions.find((revision) => revision.id === revisionData?.activeRevisionId);
  const canUndo = Boolean(activeRevision?.parentRevisionId);
  const canRedo = revisions.some((revision) => revision.parentRevisionId === revisionData?.activeRevisionId);
  const comparisonRevision = compareRevisionId
    ? revisions.find((revision) => revision.id === compareRevisionId)
    : null;
  let generationMeta: Record<string, any> = {};
  try { generationMeta = JSON.parse(site?.description ?? "{}"); } catch {}
  const activeEngine = activeRevision?.engine ?? generationMeta.generationEngine;
  const activeModel = activeRevision?.model ?? generationMeta.generationModel;
  const manuscriptGenerated = activeEngine === "MANUS_INTERNAL" || generationMeta.aiGenerationStatus === "MANUS_GENERATED";

  const handleActivate = async (plan: string = "hosting") => {
    setActivating(true);
    try {
      const resp = await fetch("/api/checkout/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, plan, userEmail: "", userName: "" }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Checkout failed");
      }
    } catch (e) {
      toast.error("Failed to start checkout");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA] overflow-hidden">
      {/* Top bar */}
      <header className="min-h-14 shrink-0 flex items-center justify-between gap-2 px-2 py-2 md:px-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Button variant="ghost" size="sm" className="shrink-0 text-gray-600 gap-1.5 px-2 md:px-3" onClick={() => navigate("/website-builder")}>
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="hidden sm:block h-5 w-px bg-gray-200" />
          <div className="hidden sm:flex min-w-0 items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1A6FFF] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm truncate max-w-48">
              {site?.businessName ?? "Loading..."}
            </span>
            <Badge className={manuscriptGenerated ? "bg-violet-100 text-violet-700 border-violet-200 text-xs" : "bg-amber-100 text-amber-700 border-amber-200 text-xs"}>
              {manuscriptGenerated ? "Manus Studio" : "Premium Fallback"}
            </Badge>
            {activeModel && (
              <Badge className="hidden xl:inline-flex bg-gray-100 text-gray-600 border-gray-200 text-[10px] max-w-56 truncate">
                {activeModel}
              </Badge>
            )}
            {site?.planStatus !== "paid" && (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Demo</Badge>
            )}
            {appliedUpgrades.size > 0 && (
              <Badge className="bg-[#1A6FFF]/10 text-[#1A6FFF] border-[#1A6FFF]/20 text-xs">
                {appliedUpgrades.size} upgrade{appliedUpgrades.size > 1 ? "s" : ""} added
              </Badge>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1 md:gap-2 overflow-x-auto">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("desktop")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "desktop" ? "bg-white shadow-sm text-[#1A6FFF]" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "mobile" ? "bg-white shadow-sm text-[#1A6FFF]" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700 gap-1.5 px-2 md:px-3"
            onClick={() => { setShowPitch(true); sendPitchEmail.mutate({ siteId, previewBaseUrl: window.location.origin }); }}
          >
            <Mail className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Email Pitch</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700"
            onClick={() => navigateRevision.mutate({ siteId, direction: "undo" })}
            disabled={!canUndo || navigateRevision.isPending}
            title="Undo last change"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700"
            onClick={() => navigateRevision.mutate({ siteId, direction: "redo" })}
            disabled={!canRedo || navigateRevision.isPending}
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700 gap-1.5 px-2 md:px-3"
            onClick={() => navigate(`/site-admin/${siteId}`)}
          >
            <Settings2 className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Manage</span>
          </Button>
          <Button
            size="sm"
            className="shrink-0 bg-gradient-to-r from-[#1A6FFF] to-[#3B8BFF] text-white font-bold gap-1.5 shadow-sm px-2 md:px-3"
            onClick={() => setShowActivatePlans(true)}
          >
            <Zap className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Activate —</span> $29/mo
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:flex-row">
        {/* Preview iframe */}
        <div className="flex-1 min-h-[48vh] flex flex-col overflow-hidden bg-gray-200 p-2 md:min-h-0 md:p-4">
          <div className={`mx-auto grid h-full w-full gap-3 transition-all duration-300 ${comparisonRevision ? "md:grid-cols-2" : "grid-cols-1"} ${viewMode === "mobile" && !comparisonRevision ? "max-w-[390px]" : ""}`}>
            <div className="bg-white rounded-xl overflow-hidden h-full shadow-lg border border-gray-300">
              <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 border border-gray-200 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  {site?.businessName ? `${site.businessName.toLowerCase().replace(/\s+/g, "-")}.vonwork.site` : "preview.vonwork.site"}
                </div>
                <button onClick={() => setIframeKey((k) => k + 1)} className="text-gray-400 hover:text-gray-600">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              {site?.generatedHtml ? (
                <iframe
                  key={iframeKey}
                  srcDoc={stabilizePreviewHtml(site.generatedHtml)}
                  className="w-full h-full border-0"
                  title="Website Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 animate-pulse text-[#1A6FFF]" />
                    <p className="font-semibold">Loading preview...</p>
                  </div>
                </div>
              )}
            </div>
            {comparisonRevision?.htmlAfter && (
              <div className="hidden h-full overflow-hidden rounded-xl border border-violet-300 bg-white shadow-lg md:block">
                <div className="flex items-center justify-between border-b border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">
                  <span>Compare version {comparisonRevision.id}</span>
                  <button onClick={() => setCompareRevisionId(null)} className="text-violet-600 hover:text-violet-900">Close</button>
                </div>
                <iframe
                  srcDoc={stabilizePreviewHtml(comparisonRevision.htmlAfter)}
                  className="h-full w-full border-0"
                  title={`Website version ${comparisonRevision.id}`}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="h-[42vh] w-full shrink-0 flex flex-col bg-white border-t border-gray-200 overflow-hidden md:h-auto md:w-80 md:border-l md:border-t-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 shrink-0">
            <button
              onClick={() => setActiveTab("upgrades")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${activeTab === "upgrades" ? "text-[#1A6FFF] border-b-2 border-[#1A6FFF]" : "text-gray-500 hover:text-gray-700"}`}
            >
              ✨ Add Features
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${activeTab === "editor" ? "text-[#1A6FFF] border-b-2 border-[#1A6FFF]" : "text-gray-500 hover:text-gray-700"}`}
            >
              💬 AI Editor
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${activeTab === "history" ? "text-[#1A6FFF] border-b-2 border-[#1A6FFF]" : "text-gray-500 hover:text-gray-700"}`}
            >
              ◷ Versions
            </button>
          </div>

          {/* Upgrades tab */}
          {activeTab === "upgrades" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-gray-500 font-medium pb-1">Click any feature to add it to the website instantly:</p>
              {UPGRADES.map((upgrade) => {
                const applied = appliedUpgrades.has(upgrade.id);
                return (
                  <button
                    key={upgrade.id}
                    onClick={() => !applied && applyUpgrade(upgrade)}
                    disabled={chatRevise.isPending || applied}
                    className={`w-full text-left rounded-xl border p-3 transition-all group ${
                      applied
                        ? "border-green-200 bg-green-50 cursor-default"
                        : "border-gray-200 hover:border-[#1A6FFF]/40 hover:bg-[#1A6FFF]/5 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${applied ? "bg-green-100" : "bg-gray-100 group-hover:bg-[#1A6FFF]/10"}`}>
                        {applied
                          ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                          : <upgrade.icon className="w-4 h-4 text-gray-600 group-hover:text-[#1A6FFF]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`font-bold text-xs ${applied ? "text-green-700" : "text-gray-900"}`}>
                            {applied ? "✓ " : ""}{upgrade.label}
                          </span>
                          <Badge className={`text-xs ml-auto shrink-0 ${upgrade.priceColor}`}>
                            {upgrade.price}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{upgrade.desc}</p>
                      </div>
                      {!applied && (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1A6FFF] shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}

              {chatRevise.isPending && (
                <div className="bg-[#1A6FFF]/5 border border-[#1A6FFF]/20 rounded-xl p-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1A6FFF] animate-pulse shrink-0" />
                  <span className="text-xs text-[#1A6FFF] font-medium">AI is updating your website...</span>
                </div>
              )}
            </div>
          )}

          {/* AI Editor tab */}
          {activeTab === "editor" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-[#1A6FFF] text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatRevise.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#1A6FFF]" /> Updating website...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Describe a change..."
                    className="border-gray-200 text-sm text-gray-900"
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    disabled={chatRevise.isPending}
                  />
                  <Button
                    size="sm"
                    className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white shrink-0"
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatRevise.isPending}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Free to edit. Paid features activate on the live site.</p>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <History className="h-4 w-4" /> Persistent version history
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">Every accepted Manus revision is saved. Compare any version, then restore it without deleting the others.</p>
              </div>
              {revisions.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-xs text-gray-500">No saved versions yet.</div>
              )}
              {[...revisions].reverse().map((revision, index) => {
                const active = revision.id === revisionData?.activeRevisionId;
                const comparing = revision.id === compareRevisionId;
                return (
                  <article key={revision.id} className={`rounded-xl border p-3 ${active ? "border-green-300 bg-green-50" : comparing ? "border-violet-300 bg-violet-50" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-extrabold text-gray-900">Version {revisions.length - index}</span>
                          {active && <Badge className="bg-green-100 text-green-700 text-[10px]">Current</Badge>}
                          <Badge className="bg-blue-100 text-blue-700 text-[10px]">{revision.engine ?? "MANUS_INTERNAL"}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">{revision.instruction}</p>
                        <p className="mt-1 truncate text-[10px] text-gray-400">{revision.model ?? "Internal Manus"} · {revision.createdAt ? new Date(revision.createdAt).toLocaleString() : "Saved version"}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 border-violet-200 text-xs text-violet-700"
                        onClick={() => setCompareRevisionId(comparing ? null : revision.id)}
                      >
                        <GitCompare className="h-3 w-3" /> {comparing ? "Close" : "Compare"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 border-gray-200 text-xs"
                        disabled={active || restoreRevision.isPending}
                        onClick={() => restoreRevision.mutate({ siteId, revisionId: revision.id })}
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Bottom activation cards */}
          <div className="border-t border-gray-100 p-3 space-y-2 shrink-0">
            <div className="bg-gradient-to-r from-[#1A6FFF]/5 to-[#5BA3FF]/5 border border-[#1A6FFF]/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-[#1A6FFF]" />
                <span className="font-bold text-gray-900 text-xs">Activate Hosting</span>
                <Badge className="bg-[#1A6FFF] text-white text-xs ml-auto">$29/mo</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-2">Website Only: go live with custom domain + SSL.</p>
              <Button
                size="sm"
                className="w-full bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold text-xs"
                onClick={() => setShowActivatePlans(true)}
              >
                <Zap className="w-3 h-3 mr-1" /> Activate Website
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Pitch Modal */}
      {showPitch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#1A6FFF]" />
                <h3 className="font-bold text-gray-900">Email Pitch</h3>
              </div>
              <button onClick={() => setShowPitch(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-gray-600 mb-4">Copy this email and send it to the business owner. The preview link is already included.</p>
              {pitchData?.ownerEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 text-sm">
                  <span className="font-semibold text-blue-700">To:</span> <span className="text-blue-900">{pitchData.ownerEmail}</span>
                </div>
              )}
              <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {pitchData?.pitch ?? "Loading pitch..."}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <Button
                className="flex-1 bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold gap-2"
                onClick={copyPitch}
              >
                {pitchCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {pitchCopied ? "Copied!" : "Copy Email"}
              </Button>
              {pitchData?.ownerEmail && (
                <Button
                  variant="outline"
                  className="border-gray-200 gap-2"
                  onClick={() => window.open(`mailto:${pitchData.ownerEmail}?subject=We rebuilt your website — free preview inside&body=${encodeURIComponent(pitchData.pitch ?? "")}`, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" /> Open in Email
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Activate Plans Modal */}
      {showActivatePlans && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowActivatePlans(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Activate Your Website</h2>
            <p className="text-gray-500 text-sm mb-5">Choose a plan to go live. Cancel anytime.</p>
            <div className="space-y-3">
              {[
                { plan: "website_only", label: "Website Only", price: "$29/mo", desc: "Live website, SSL, custom domain, and secure back-office", highlight: false },
                { plan: "ai_messaging", label: "AI Messaging", price: "$199/mo", desc: "Website Only + chatbot, lead capture, and 100 AI phone-answering min/mo", highlight: true },
              ].map((p) => (
                <button
                  key={p.plan}
                  onClick={() => { setShowActivatePlans(false); handleActivate(p.plan); }}
                  disabled={activating}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${p.highlight ? "border-[#1A6FFF] bg-[#1A6FFF]/5" : "border-gray-200 hover:border-[#1A6FFF]/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{p.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-extrabold text-[#1A6FFF]">{p.price}</div>
                      {p.highlight && <div className="text-xs text-[#1A6FFF] font-semibold">Most Popular</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowActivatePlans(false)} className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
