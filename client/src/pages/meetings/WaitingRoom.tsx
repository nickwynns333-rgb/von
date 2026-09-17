import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff, Phone } from "lucide-react";

export default function WaitingRoom() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [joining, setJoining] = useState(false);

  // Pre-fill email from query param (like SalesCloser)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam);
  }, []);

  const { data: meeting, isLoading } = trpc.meetings.getBySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug }
  );

  // For the waiting room we use the public meeting data directly
  // The agent info is embedded in the meeting query result
  const agent = meeting ? {
    agentName: meeting.agentName ?? "AI Agent",
    agentType: "video_sales",
    avatarUrl: meeting.agentAvatarUrl,
  } : null;

  const handleJoin = () => {
    if (!name.trim()) { alert("Please enter your name"); return; }
    // Navigate to the meeting room with the slug
    navigate(`/meet/${params.slug}/room?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting || !agent) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Meeting Not Found</h2>
          <p className="text-gray-400">This meeting link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Agent Card */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* Avatar placeholder */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-500/30">
                {agent.agentName.charAt(0).toUpperCase()}
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white">{agent.agentName}</h2>
            <p className="text-gray-400 text-sm mt-1 capitalize">{agent.agentType.replace("_", " ")} AI Agent</p>
            <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              Ready to meet
            </Badge>
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Your Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Enter your name"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>
          </div>

          {/* Media toggles */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                micOn ? "bg-gray-800 border-gray-700 text-white" : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {micOn ? "Mic On" : "Mic Off"}
            </button>
            <button
              onClick={() => setCamOn(!camOn)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                camOn ? "bg-gray-800 border-gray-700 text-white" : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              {camOn ? "Cam On" : "Cam Off"}
            </button>
          </div>

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            disabled={!name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Join Call with {agent.agentName}
              </span>
          </Button>

          <p className="text-center text-gray-600 text-xs mt-4">
            Powered by VonWork AI · Your conversation may be recorded
          </p>
        </div>
      </div>
    </div>
  );
}
