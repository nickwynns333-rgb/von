import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Plus, Settings, Trash2, Clock, Mic, BarChart2,
  ChevronRight, Search, RefreshCw, Layers
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { TelnyxStatus, TestCallDialog } from "@/components/TelnyxStatus";

const customerNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: <BarChart2 className="w-4 h-4" /> },
  { label: "AI Agents", href: "/dashboard#agents", icon: <Layers className="w-4 h-4" /> },
  { label: "Knowledge Base", href: "/knowledge", icon: <Layers className="w-4 h-4" /> },
  { label: "Phone Numbers", href: "/telephony", icon: <Phone className="w-4 h-4" /> },
  { label: "Chat Widgets", href: "/widgets", icon: <Layers className="w-4 h-4" /> },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    released: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    answered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    initiated: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    ringing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
      {status}
    </span>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Telephony() {
  const { user, loading, isAuthenticated } = useAuth();
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [ivrOpen, setIvrOpen] = useState(false);
  const [editingNumberId, setEditingNumberId] = useState<number | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [ivrEnabled, setIvrEnabled] = useState(false);
  const [ivrGreeting, setIvrGreeting] = useState("Thank you for calling. Press 1 for sales, 2 for support, or stay on the line for an agent.");
  const [ivrOptions, setIvrOptions] = useState([
    { key: "1", label: "Sales", action: "agent" as const, value: "" },
    { key: "2", label: "Support", action: "agent" as const, value: "" },
  ]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const { data: phoneNumbersList, refetch: refetchNumbers } = trpc.telephony.listNumbers.useQuery(undefined, { enabled: isAuthenticated });
  const { data: callStats } = trpc.telephony.getCallStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: callLogsList } = trpc.telephony.listCallLogs.useQuery({ limit: 50, direction: "all" }, { enabled: isAuthenticated });
  const { data: availableNumbers, refetch: searchNumbers } = trpc.telephony.searchAvailableNumbers.useQuery(
    { areaCode: searchAreaCode, limit: 10 },
    { enabled: false }
  );
  const { data: ivrMenusList } = trpc.telephony.listIvrMenus.useQuery(undefined, { enabled: isAuthenticated });

  const provisionMutation = trpc.telephony.provisionNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number provisioned successfully!");
      setProvisionOpen(false);
      setSelectedNumber(null);
      refetchNumbers();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateNumberMutation = trpc.telephony.updateNumber.useMutation({
    onSuccess: () => {
      toast.success("Number settings updated");
      setEditingNumberId(null);
      refetchNumbers();
    },
    onError: (e) => toast.error(e.message),
  });

  const releaseNumberMutation = trpc.telephony.releaseNumber.useMutation({
    onSuccess: () => {
      toast.success("Number released");
      refetchNumbers();
    },
    onError: (e) => toast.error(e.message),
  });

  const createIvrMutation = trpc.telephony.createIvrMenu.useMutation({
    onSuccess: () => {
      toast.success("IVR menu created");
      setIvrOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const outboundCallMutation = trpc.telephony.initiateOutboundCall.useMutation({
    onSuccess: () => toast.success("Outbound call initiated"),
    onError: (e) => toast.error(e.message),
  });

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;

  return (
    <DashboardShell navItems={customerNavItems} role="customer" title="Phone Numbers & Telephony">
      <div className="space-y-6">
        {/* Telnyx Account Status + Test Call */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <TelnyxStatus />
          </div>
          <div className="flex items-center pt-3">
            <TestCallDialog />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Calls", value: callStats?.total ?? 0, icon: <Phone className="w-5 h-5 text-indigo-400" /> },
            { label: "Inbound", value: callStats?.inbound ?? 0, icon: <PhoneIncoming className="w-5 h-5 text-emerald-400" /> },
            { label: "Outbound", value: callStats?.outbound ?? 0, icon: <PhoneOutgoing className="w-5 h-5 text-cyan-400" /> },
            { label: "Total Minutes", value: `${callStats?.totalMinutes ?? 0}m`, icon: <Clock className="w-5 h-5 text-purple-400" /> },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="numbers">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
            <TabsTrigger value="logs">Call Logs</TabsTrigger>
            <TabsTrigger value="ivr">IVR Menus</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          {/* ── Phone Numbers Tab ── */}
          <TabsContent value="numbers" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Phone Numbers</h2>
              <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <Plus className="w-4 h-4" /> Get a Number
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Get a Phone Number</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Area code (e.g. 212)"
                        value={searchAreaCode}
                        onChange={(e) => setSearchAreaCode(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <Button onClick={() => searchNumbers()} variant="outline" className="border-slate-700 gap-2">
                        <Search className="w-4 h-4" /> Search
                      </Button>
                    </div>

                    {availableNumbers && availableNumbers.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {availableNumbers.map((num) => (
                          <div
                            key={num.phone_number}
                            onClick={() => setSelectedNumber(num.phone_number)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedNumber === num.phone_number
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-slate-700 bg-slate-800 hover:border-slate-600"
                            }`}
                          >
                            <div>
                              <p className="font-mono font-medium text-white">{num.phone_number}</p>
                              <p className="text-xs text-slate-400">{num.region}</p>
                            </div>
                            <span className="text-sm text-emerald-400">{num.monthly_cost}/mo</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedNumber && (
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => provisionMutation.mutate({ phoneNumber: selectedNumber })}
                        disabled={provisionMutation.isPending}
                      >
                        {provisionMutation.isPending ? "Provisioning..." : `Get ${selectedNumber}`}
                      </Button>
                    )}

                    <p className="text-xs text-slate-500 text-center">
                      Powered by Telnyx • $1.00/month per number • $0.002/min outbound • $0.0032/min inbound
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {phoneNumbersList && phoneNumbersList.length > 0 ? (
              <div className="space-y-3">
                {phoneNumbersList.map((num) => (
                  <Card key={num.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-500/10">
                            <Phone className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-white text-lg">{num.phoneNumber}</p>
                            <p className="text-sm text-slate-400">{num.friendlyName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge status={num.status} />
                              {num.ivrEnabled && <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">IVR Active</Badge>}
                              {num.forwardTo && <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">Forwarding</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-300 gap-1"
                            onClick={() => {
                              setEditingNumberId(num.id);
                              setForwardTo(num.forwardTo ?? "");
                              setIvrEnabled(num.ivrEnabled ?? false);
                            }}
                          >
                            <Settings className="w-3.5 h-3.5" /> Configure
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => releaseNumberMutation.mutate({ id: num.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {editingNumberId === num.id && (
                        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-slate-300 text-xs">Forward To</Label>
                              <Input
                                placeholder="+1234567890"
                                value={forwardTo}
                                onChange={(e) => setForwardTo(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white mt-1"
                              />
                            </div>
                            <div className="flex items-end gap-3 pb-1">
                              <Switch checked={ivrEnabled} onCheckedChange={setIvrEnabled} />
                              <Label className="text-slate-300 text-sm">Enable IVR Menu</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => updateNumberMutation.mutate({
                                id: num.id,
                                forwardTo: forwardTo || null,
                                ivrEnabled,
                              })}
                              disabled={updateNumberMutation.isPending}
                            >
                              Save Changes
                            </Button>
                            <Button size="sm" variant="outline" className="border-slate-700" onClick={() => setEditingNumberId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800 border-dashed">
                <CardContent className="p-12 text-center">
                  <Phone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No phone numbers yet</p>
                  <p className="text-slate-500 text-sm mb-4">Get a number to enable inbound calls, IVR, and call forwarding</p>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setProvisionOpen(true)}>
                    Get Your First Number
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Call Logs Tab ── */}
          <TabsContent value="logs" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Call History</h2>
              <Button variant="outline" size="sm" className="border-slate-700 gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>

            {callLogsList && callLogsList.length > 0 ? (
              <div className="space-y-2">
                {callLogsList.map((call) => (
                  <Card key={call.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${call.direction === "inbound" ? "bg-emerald-500/10" : "bg-cyan-500/10"}`}>
                            {call.direction === "inbound"
                              ? <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                              : <PhoneOutgoing className="w-4 h-4 text-cyan-400" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {call.direction === "inbound" ? call.fromNumber : call.toNumber}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(call.startedAt).toLocaleString()} • {formatDuration(call.durationSeconds)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={call.status} />
                          {call.creditsCharged > 0 && (
                            <span className="text-xs text-slate-400">{call.creditsCharged} credits</span>
                          )}
                          {call.recordingUrl && (
                            <Button size="sm" variant="outline" className="border-slate-700 gap-1 text-xs">
                              <Mic className="w-3 h-3" /> Recording
                            </Button>
                          )}
                        </div>
                      </div>
                      {call.aiSummary && (
                        <p className="mt-2 text-sm text-slate-400 bg-slate-800 rounded p-2">{call.aiSummary}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800 border-dashed">
                <CardContent className="p-12 text-center">
                  <PhoneMissed className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No call history yet</p>
                  <p className="text-slate-500 text-sm mt-1">Calls will appear here once you provision a number and start receiving/making calls</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── IVR Menus Tab ── */}
          <TabsContent value="ivr" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">IVR Menus</h2>
              <Dialog open={ivrOpen} onOpenChange={setIvrOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" disabled={!phoneNumbersList?.length}>
                    <Plus className="w-4 h-4" /> Create IVR Menu
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create IVR Menu</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-300">Phone Number</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                          <SelectValue placeholder="Select a phone number" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {phoneNumbersList?.map((n) => (
                            <SelectItem key={n.id} value={String(n.id)} className="text-white">{n.phoneNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Greeting Message</Label>
                      <Textarea
                        value={ivrGreeting}
                        onChange={(e) => setIvrGreeting(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 mb-2 block">Menu Options</Label>
                      <div className="space-y-2">
                        {ivrOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input value={opt.key} className="w-12 bg-slate-800 border-slate-700 text-white text-center" readOnly />
                            <Input
                              value={opt.label}
                              onChange={(e) => {
                                const updated = [...ivrOptions];
                                updated[i] = { ...updated[i], label: e.target.value };
                                setIvrOptions(updated);
                              }}
                              placeholder="Label"
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                            <Select
                              value={opt.action}
                              onValueChange={(v) => {
                                const updated = [...ivrOptions];
                                updated[i] = { ...updated[i], action: v as any };
                                setIvrOptions(updated);
                              }}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="agent" className="text-white">AI Agent</SelectItem>
                                <SelectItem value="forward" className="text-white">Forward</SelectItem>
                                <SelectItem value="voicemail" className="text-white">Voicemail</SelectItem>
                                <SelectItem value="repeat" className="text-white">Repeat</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-300 w-full"
                          onClick={() => setIvrOptions([...ivrOptions, { key: String(ivrOptions.length + 1), label: "", action: "agent", value: "" }])}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      disabled={createIvrMutation.isPending || !phoneNumbersList?.length}
                      onClick={() => {
                        if (!phoneNumbersList?.[0]) return;
                        createIvrMutation.mutate({
                          phoneNumberId: phoneNumbersList[0].id,
                          name: "Main IVR",
                          greeting: ivrGreeting,
                          options: ivrOptions,
                        });
                      }}
                    >
                      {createIvrMutation.isPending ? "Creating..." : "Create IVR Menu"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {ivrMenusList && ivrMenusList.length > 0 ? (
              <div className="space-y-3">
                {ivrMenusList.map((menu) => (
                  <Card key={menu.id} className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white">{menu.name}</p>
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{menu.greeting}</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {(() => {
                              try {
                                const opts = JSON.parse(menu.options);
                                return opts.map((o: any) => (
                                  <Badge key={o.key} variant="outline" className="text-xs border-slate-700 text-slate-300">
                                    Press {o.key}: {o.label}
                                  </Badge>
                                ));
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="border-slate-700 gap-1">
                          <Settings className="w-3.5 h-3.5" /> Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800 border-dashed">
                <CardContent className="p-12 text-center">
                  <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No IVR menus yet</p>
                  <p className="text-slate-500 text-sm mt-1">Create an IVR menu to route callers to the right AI agent or department</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Pricing Tab ── */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-gray-800">Call Pricing</CardTitle>
                <CardDescription className="text-slate-400">
                  VonWork uses Telnyx for telephony — the most cost-effective SIP provider available, up to 7x cheaper than Twilio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { type: "Inbound Calls", cost: "$0.0032/min", credits: "2 credits/min", color: "emerald" },
                    { type: "Outbound Calls", cost: "$0.002/min", credits: "3 credits/min", color: "cyan" },
                    { type: "Phone Number", cost: "$1.00/month", credits: "100 credits/month", color: "purple" },
                    { type: "Call Recording", cost: "$0.002/min", credits: "1 credit/min", color: "yellow" },
                    { type: "AI Transcription", cost: "Included", credits: "2 credits/call", color: "indigo" },
                    { type: "AI Call Summary", cost: "Included", credits: "1 credit/call", color: "pink" },
                  ].map((item) => (
                    <div key={item.type} className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
                      <div>
                        <p className="font-medium text-white text-sm">{item.type}</p>
                        <p className="text-xs text-slate-400">{item.cost}</p>
                      </div>
                      <Badge variant="outline" className={`border-${item.color}-500/30 text-${item.color}-400`}>
                        {item.credits}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-sm text-indigo-300 font-medium">💡 Competitor Comparison</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Twilio charges $0.014/min outbound. VonWork via Telnyx charges $0.002/min — that's <strong className="text-white">7x cheaper</strong>.
                    At 10,000 outbound minutes/month, you save $120 vs Twilio.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
