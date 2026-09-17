import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Sparkles, CheckCircle, AlertCircle, TrendingUp,
  Mail, ListChecks, Target, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import { useLocation } from "wouter";

interface SummaryResult {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  interestLevel: "high" | "medium" | "low";
  keyPoints: string[];
  objections: string[];
  actionItems: Array<{ task: string; owner: string; dueDate: string }>;
  nextSteps: string;
  dealProbability: number;
  estimatedValue: string | null;
  followUpMessage: string;
}

const sentimentColors = {
  positive: "bg-green-500/20 text-green-400 border-green-500/30",
  neutral: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  negative: "bg-red-500/20 text-red-400 border-red-500/30",
};

const interestColors = {
  high: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function PostMeetingSummary() {
  const [, navigate] = useLocation();
  const [transcript, setTranscript] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const generateMutation = trpc.meetingSummary.generate.useMutation({
    onSuccess: (data) => {
      setResult(data.summary as unknown as SummaryResult);
      toast.success("Meeting summary generated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: pastMeetings } = trpc.meetingSummary.list.useQuery({ limit: 10 });

  const handleGenerate = () => {
    if (!transcript.trim()) {
      toast.error("Please paste a meeting transcript or notes");
      return;
    }
    generateMutation.mutate({ transcript, prospectName, prospectCompany });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold">Post-Meeting Summary</h1>
              <p className="text-white/50 text-sm">AI-powered meeting analysis, action items, and follow-up drafts</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="border-white/10 text-white/70">
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="generate">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="generate">Generate Summary</TabsTrigger>
            <TabsTrigger value="history">Past Meetings</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Card className="bg-[#0f0f1a] border-white/10">
              <CardHeader>
                <CardTitle className="text-base">Meeting Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Prospect Name</Label>
                    <Input
                      placeholder="e.g. Dr. Sarah Johnson"
                      value={prospectName}
                      onChange={(e) => setProspectName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Company / Practice</Label>
                    <Input
                      placeholder="e.g. Bright Smile Dental"
                      value={prospectCompany}
                      onChange={(e) => setProspectCompany(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70">Meeting Transcript / Notes</Label>
                  <Textarea
                    placeholder="Paste the meeting transcript, call notes, or key discussion points here..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={10}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  />
                  <p className="text-xs text-white/30">{transcript.length.toLocaleString()} / 20,000 characters</p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !transcript.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Meeting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Summary
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            {result && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Overview */}
                <Card className="bg-[#0f0f1a] border-white/10">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`border ${sentimentColors[result.sentiment]}`}>
                        Sentiment: {result.sentiment}
                      </Badge>
                      <Badge className={`border ${interestColors[result.interestLevel]}`}>
                        Interest: {result.interestLevel}
                      </Badge>
                      <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {result.dealProbability}% close probability
                      </Badge>
                      {result.estimatedValue && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Est. value: {result.estimatedValue}
                        </Badge>
                      )}
                    </div>
                    <p className="text-white/80 leading-relaxed">{result.summary}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Key Points */}
                  <Card className="bg-[#0f0f1a] border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Key Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Objections */}
                  <Card className="bg-[#0f0f1a] border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        Objections Raised
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.objections.length === 0 ? (
                        <p className="text-sm text-white/40">No objections raised — great sign!</p>
                      ) : (
                        <ul className="space-y-2">
                          {result.objections.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                              {obj}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Action Items */}
                <Card className="bg-[#0f0f1a] border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-cyan-400" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.actionItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.owner === "sales" ? "bg-cyan-400" : "bg-violet-400"}`} />
                          <span className="flex-1 text-sm text-white/80">{item.task}</span>
                          <Badge variant="outline" className={`text-xs ${item.owner === "sales" ? "border-cyan-500/30 text-cyan-400" : "border-violet-500/30 text-violet-400"}`}>
                            {item.owner}
                          </Badge>
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.dueDate}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-400">Recommended Next Step</span>
                      </div>
                      <p className="text-sm text-white/70">{result.nextSteps}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Follow-up Email */}
                <Card className="bg-[#0f0f1a] border-white/10">
                  <CardHeader className="pb-2">
                    <button
                      onClick={() => setShowFollowUp(!showFollowUp)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <Mail className="w-4 h-4 text-violet-400" />
                      <CardTitle className="text-sm">AI-Generated Follow-Up Email</CardTitle>
                      {showFollowUp ? <ChevronUp className="w-4 h-4 ml-auto text-white/40" /> : <ChevronDown className="w-4 h-4 ml-auto text-white/40" />}
                    </button>
                  </CardHeader>
                  {showFollowUp && (
                    <CardContent>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{result.followUpMessage}</pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-white/10 text-white/70"
                        onClick={() => {
                          navigator.clipboard.writeText(result.followUpMessage);
                          toast.success("Follow-up email copied to clipboard!");
                        }}
                      >
                        Copy to Clipboard
                      </Button>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="bg-[#0f0f1a] border-white/10">
              <CardContent className="p-0">
                {!pastMeetings || pastMeetings.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p>No past meetings yet. Generate your first summary above.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {pastMeetings.map((meeting) => (
                      <div key={meeting.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">{meeting.title ?? meeting.prospectName ?? "Meeting"}</p>
                          <p className="text-xs text-white/40">{new Date(meeting.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge
                          className={
                            meeting.status === "ended" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            meeting.status === "live" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                            "bg-white/10 text-white/50 border-white/10"
                          }
                        >
                          {meeting.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
