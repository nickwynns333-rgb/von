import { Button } from "@/components/ui/button";
import { ChevronDown, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/BrandMark";

/**
 * VonWork Landing Page
 * Premium tech-forward dark aesthetic with Stripe integration
 * Design: Quantum Precision - modern minimalism with premium finishes
 */

export default function Home() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [, navigate] = useLocation();

  // No auto-redirect — show landing page to everyone.
  // Signed-in users see a "Go to Dashboard" button instead.

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqItems = [
    {
      q: "How does VonWork handle call routing?",
      a: "VonWork uses AI to intelligently route calls based on your business rules. You define workflows, and our AI handles the rest—booking appointments, collecting information, and following up automatically.",
    },
    {
      q: "Can I integrate VonWork with my existing systems?",
      a: "Yes. VonWork integrates with popular CRM, calendar, and communication platforms. We support Zapier, webhooks, and direct API integrations for seamless data flow.",
    },
    {
      q: "What if my AI employee makes a mistake?",
      a: "Our AI learns from corrections and improves over time. You can review call transcripts, adjust responses, and set escalation rules to ensure quality. Human oversight is always available.",
    },
    {
      q: "Is there a setup fee or long-term contract?",
      a: "No setup fees. No long-term contracts. You pay only for what you use—call minutes, messages, and advanced features. Cancel anytime.",
    },
    {
      q: "How many calls can VonWork handle simultaneously?",
      a: "VonWork scales automatically. Whether you receive 10 or 10,000 calls per day, our infrastructure handles it without degradation. You only pay for the minutes you use.",
    },
    {
      q: "What about data security and compliance?",
      a: "VonWork is SOC 2 compliant and HIPAA-ready. All call data is encrypted in transit and at rest. You control data retention policies and can export or delete data anytime.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <BrandMark iconClassName="h-9 w-9" className="text-xl" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-gray-600 hover:text-foreground transition">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-foreground transition">
              Pricing
            </a>
            <a href="#faq" className="text-gray-600 hover:text-foreground transition">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#0B1736] via-[#1647B9] to-[#246BFD] hover:shadow-lg hover:shadow-[#246BFD]/40"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-transparent text-foreground hover:bg-secondary"
                  onClick={() => { window.location.href = getLoginUrl(); }}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#0B1736] via-[#1647B9] to-[#246BFD] hover:shadow-lg hover:shadow-[#246BFD]/40"
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: "url(/manus-storage/vonwork-hero-bg_ebc33051.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/40">
                <span className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse" />
                <span className="text-xs font-bold text-[#54e39b] tracking-wider uppercase">
                  AI Business Operating System
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold font-['Space_Grotesk'] leading-tight mb-6">
                One Platform.{" "}
                <span className="bg-gradient-to-r from-[#0B1736] via-[#246BFD] to-[#14BFAF] bg-clip-text text-transparent">
                  Every Business Function.
                </span>
                {" "}Powered by AI.
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                VonWork replaces your CRM, inbox, phone system, bookkeeper, payroll, legal, and marketing tools—with one AI-powered OS that works 24/7 without a team.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#0B1736] via-[#1647B9] to-[#246BFD] hover:shadow-lg hover:shadow-[#246BFD]/40 text-white font-bold"
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                >
                  See Plans & Pricing
                  <span className="ml-2">→</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border hover:bg-secondary/50 text-foreground"
                  onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Learn More
                </Button>
              </div>

              <div className="flex gap-12">
                <div>
                  <div className="text-2xl font-extrabold font-['Space_Grotesk'] text-gray-900">24/7</div>
                  <div className="text-sm text-muted-foreground">Always Available</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold font-['Space_Grotesk'] text-gray-900">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime SLA</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold font-['Space_Grotesk'] text-gray-900">$0</div>
                  <div className="text-sm text-muted-foreground">Setup Fees</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold text-[#54e39b] tracking-wider uppercase px-3 py-1 bg-[#00D26A]/10 border border-[#00D26A]/40 rounded-full flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" />
                    Live
                  </span>
                  <span className="text-xs text-muted-foreground">AI Employee #4821</span>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#27D3EE] to-[#2E7BFF] flex items-center justify-center font-bold text-lg">
                    V
                  </div>
                  <div>
                    <div className="font-bold">Von</div>
                    <div className="text-xs text-[#54e39b]">Call Handler</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 h-12 mb-6">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-[#27D3EE] to-[#2E7BFF] rounded-sm"
                      style={{
                        height: "30%",
                        animation: `wave 1.1s ease-in-out infinite`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-sm text-muted-foreground mb-6">
                  "Hi! Thanks for calling. How can I help you today?"
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-[#9EFF3D] to-[#00D26A] hover:shadow-lg hover:shadow-[#9EFF3D]/50 text-black font-bold"
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Try VonWork
                </Button>

                <div className="text-xs text-muted-foreground text-center mt-4">
                  No credit card required to start
                </div>
              </div>

              <style>{`
                @keyframes wave {
                  0%, 100% { height: 24%; }
                  50% { height: 92%; }
                }
              `}</style>
            </div>
          </div>
        </div>
      </section>

      {/* Why VonWork Section */}
      <section id="features" className="relative border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase mb-4">
              Why VonWork?
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold font-['Space_Grotesk'] mb-6 text-gray-900">
              The AI employee that never takes a day off
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Traditional hiring is expensive, slow, and unreliable. VonWork gives you a tireless AI
              employee that's always on, always professional, and always improving.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: "📞",
                title: "Answer Every Call",
                desc: "No more missed calls, busy signals, or voicemail. Your AI employee picks up every single time.",
              },
              {
                icon: "📅",
                title: "Book Appointments",
                desc: "Automatically sync with your calendar and book appointments while you focus on what matters.",
              },
              {
                icon: "🎯",
                title: "Qualify Leads",
                desc: "Ask the right questions, score leads, and route hot prospects directly to your sales team.",
              },
              {
                icon: "🔄",
                title: "Follow Up Automatically",
                desc: "Send personalized follow-ups via SMS and email to keep leads warm and close more deals.",
              },
              {
                icon: "📊",
                title: "Real-Time Analytics",
                desc: "Track call volume, conversion rates, and revenue impact with detailed dashboards.",
              },
              {
                icon: "🔗",
                title: "Seamless Integrations",
                desc: "Connect with your CRM, calendar, and 1000+ tools via Zapier and direct API integrations.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-6 hover:border-[#2E7BFF]/40 transition-all"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <div className="font-extrabold text-lg mb-2 font-['Space_Grotesk'] text-gray-900">{feature.title}</div>
                <div className="text-sm text-muted-foreground">{feature.desc}</div>
              </div>
            ))}
          </div>

          {/* VS Comparison */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="text-xs font-bold text-[#FF6B72] tracking-wider uppercase mb-4">
                Human Receptionist
              </div>
              <div className="text-3xl font-bold font-['Space_Grotesk'] mb-4">$3,500+/mo</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">•</span> Works 8 hours/day
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">•</span> Sick days & vacations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">•</span> Training required
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">•</span> Inconsistent quality
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#2E7BFF]/10 to-transparent border border-[#2E7BFF]/40 rounded-xl p-6">
              <div className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase mb-4">
                VonWork AI Employee
              </div>
              <div className="text-3xl font-bold font-['Space_Grotesk'] mb-4">From $499/mo</div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#54e39b]" /> Available 24/7/365
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#54e39b]" /> Never calls in sick
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#54e39b]" /> Ready in minutes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#54e39b]" /> Consistent & improving
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="relative border-b border-border/50 py-20 md:py-28">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "url(/manus-storage/vonwork-features-bg_4e4f776d.png)",
            backgroundSize: "cover",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase mb-4">
                The Cost of Missed Calls
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold font-['Space_Grotesk'] mb-6 text-gray-900">
                Every missed call is revenue lost
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Studies show businesses miss 25–40% of incoming calls. That's thousands of dollars
                walking out the door every month. VonWork ensures no call goes unanswered.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-[#00D26A] flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-bold">Answer Every Call</div>
                    <div className="text-sm text-muted-foreground">No more busy signals or voicemail</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-[#00D26A] flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-bold">Qualify Leads Instantly</div>
                    <div className="text-sm text-muted-foreground">AI asks the right questions</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-[#00D26A] flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-bold">Book Appointments 24/7</div>
                    <div className="text-sm text-muted-foreground">Sync with your calendar automatically</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0F1726] to-[#121C30] border border-border/50 rounded-2xl p-8 text-white">
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
                Revenue Lost Calculator
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-baseline pb-4 border-b border-border/50">
                  <span className="text-gray-600">Calls per month</span>
                  <span className="font-bold text-xl">500</span>
                </div>
                <div className="flex justify-between items-baseline pb-4 border-b border-border/50">
                  <span className="text-gray-600">Missed call rate</span>
                  <span className="font-bold text-xl">30%</span>
                </div>
                <div className="flex justify-between items-baseline pb-4 border-b border-border/50">
                  <span className="text-gray-600">Average deal value</span>
                  <span className="font-bold text-xl">$500</span>
                </div>

                <div className="mt-8 p-6 rounded-xl bg-[#FF6B72]/10 border border-[#FF6B72]/35">
                  <div className="text-xs font-bold text-[#FF6B72] tracking-wider uppercase mb-2">
                    Monthly Revenue Lost
                  </div>
                  <div className="text-4xl font-bold font-['Space_Grotesk'] text-[#FF6B72]">
                    $75,000
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">500 × 30% × $500 = $75,000/mo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative border-b border-border/50 py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase mb-4">
              Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold font-['Space_Grotesk'] mb-6 text-gray-900">
              Replace $5,000+/mo in SaaS Tools
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              One platform for every business function, starting with a live website or AI messaging package.
            </p>
          </div>

          {/* Public packages */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5 max-w-7xl mx-auto mb-8">
            {/* Website Only */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col">
              <div className="mb-5">
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Website Only</h3>
                <p className="text-gray-500 text-sm">A professional live website</p>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-gray-900">$29</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {["Live website hosting", "Custom domain + SSL", "Secure business back-office", "AI rebuild demo and editor"].map(f => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /><span className="text-gray-700">{f}</span></li>
                ))}
              </ul>
              <a href="/website-builder" className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors text-sm">
                Build Your Website →
              </a>
            </div>

            {/* AI Messaging $199 */}
            <div className="relative bg-gradient-to-b from-[#EEF4FF] to-white border-2 border-[#1A6FFF] rounded-2xl p-6 flex flex-col shadow-lg shadow-[#1A6FFF]/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1A6FFF] rounded-full">
                <span className="text-xs font-extrabold text-white tracking-wider">WEBSITE + AI</span>
              </div>
              <div className="mb-5">
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">AI Messaging</h3>
                <p className="text-gray-500 text-sm">Chatbot + limited AI phone answering</p>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-gray-900">$199</span>
                <span className="text-gray-500 text-sm">/month</span>
                <div className="text-xs text-gray-400 mt-1">Includes Website Only</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {["Everything in Website Only", "Website chatbot + lead capture", "Limited AI phone answering", "100 AI phone-answering min/mo", "Message and call routing"].map(f => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#1A6FFF] shrink-0 mt-0.5" /><span className="text-gray-700">{f}</span></li>
                ))}
              </ul>
              <a href="/website-builder" className="block w-full text-center bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Add AI Messaging →
              </a>
            </div>

            {/* Starter $499 */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 flex flex-col">
              <div className="mb-5">
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Starter</h3>
                <p className="text-gray-500 text-sm">Core AI Business OS</p>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-gray-900">$499</span>
                <span className="text-gray-500 text-sm">/month</span>
                <div className="text-xs text-gray-400 mt-1">Replaces $1,500+/mo in tools</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {["AI Receptionist (1,000 min/mo)", "CRM + Deals Pipeline", "Omnichannel Inbox (SMS/email)", "AI Scheduler + Booking Page", "Payroll + Legal AI", "1 AI Chat Agent + website demo"].map(f => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /><span className="text-gray-700">{f}</span></li>
                ))}
              </ul>
              <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white font-bold text-sm" onClick={() => handleCheckout("starter")}>
                Get Started — $499/mo
              </Button>
              <div className="text-xs text-gray-400 text-center mt-2">14-day free trial</div>
            </div>

            {/* AI Video Pro $999 — Most Popular */}
            <div className="relative bg-gradient-to-b from-[#1A6FFF] to-[#0052CC] border-2 border-[#1A6FFF] rounded-2xl p-6 flex flex-col shadow-xl shadow-[#1A6FFF]/30">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 rounded-full">
                <span className="text-xs font-extrabold text-gray-900 tracking-wider">MOST POPULAR</span>
              </div>
              <div className="mb-5">
                <h3 className="text-xl font-extrabold text-white mb-1">AI Video Pro</h3>
                <p className="text-blue-200 text-sm">Custom video agent + full AI Business OS</p>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-white">$999</span>
                <span className="text-blue-200 text-sm">/month</span>
                <div className="text-xs text-blue-300 mt-1">Replaces $4,500+/mo in tools</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {["Everything in Starter", "AI Call Center (10,000 min/mo)", "Live AI Video Meeting Room", "Custom avatar + consent-based voice workflow", "Full Accounting + AI CFO", "AI Sales + Marketing + FSM", "5 AI Chat Agents"].map(f => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" /><span className="text-white">{f}</span></li>
                ))}
              </ul>
              <Button className="w-full bg-white hover:bg-yellow-50 text-[#1A6FFF] font-extrabold text-sm" onClick={() => handleCheckout("pro")}>
                Start Free Trial — $999/mo
              </Button>
              <div className="text-xs text-blue-200 text-center mt-2">14-day free trial</div>
            </div>

            {/* Enterprise $1,497 */}
            <div className="relative bg-gradient-to-b from-[#7C3AED] to-[#5B21B6] border-2 border-[#7C3AED] rounded-2xl p-6 flex flex-col shadow-xl shadow-purple-500/30">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-200 rounded-full">
                <span className="text-xs font-extrabold text-purple-900 tracking-wider">ENTERPRISE</span>
              </div>
              <div className="mb-5">
                <h3 className="text-xl font-extrabold text-white mb-1">Enterprise</h3>
                <p className="text-purple-200 text-sm">White-label + dedicated implementation</p>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-white">$1,497</span>
                <span className="text-purple-200 text-sm">/month</span>
                <div className="text-xs text-purple-300 mt-1">Built for multi-location and white-label operations</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {["Everything in AI Video Pro", "Unlimited AI agents", "White-label branding", "Client sub-account management", "All GEO/AEO tools", "Dedicated account manager", "Custom onboarding"].map(f => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" /><span className="text-white">{f}</span></li>
                ))}
              </ul>
              <Button className="w-full bg-white hover:bg-purple-50 text-purple-700 font-extrabold text-sm" onClick={() => handleCheckout("enterprise")}>
                Start Free Trial — $1,497/mo
              </Button>
              <div className="text-xs text-purple-200 text-center mt-2">14-day free trial</div>
            </div>
          </div>

          {/* SEO Add-ons row */}
          <div className="max-w-6xl mx-auto mb-10">
            <div className="text-center mb-5">
              <span className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase">Add-On Services — Flat Rate, No Tiers</span>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { title: "AI SEO Execution", price: "$149/mo", desc: "Keyword research · AI Article Writer · Meta tags · Schema · On-page optimizer · Competitor analysis", color: "border-cyan-300 bg-cyan-50", btnColor: "bg-cyan-600 hover:bg-cyan-700 text-white", plan: "seo_execution" },
                { title: "GEO/AEO — Get Found by AI", price: "$149/mo", desc: "AI Citation Optimizer · FAQ Schema · Entity Strategy · AI Answer Simulator · Content Rewriter", color: "border-indigo-300 bg-indigo-50", btnColor: "bg-indigo-600 hover:bg-indigo-700 text-white", plan: "seo_geo_aeo" },
                { title: "SEO + GEO Bundle", price: "$249/mo", desc: "Both SEO Execution AND GEO/AEO tools — save $49/mo vs buying separately", color: "border-[#1A6FFF] bg-[#EEF4FF]", btnColor: "bg-[#1A6FFF] hover:bg-[#0052CC] text-white", plan: "seo_bundle" },
              ].map(addon => (
                <div key={addon.plan} className={`rounded-2xl border-2 p-5 ${addon.color}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-gray-900">{addon.title}</h4>
                    <span className="font-extrabold text-[#1A6FFF] text-lg">{addon.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{addon.desc}</p>
                  <Button className={`w-full font-bold text-sm ${addon.btnColor}`} onClick={() => handleCheckout(addon.plan)}>
                    Add to Plan →
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Value comparison */}
          <div className="bg-[#F5F7FA] rounded-2xl p-8 max-w-4xl mx-auto mb-8">
            <h3 className="text-center text-lg font-extrabold text-gray-900 mb-6">What VonWork Pro Replaces — Monthly Cost Comparison</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-6">
              {[
                { tool: "Respond.io (inbox)", cost: "$299" },
                { tool: "HubSpot CRM", cost: "$450" },
                { tool: "QuickBooks", cost: "$90" },
                { tool: "Calendly Pro", cost: "$20" },
                { tool: "Gusto Payroll", cost: "$149" },
                { tool: "ServiceTitan FSM", cost: "$398" },
                { tool: "CallRail Call Center", cost: "$145" },
                { tool: "Semrush SEO", cost: "$249" },
                { tool: "DocuSign Legal", cost: "$45" },
              ].map(item => (
                <div key={item.tool} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <span className="text-gray-700 font-medium">{item.tool}</span>
                  <span className="text-red-500 font-extrabold line-through">{item.cost}/mo</span>
                </div>
              ))}
            </div>
            <div className="text-center border-t border-gray-200 pt-5">
              <div className="text-xl font-extrabold text-gray-900">Total if bought separately: <span className="line-through text-red-500">$1,845/mo</span></div>
              <div className="text-2xl font-extrabold text-[#1A6FFF] mt-1">VonWork AI Video Pro: $999/mo — you save $846/mo</div>
              <div className="text-sm text-gray-500 mt-2">That is $10,152 saved per year before AI usage. <a href="/joinforce-pricing" className="text-[#1A6FFF] font-bold hover:underline">JoinForce members save even more →</a></div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center text-sm text-indigo-900 font-medium">
            <strong>Humans First members:</strong> a protected, non-transferable own-use benefit may reduce eligible VonWork subscriptions by 50% after active HFN status is verified. <a href="/hfn-pricing" className="font-extrabold underline">Verify your benefit securely →</a>
          </div>

          <div className="text-center text-sm text-gray-500 font-medium">
            All paid plans include a 14-day free trial. No credit card required. Cancel anytime.
          </div>
        </div>
      </section>
      {/* Industries Section */}
      {/* Industries Section */}
      {/* Industries Section */}
      <section className="relative border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase mb-4">
              Industries
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold font-['Space_Grotesk'] mb-6 text-gray-900">
              Built for every business
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: "🏥", name: "Healthcare & Medical" },
              { icon: "🏠", name: "Real Estate" },
              { icon: "⚖️", name: "Legal Services" },
              { icon: "🔧", name: "Home Services" },
              { icon: "🦷", name: "Dental Practices" },
              { icon: "🚗", name: "Auto Dealerships" },
              { icon: "💆", name: "Wellness & Spa" },
              { icon: "🏋️", name: "Fitness Studios" },
              { icon: "🍕", name: "Restaurants" },
            ].map((industry, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-[#2E7BFF]/40 transition-all"
              >
                <span className="text-2xl">{industry.icon}</span>
                <span className="font-extrabold text-sm font-['Space_Grotesk'] text-gray-900">{industry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-extrabold text-[#1A6FFF] tracking-widest uppercase mb-4">
              Questions?
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold font-['Space_Grotesk'] mb-6 text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="border border-border/50 rounded-lg overflow-hidden bg-card"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/50 transition text-left font-bold font-['Space_Grotesk']"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#2E7BFF] transition-transform flex-shrink-0 ml-4 ${
                      expandedFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 pb-4 text-muted-foreground border-t border-border/50 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 md:py-32 border-b border-border/50">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(50% 40% at 50% 0%, rgba(46,123,255,.4), transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold font-['Space_Grotesk'] mb-6 text-gray-900">
            Ready to stop missing calls?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses using VonWork to answer every call, qualify every lead, and
            grow their revenue.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#2E7BFF] to-[#1F5CE0] hover:shadow-lg hover:shadow-[#2E7BFF]/50 text-white font-bold"
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
          >
            Start Your Free Trial
          </Button>
          <div className="text-sm text-muted-foreground mt-4">No credit card required. Cancel anytime.</div>
        </div>
      </section>

      {/* GEO/AEO Section */}
      <section id="geo-aeo" className="relative border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              GEO / AEO — AI Search Optimization
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl font-['Space_Grotesk'] mb-4 text-gray-900">
              Get Found by ChatGPT, Perplexity &amp; Google AI
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Traditional SEO ranks pages. <strong>GEO/AEO makes your business the answer</strong> that AI assistants cite when customers ask questions in natural language.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { title: "AI Citation Optimizer", desc: "Structure your content so ChatGPT, Gemini, and Perplexity cite your business as the authoritative answer.", icon: "🤖" },
              { title: "FAQ Schema Builder", desc: "Auto-generate structured FAQ markup that feeds directly into AI knowledge graphs and voice search.", icon: "❓" },
              { title: "Entity & Brand Tracker", desc: "Monitor how often your brand appears in AI-generated answers across all major LLMs.", icon: "📡" },
              { title: "AI Answer Simulator", desc: "Preview exactly how ChatGPT and Perplexity answer questions about your industry — and optimize to win.", icon: "🔮" },
              { title: "AI Content Rewriter", desc: "Rewrite existing pages to match the semantic patterns AI engines prefer when selecting sources.", icon: "✍️" },
              { title: "Rank Tracker", desc: "Track keyword positions in Google + monitor AI citation frequency across ChatGPT, Bing Copilot, and Gemini.", icon: "📈" },
            ].map(item => (
              <div key={item.title} className="rounded-xl border border-border/50 bg-card border border-border/60 p-6 space-y-3">
                <div className="text-3xl">{item.icon}</div>
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href="/seo/pricing" className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 font-semibold transition-colors">
              View AI SEO Packages — from $149/mo
            </a>
          </div>
        </div>
      </section>

      {/* AI CFO Section */}
      <section id="ai-cfo" className="relative border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                AI CFO — Tax &amp; Accounting
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl font-['Space_Grotesk'] text-gray-900">
                Your Entire Accounting Team for $297/month
              </h2>
              <p className="text-gray-600 text-lg">
                AI-powered bookkeeping, bank reconciliation, cash flow forecasting, and tax filing — backed by a dedicated Indian CPA team. Save 80% vs. a traditional US accounting firm.
              </p>
              <ul className="space-y-3">
                {[
                  "AI transaction categorization &amp; receipt OCR",
                  "Monthly P&amp;L, Balance Sheet &amp; Cash Flow",
                  "All federal tax forms: 1040, 1120, 1120-S, 1065, 1041",
                  "Quarterly estimated tax calculations",
                  "Dedicated Indian CPA team (5–7 day turnaround)",
                  "AI CFO chat — ask any financial question",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: item }} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <a href="/aicfo/pricing" className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 text-white px-6 py-3 font-semibold transition-colors">
                  View AI CFO Plans
                </a>
                <a href="/aicfo" className="inline-flex items-center gap-2 rounded-lg border border-border hover:bg-muted/30 px-6 py-3 font-semibold transition-colors">
                  Open Dashboard
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Bookkeeping", value: "AI-Automated", color: "text-green-400" },
                { label: "Tax Filing", value: "All Forms", color: "text-blue-400" },
                { label: "CPA Team", value: "India-Based", color: "text-purple-400" },
                { label: "Cost vs. US Firm", value: "Save 80%", color: "text-yellow-400" },
                { label: "Turnaround", value: "5–7 Days", color: "text-cyan-400" },
                { label: "Starting At", value: "$297/mo", color: "text-orange-400" },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-border/50 bg-card border border-border/60 p-4 text-center">
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VonWork OS Modules Section */}
      <section id="os-modules" className="relative border-b border-border/50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
      {/* AI Website Rebuilder Section */}
      <section id="website-rebuilder" className="relative border-b border-border/50 py-20 md:py-28 bg-gradient-to-br from-[#EEF4FF] to-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#1A6FFF]/20 bg-[#1A6FFF]/10 px-4 py-1.5 text-sm font-bold text-[#1A6FFF]">
                ✨ Free Tool — No Credit Card
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl font-['Space_Grotesk'] text-gray-900">
                Rebuild Any Business Website<br />
                <span className="text-[#1A6FFF]">with AI in 60 Seconds</span>
              </h2>
              <p className="text-lg text-gray-700 font-medium leading-relaxed">
                Paste any company's old website URL. Our AI rebuilds it as a modern site — then email the owner the preview as a pitch. They choose <strong>Website Only at $29/month</strong> or <strong>AI Messaging at $199/month</strong>.
              </p>
              <ul className="space-y-3">
                {[
                  "Paste URL → AI rebuilds in 60 seconds",
                  "Email the owner a ready-made pitch",
                  "Website Only at $29/month",
                  "AI Messaging at $199/month with chatbot + limited phone answering",
                  "Works for any industry — HVAC, dental, restaurants, law firms...",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <a href="/website-builder" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1A6FFF] to-[#3B8BFF] text-white px-6 py-3 font-bold transition-all hover:shadow-lg hover:shadow-[#1A6FFF]/40">
                  ✨ Try Website Rebuilder Free
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { step: "1", icon: "🌐", title: "Paste URL", desc: "Enter any business website URL" },
                { step: "2", icon: "✨", title: "AI Rebuilds", desc: "Modern site generated in 60 seconds" },
                { step: "3", icon: "📧", title: "Email Pitch", desc: "Copy & send the ready-made pitch email" },
                { step: "4", icon: "💰", title: "$29/mo Activated", desc: "Owner activates Website Only or AI Messaging" },
              ].map(item => (
                <div key={item.step} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Step {item.step}</div>
                  <div className="font-extrabold text-gray-900 text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              The Complete Business OS
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl font-['Space_Grotesk'] mb-4 text-gray-900">
              Everything Your Business Needs. One Platform.
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              VonWork replaces over $100,000/year in SaaS subscriptions with a single AI-powered operating system built for modern businesses.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: "💬", title: "Communications Hub", desc: "Unified inbox for WhatsApp, SMS, Email, Instagram, Telegram, Facebook & Web Chat with AI routing.", href: "/communications" },
              { icon: "📊", title: "CRM", desc: "Contacts, companies, deals pipeline, and tasks — your full sales funnel in one place.", href: "/crm" },
              { icon: "⚡", title: "AI Sales", desc: "Lead scoring, outbound sequences, and follow-up automation powered by AI.", href: "/sales" },
              { icon: "📣", title: "AI Marketing", desc: "Email & SMS campaign builder with AI copy generation and audience segmentation.", href: "/marketing" },
              { icon: "💰", title: "AI Collections", desc: "Invoice tracking, AI-powered debt recovery messages, and payment link generation.", href: "/collections" },
              { icon: "💵", title: "Payroll", desc: "Employee & contractor management, pay runs, and compensation tracking.", href: "/payroll" },
              { icon: "⚖️", title: "Legal", desc: "Contract templates (NDA, MSA, SOW) with AI drafting and clause analysis.", href: "/legal" },
              { icon: "📈", title: "Analytics", desc: "Revenue, pipeline, MRR, churn, agent performance, and channel breakdown charts.", href: "/analytics" },
            ].map(mod => (
              <a key={mod.title} href={mod.href} className="rounded-xl border border-border/50 bg-card border border-border/60 p-5 space-y-3 hover:border-primary/40 transition-all group">
                <div className="text-3xl">{mod.icon}</div>
                <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{mod.title}</h3>
                <p className="text-sm text-muted-foreground">{mod.desc}</p>
              </a>
            ))}
          </div>
          <div className="text-center mt-12">
            <a href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2E7BFF] to-[#1F5CE0] text-white px-8 py-3 font-semibold transition-all hover:shadow-lg hover:shadow-[#2E7BFF]/50">
              Launch VonWork OS →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/manus-storage/vonwork-logo_0a7ba64d.png"
                  alt="VonWork"
                  className="h-6 w-6"
                />
                <span className="font-bold font-['Space_Grotesk']">VonWork</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The AI employee that answers every call, books every job, and follows up with every
                lead — around the clock.
              </p>
            </div>
            <div>
              <div className="font-bold mb-4">Product</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-foreground transition">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-4">Company</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-4">Legal</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
            <p>&copy; {new Date().getFullYear()} VonWork. All rights reserved.</p>
            <p className="text-xs max-w-xl text-center md:text-right">
              "VonWork" is a proposed brand pending trademark and domain clearance. Revenue and
              savings figures are illustrative examples, not guarantees.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

async function handleCheckout(plan: string) {
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      const err = await response.json();
      alert(`Checkout error: ${err.error || "Unknown error"}`);
      return;
    }

    const { url } = await response.json();
    if (url) {
      window.open(url, "_blank");
    }
  } catch (err) {
    console.error("Checkout failed:", err);
    alert("Failed to start checkout. Please try again.");
  }
}
