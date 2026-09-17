import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Brain, MessageSquare, RefreshCw, Trash2, User, Building2,
  Target, Clock, TrendingUp, Sparkles, AlertTriangle
} from "lucide-react";

export default function MemoryBrain() {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [goals, setGoals] = useState("");

  const { data: memory, refetch: refetchMemory } = trpc.memory.getMemory.useQuery();

  // Populate form when memory data loads
  useState(() => {
    if (memory) {
      setBusinessName(memory.businessName ?? "");
      setIndustry(memory.industry ?? "");
      setGoals(memory.goals ?? "");
    }
  });

  const { data: interactions } = trpc.memory.getInteractions.useQuery({ limit: 20 });

  const updateProfile = trpc.memory.updateProfile.useMutation({
    onSuccess: () => { toast.success("Memory profile updated!"); refetchMemory(); },
    onError: (e) => toast.error(e.message),
  });

  const refreshDigest = trpc.memory.refreshDigest.useMutation({
    onSuccess: (data) => {
      toast.success("Memory digest refreshed!");
      refetchMemory();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMemory = trpc.memory.resetMemory.useMutation({
    onSuccess: () => { toast.success("Memory reset"); refetchMemory(); },
    onError: (e) => toast.error(e.message),
  });

  const SENTIMENT_COLOR = {
    positive: "text-green-500",
    neutral: "text-slate-400",
    negative: "text-red-400",
  };

  return (
    <PageShell title="Memory Brain" subtitle="Manage your AI agents' long-term memory and knowledge" icon={<Brain className="w-5 h-5" />}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-500" />
              AI Memory Brain
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your persistent AI data brain — every agent knows your history, preferences, and goals
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshDigest.mutate()}
              disabled={refreshDigest.isPending}
            >
              {refreshDigest.isPending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              Refresh Digest
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => {
                if (confirm("Reset all memory? This cannot be undone.")) resetMemory.mutate();
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{memory?.interactionCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Total Interactions</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {memory?.lastActiveAt
                    ? new Date(memory.lastActiveAt).toLocaleDateString()
                    : "Never"}
                </div>
                <div className="text-xs text-muted-foreground">Last Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {memory?.contextDigest ? "Active" : "Not built yet"}
                </div>
                <div className="text-xs text-muted-foreground">Memory Digest</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Business Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Business Profile
              </CardTitle>
              <CardDescription>
                Help your AI agents understand your business context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  placeholder="e.g. SaaS, E-commerce, Healthcare"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Goals & Objectives</Label>
                <Textarea
                  placeholder="e.g. Increase MRR to $50k, improve lead quality, automate customer support..."
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updateProfile.mutate({ businessName, industry, goals })}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* AI Context Digest */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> AI Context Digest
              </CardTitle>
              <CardDescription>
                Auto-generated summary injected into every AI conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memory?.contextDigest ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 text-sm leading-relaxed">
                    {memory.contextDigest}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This digest is automatically prepended to every AI agent conversation so they know your context from the first message.
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No digest yet.</p>
                  <p className="text-xs mt-1">Chat with any agent a few times, then click "Refresh Digest" to build your memory profile.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => refreshDigest.mutate()}
                    disabled={refreshDigest.isPending || !interactions?.length}
                  >
                    <Sparkles className="w-4 h-4 mr-1" /> Build Digest Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">How the Memory Brain works</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Every time you chat with an AI agent, the conversation is logged to your memory brain. 
                  After 5+ interactions, click "Refresh Digest" to generate a personalized context summary. 
                  From then on, every agent you talk to will know your business, goals, and preferences — 
                  no need to re-explain yourself every time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Interactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent AI Interactions</CardTitle>
            <CardDescription>Your conversation history across all agents</CardDescription>
          </CardHeader>
          <CardContent>
            {!interactions?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No interactions logged yet. Start chatting with an AI agent!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interactions.map(interaction => (
                  <div key={interaction.id} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {interaction.agentName && (
                          <Badge variant="outline" className="text-xs">{interaction.agentName}</Badge>
                        )}
                        <span className={`text-xs ${SENTIMENT_COLOR[interaction.sentiment as keyof typeof SENTIMENT_COLOR] ?? "text-slate-400"}`}>
                          ● {interaction.sentiment}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(interaction.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">You: {interaction.userMessage}</p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">AI: {interaction.agentResponse}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
