import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, Zap, DollarSign, Wifi, WifiOff, RefreshCw, PhoneCall } from "lucide-react";
import { useState } from "react";

export function TelnyxStatus() {
  const { data: balance, isLoading: balanceLoading, refetch } = trpc.telnyx.getBalance.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: numbers } = trpc.telnyx.listNumbers.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isConnected = balance !== undefined && balance !== null;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Telnyx Account
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                <Wifi className="w-3 h-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                <WifiOff className="w-3 h-3 mr-1" /> Not Connected
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {balanceLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
          </div>
        ) : isConnected ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Balance
              </p>
              <p className="text-lg font-bold text-white">
                ${parseFloat(String(balance?.balance ?? "0")).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">{balance?.currency ?? "USD"}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Numbers
              </p>
              <p className="text-lg font-bold text-white">{numbers?.length ?? 0}</p>
              <p className="text-xs text-slate-500">active</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-slate-400">Telnyx API key not configured</p>
            <p className="text-xs text-slate-500 mt-1">Add TELNYX_API_KEY in Settings → Secrets</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Test Call Dialog ──────────────────────────────────────────────────────────

export function TestCallDialog() {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [script, setScript] = useState("Hi, this is a test call from VonWork AI. Your system is working correctly. Goodbye!");
  const [voice, setVoice] = useState<"female" | "male" | "professional_female" | "professional_male">("professional_female");

  const { data: numbers } = trpc.telnyx.listNumbers.useQuery(undefined, { retry: false });
  const { data: voiceApps } = trpc.telnyx.listVoiceApps.useQuery(undefined, { retry: false });

  const callMutation = trpc.telnyx.initiateCall.useMutation({
    onSuccess: () => {
      toast.success("Test call initiated! Check your phone.");
      setOpen(false);
    },
    onError: (e) => toast.error(`Call failed: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:text-white">
          <PhoneCall className="w-4 h-4" />
          Test Call
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Make a Test Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300 text-sm">Call To (your phone number)</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+12125551234"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Call From (Telnyx number)</Label>
            {numbers && numbers.length > 0 ? (
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Select a number" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {numbers.map((n: { phoneNumber: string; id: string }) => (
                    <SelectItem key={n.id} value={n.phoneNumber} className="text-white">
                      {n.phoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="+12125559876"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            )}
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Voice App (Connection ID)</Label>
            {voiceApps && voiceApps.length > 0 ? (
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Select voice app" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {voiceApps.map((app: { id: string; name: string }) => (
                    <SelectItem key={app.id} value={app.id} className="text-white">
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                placeholder="Connection ID from Telnyx portal"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            )}
          </div>

          <div>
            <Label className="text-slate-300 text-sm">AI Voice</Label>
            <Select value={voice} onValueChange={(v) => setVoice(v as typeof voice)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="professional_female" className="text-white">Professional Female</SelectItem>
                <SelectItem value="professional_male" className="text-white">Professional Male</SelectItem>
                <SelectItem value="female" className="text-white">Female</SelectItem>
                <SelectItem value="male" className="text-white">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Test Script</Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={3}
              className="bg-slate-800 border-slate-700 text-white mt-1 resize-none"
            />
          </div>

          <Button
            onClick={() => {
              if (!to || !from || !connectionId) {
                toast.error("Please fill in all required fields");
                return;
              }
              callMutation.mutate({ to, from, connectionId, script, voice });
            }}
            disabled={callMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {callMutation.isPending ? "Calling..." : "Make Test Call"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
