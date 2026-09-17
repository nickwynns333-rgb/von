/**
 * VonWork AI Website Rebuilder
 * Paste a URL → AI rebuilds it → email the owner the pitch
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Globe, Sparkles, Zap, Mail, Eye, CheckCircle2,
  ArrowRight, Star, Shield, Rocket
} from "lucide-react";

const INDUSTRIES = [
  "HVAC", "Plumbing", "Roofing", "Landscaping", "Auto Repair",
  "Dental", "Medical", "Law Firm", "Real Estate", "Restaurant",
  "Salon / Spa", "Gym / Fitness", "Cleaning Service", "Electrician",
  "Contractor", "Insurance", "Accounting", "Retail Store", "Other"
];

export default function WebsiteRebuilder() {
  const [, navigate] = useLocation();
  const [url, setUrl] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [step, setStep] = useState<"input" | "generating" | "done">("input");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  const rebuildMutation = trpc.websiteBuilder.rebuildFromUrl.useMutation({
    onSuccess: (data) => {
      setStep("done");
      const manusGenerated = data.aiGenerationStatus === "MANUS_GENERATED";
      toast[manusGenerated ? "success" : "warning"](
        manusGenerated
          ? `Internal Manus website complete${data.generationModel ? ` · ${data.generationModel}` : ""}. Your premium preview is ready.`
          : "The internal draft did not pass VonWork's premium quality gate, so the polished premium renderer was used instead."
      );
      navigate(`/website-preview/${data.siteId}`);
    },
    onError: (err) => {
      setStep("input");
      toast.error(err.message || "Failed to rebuild website. Please check the URL and try again.");
    },
  });

  const handleRebuild = async () => {
    if (!url.trim()) { toast.error("Please enter a website URL"); return; }
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;

    setStep("generating");
    setProgress(0);

    // Simulate progress while AI works
    const msgs = [
      "Fetching your existing website...",
      "Analyzing content and structure...",
      "Extracting business information...",
      "Designing your new layout...",
      "Writing modern HTML & CSS...",
      "Adding AI chat widget...",
      "Finalizing your new website...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < msgs.length) {
        setProgressMsg(msgs[i]);
        setProgress(Math.round((i + 1) / msgs.length * 85));
        i++;
      }
    }, 2500);

    try {
      await rebuildMutation.mutateAsync({ url: cleanUrl, ownerEmail: ownerEmail || undefined, ownerName: ownerName || undefined });
    } finally {
      clearInterval(interval);
      setProgress(100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF4FF] via-white to-[#F0F7FF]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A6FFF] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">VonWork</span>
          <Badge className="bg-[#1A6FFF]/10 text-[#1A6FFF] border-[#1A6FFF]/20 text-xs">AI Website Rebuilder</Badge>
        </div>
        <Button variant="outline" size="sm" className="border-gray-200 text-gray-700" onClick={() => navigate("/dashboard")}>
          Dashboard
        </Button>
      </nav>

      {step === "input" && (
        <>
          {/* Hero */}
          <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
            <div className="inline-flex items-center gap-2 bg-[#1A6FFF]/10 text-[#1A6FFF] text-xs font-bold px-4 py-1.5 rounded-full mb-6 border border-[#1A6FFF]/20">
              <Sparkles className="w-3.5 h-3.5" />
              BUILD A FREE DEMO — No credit card required
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-5">
              Rebuild Any Website<br />
              <span className="bg-gradient-to-r from-[#1A6FFF] to-[#5BA3FF] bg-clip-text text-transparent">
                with AI in 60 Seconds
              </span>
            </h1>
            <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto mb-4">
              Paste any business website URL. Our AI rebuilds it as a stunning, modern site — then you email the owner the preview as a pitch. They choose Website Only at $29/month or AI Messaging at $199/month.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 font-medium mb-10">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Free to generate</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Website Only: $29/month</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> AI Messaging: $199/month</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Email pitch included</span>
            </div>

            {/* Main form card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 text-left max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-[#1A6FFF]" />
                <h2 className="font-bold text-gray-900 text-lg">Enter the website URL to rebuild</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">Website URL *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example-business.com"
                      className="border-gray-200 text-gray-900 flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleRebuild()}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Paste any business website — we'll scrape and rebuild it automatically</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">Owner Email (optional)</Label>
                    <Input
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@business.com"
                      type="email"
                      className="border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-400 mt-1">For the email pitch</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">Owner Name (optional)</Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="John Smith"
                      className="border-gray-200 text-gray-900"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRebuild}
                  disabled={!url.trim() || rebuildMutation.isPending}
                  className="w-full bg-gradient-to-r from-[#1A6FFF] to-[#3B8BFF] hover:from-[#0052CC] hover:to-[#1A6FFF] text-white font-bold text-base py-3 rounded-xl shadow-lg shadow-[#1A6FFF]/30 transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Build Free Website Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-3">How It Works</h2>
            <p className="text-gray-600 text-center font-medium mb-10">Three steps from old website to paid customer</p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", icon: Globe, title: "Paste Their URL", desc: "Enter any business website URL. Our AI fetches the page and extracts all their content, services, and contact info.", color: "bg-blue-50 text-blue-600 border-blue-100" },
                { step: "2", icon: Sparkles, title: "AI Rebuilds It", desc: "In 60 seconds, AI generates a modern website using the business content and a private demo link.", color: "bg-purple-50 text-purple-600 border-purple-100" },
                { step: "3", icon: Mail, title: "Email the Pitch", desc: "Copy the ready-made email pitch. The owner chooses Website Only at $29/month or AI Messaging at $199/month.", color: "bg-green-50 text-green-600 border-green-100" },
              ].map((item) => (
                <div key={item.step} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Step {item.step}</div>
                  <h3 className="font-extrabold text-gray-900 text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section className="max-w-4xl mx-auto px-6 pb-20">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">Simple Pricing</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {[
                { name: "Website Only", price: "$29/mo", desc: "Activate the website with secure hosting and business controls.", features: ["Live website hosting", "Custom domain support", "SSL certificate", "Secure back-office", "Mobile responsive"], highlight: false },
                { name: "AI Messaging", price: "$199/mo", desc: "Website chatbot and limited AI phone answering in one package.", features: ["Everything in Website Only", "Website chatbot", "Lead capture + routing", "100 AI phone-answering min/mo", "Chat history"], highlight: true },
              ].map((plan) => (
                <div key={plan.name} className={`rounded-2xl border p-6 ${plan.highlight ? "border-[#1A6FFF] shadow-lg shadow-[#1A6FFF]/10 bg-white" : "border-gray-200 bg-white"}`}>
                  {plan.highlight && (
                    <div className="bg-[#1A6FFF] text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">MOST POPULAR</div>
                  )}
                  <h3 className="font-extrabold text-gray-900 text-lg">{plan.name}</h3>
                  <div className="text-3xl font-extrabold text-gray-900 mt-2 mb-1">{plan.price}</div>
                  <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full font-bold ${plan.highlight ? "bg-[#1A6FFF] hover:bg-[#0052CC] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                    onClick={() => document.querySelector("input")?.focus()}
                  >
                    {`Choose ${plan.name}`}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Generating state */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1A6FFF]/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-[#1A6FFF] animate-pulse" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Rebuilding Your Website</h2>
            <p className="text-gray-500 mb-8">Our AI is working its magic. This takes about 30–60 seconds.</p>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1A6FFF] to-[#5BA3FF] rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 font-medium">{progressMsg || "Starting..."}</p>

            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              {[
                { icon: Globe, label: "Scraping" },
                { icon: Sparkles, label: "Rebuilding" },
                { icon: Eye, label: "Previewing" },
              ].map((item, i) => (
                <div key={i} className={`flex flex-col items-center gap-1 ${progress > i * 33 ? "opacity-100" : "opacity-30"} transition-opacity`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${progress > i * 33 ? "bg-[#1A6FFF]/10" : "bg-gray-100"}`}>
                    <item.icon className={`w-4 h-4 ${progress > i * 33 ? "text-[#1A6FFF]" : "text-gray-400"}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
