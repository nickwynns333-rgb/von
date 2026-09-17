import { useMemo, useState } from "react";
import { Bot, CheckCircle2, ChevronRight, CircleDot, Facebook, Globe2, Inbox, Mail, MessageCircle, PhoneCall, Send, Settings2, ShieldCheck, Smartphone, Sparkles, UsersRound } from "lucide-react";
import PageShell from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ChannelType = "webchat" | "sms" | "whatsapp" | "instagram" | "facebook" | "telegram" | "email" | "voice";

const ICONS: Record<ChannelType, typeof Globe2> = {
  webchat: Globe2,
  sms: Smartphone,
  whatsapp: MessageCircle,
  instagram: CircleDot,
  facebook: Facebook,
  telegram: Send,
  email: Mail,
  voice: PhoneCall,
};

const SETUP_HINTS: Record<ChannelType, string> = {
  webchat: "Publish the VonWork web-chat widget on an approved website.",
  sms: "Provision and verify a Telnyx messaging number, then configure its inbound webhook.",
  whatsapp: "Connect an approved WhatsApp Business sender and complete Meta template and webhook setup.",
  instagram: "Connect a professional Instagram account through a Meta app with subscribed messaging webhooks.",
  facebook: "Connect a Facebook Page through a Meta app with Page messaging webhooks.",
  telegram: "Create a Telegram Bot, configure its webhook, and store the token only in server-side secrets.",
  email: "Connect a monitored mailbox and configure its inbound delivery endpoint.",
  voice: "Provision a Telnyx voice number and configure its controlled inbound call webhook.",
};

export default function SocialControlCenter() {
  const utils = trpc.useUtils();
  const channels = trpc.communications.getChannelControlCenter.useQuery(undefined, { refetchInterval: 15_000 });
  const [selected, setSelected] = useState<ChannelType>("webchat");
  const [name, setName] = useState("Website Chat");
  const [note, setNote] = useState(SETUP_HINTS.webchat);
  const [externalAccountId, setExternalAccountId] = useState("");
  const [active, setActive] = useState(false);
  const configure = trpc.communications.configureChannelConnection.useMutation({
    onSuccess: (result) => { toast.success(`Channel saved as ${result.connectionStatus.replaceAll("_", " ")}.`); void utils.communications.getChannelControlCenter.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const safeInboundTest = trpc.communications.createSafeInboundChannelTest.useMutation({
    onSuccess: (result) => { toast.success("Safe inbound test added to the unified inbox. No external message was sent."); window.location.href = `/communications`; },
    onError: (error) => toast.error(error.message),
  });

  const totals = useMemo(() => ({
    connected: channels.data?.filter((channel) => channel.isActive).length ?? 0,
    open: channels.data?.reduce((sum, channel) => sum + channel.openConversations, 0) ?? 0,
    human: channels.data?.reduce((sum, channel) => sum + channel.humanHandoffs, 0) ?? 0,
  }), [channels.data]);

  function chooseChannel(type: ChannelType, label: string) {
    setSelected(type); setName(label); setNote(SETUP_HINTS[type]); setExternalAccountId(""); setActive(false);
  }

  return (
    <PageShell title="Social AI Control Center" subtitle="Connect supported channels, monitor every conversation in one inbox, route chats to AI or people, and test safely before any provider goes live" icon={<Bot className="w-5 h-5" />}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5 flex gap-4"><ShieldCheck className="w-6 h-6 shrink-0 text-blue-700" /><div className="text-sm text-blue-950"><strong>One control center; deliberate provider activation.</strong> This page configures and monitors approved channels. Provider OAuth, webhooks, tokens, and phone credentials are never stored in the browser. Safe inbound tests create local conversations only and never message an external contact.</div></div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Active channels", value: totals.connected, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Open conversations", value: totals.open, icon: Inbox, color: "text-blue-600" },
            { label: "Human handoffs", value: totals.human, icon: UsersRound, color: "text-violet-600" },
          ].map((stat) => <Card key={stat.label} className="border-gray-200"><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-gray-500">{stat.label}</p><p className="text-3xl font-extrabold text-slate-900 mt-1">{stat.value}</p></div><stat.icon className={`w-8 h-8 ${stat.color}`} /></CardContent></Card>)}
        </div>

        <div className="grid xl:grid-cols-[1fr_360px] gap-6">
          <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Channel command board</CardTitle><p className="text-sm text-gray-500">Supported channels flow into Communications Hub where AI routing, assignment, status management, and human takeover occur.</p></CardHeader><CardContent className="grid md:grid-cols-2 gap-4">{channels.isLoading ? <p className="col-span-2 py-8 text-center text-gray-500">Loading channel status…</p> : channels.data?.map((channel) => { const Icon = ICONS[channel.type as ChannelType]; const connectionStatus = String(channel.connectionStatus ?? "NOT_CONNECTED"); const setupNote = String(channel.setupNote ?? "Connection has not been configured."); const configured = connectionStatus !== "NOT_CONNECTED"; return <div key={channel.type} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Icon className="w-5 h-5" /></div><div><p className="font-extrabold text-slate-900">{channel.name}</p><p className="text-xs text-gray-500">{channel.provider}</p></div></div><Badge variant="outline" className={channel.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : configured ? "border-amber-200 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-600"}>{connectionStatus.replaceAll("_", " ")}</Badge></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-gray-50 p-2"><p className="text-lg font-extrabold text-slate-900">{channel.conversations}</p><p className="text-[10px] uppercase tracking-wide text-gray-500">All</p></div><div className="rounded-lg bg-gray-50 p-2"><p className="text-lg font-extrabold text-slate-900">{channel.openConversations}</p><p className="text-[10px] uppercase tracking-wide text-gray-500">Open</p></div><div className="rounded-lg bg-gray-50 p-2"><p className="text-lg font-extrabold text-slate-900">{channel.humanHandoffs}</p><p className="text-[10px] uppercase tracking-wide text-gray-500">Handoffs</p></div></div><p className="min-h-10 text-xs text-gray-500">{setupNote}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => chooseChannel(channel.type as ChannelType, channel.label)}><Settings2 className="w-3.5 h-3.5 mr-1" />Configure</Button><Button size="sm" variant="outline" disabled={safeInboundTest.isPending} onClick={() => safeInboundTest.mutate({ type: channel.type as ChannelType })}><Sparkles className="w-3.5 h-3.5 mr-1" />Safe test</Button></div></div>; })}</CardContent></Card>

          <Card className="border-gray-200 h-fit"><CardHeader><CardTitle className="text-lg">Configure {name}</CardTitle><p className="text-sm text-gray-500">This saves setup status only. Complete provider credentials in the secure integration flow before activation.</p></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Display name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>{(selected === "facebook" || selected === "instagram") && <div className="space-y-2"><Label>{selected === "facebook" ? "Facebook Page ID" : "Instagram business account ID"}</Label><Input value={externalAccountId} onChange={(event) => setExternalAccountId(event.target.value)} placeholder={selected === "facebook" ? "Page ID from Meta Business Suite" : "Professional account ID from Meta"} /><p className="text-xs text-gray-500">This identifier is not a token. Store Meta access tokens and webhook secrets only in server-side secrets.</p></div>}<div className="space-y-2"><Label>Setup note</Label><textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-28 w-full rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong>Mark as ready for provider verification.</strong> This does not send messages or activate OAuth; it only marks the channel as pending verification.</span></label><Button disabled={!name.trim() || note.trim().length < 5 || configure.isPending} onClick={() => configure.mutate({ type: selected, name, setupNote: note, externalAccountId: externalAccountId || undefined, isActive: active })} className="w-full bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold">{configure.isPending ? "Saving…" : "Save channel configuration"}</Button><a href="/communications" className="flex items-center justify-center gap-1 text-sm font-bold text-blue-700 hover:underline">Open unified inbox <ChevronRight className="w-4 h-4" /></a></CardContent></Card>
        </div>

        <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">VICIdial-equivalent operating controls</CardTitle><p className="text-sm text-gray-500">VonWork brings campaign schedules, calls-per-hour pacing, concurrency limits, scripts, voice selection, live campaign metrics, dispositions, inbound webhooks, and AI-to-human escalation into one operating surface. Campaigns now begin in test mode and need an explicit consent-and-suppression approval before live dispatch.</p></CardHeader><CardContent><div className="grid md:grid-cols-3 gap-3 text-sm">{["Inbound webhook → unified inbox → AI route or human handoff", "Outbound campaign → safe test mode → consent review → explicit approval", "Presentation link → question tracking → pending-review email/SMS follow-up"].map((item) => <div key={item} className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-blue-950">{item}</div>)}</div></CardContent></Card>
      </div>
    </PageShell>
  );
}
