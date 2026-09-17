import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  ChevronLeft, ChevronRight, Send, Volume2, VolumeX, Maximize2
} from "lucide-react";

// ─── Slide Renderer ───────────────────────────────────────────────────────────
function SlideView({ slide, index, total }: {
  slide: { title: string; content: string; notes?: string };
  index: number;
  total: number;
}) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden flex flex-col p-8">
      {/* Slide number */}
      <div className="absolute top-4 right-4 text-gray-600 text-xs font-mono">
        {index + 1} / {total}
      </div>
      {/* Accent bar */}
      <div className="w-12 h-1 bg-indigo-500 rounded-full mb-6" />
      <h2 className="text-2xl font-bold text-white mb-4 leading-tight">{slide.title}</h2>
      <p className="text-gray-300 text-base leading-relaxed flex-1">{slide.content}</p>
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />
    </div>
  );
}

// ─── AI Avatar ────────────────────────────────────────────────────────────────
function AIAvatar({ name, isSpeaking }: { name: string; isSpeaking: boolean }) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Animated gradient background */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isSpeaking ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-purple-900/40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Avatar circle */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl transition-transform duration-200 ${isSpeaking ? "scale-105" : "scale-100"}`}>
          {name.charAt(0).toUpperCase()}
          {/* Speaking ring */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full border-4 border-indigo-400/60 animate-ping" />
          )}
        </div>

        {/* Waveform when speaking */}
        <div className="flex items-end gap-1 h-8">
          {[3, 6, 4, 8, 5, 7, 3, 6, 4, 5].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${isSpeaking ? "bg-indigo-400" : "bg-gray-700"}`}
              style={{
                height: isSpeaking ? `${h * 3}px` : "4px",
                animationDelay: `${i * 80}ms`,
                animation: isSpeaking ? `waveform 0.8s ease-in-out ${i * 80}ms infinite alternate` : "none",
              }}
            />
          ))}
        </div>

        <p className="text-white font-semibold">{name}</p>
        <Badge className={`text-xs ${isSpeaking ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
          {isSpeaking ? "Speaking..." : "Listening"}
        </Badge>
      </div>

      <style>{`
        @keyframes waveform {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ slug, agentName }: { slug: string; agentName: string }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: `Hi! I'm ${agentName}. How can I help you today?` }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.meetings.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
  });

  const sendMessage = useCallback(() => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    chatMutation.mutate({ slug, message: userMsg, history: messages });
  }, [input, messages, slug, chatMutation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <span className="text-white text-sm font-medium">Chat with {agentName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-gray-800 text-gray-200 rounded-bl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || chatMutation.isPending}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Meeting Room ────────────────────────────────────────────────────────
export default function MeetingRoom() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [ended, setEnded] = useState(false);

  // Get participant info from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const participantName = urlParams.get("name") ?? "Guest";

  const { data: meeting } = trpc.meetings.getBySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug }
  );

  const { data: presentation } = trpc.meetings.getPresentation.useQuery(
    { id: meeting?.presentationId ?? 0 },
    { enabled: !!meeting?.presentationId }
  );

  const slides: Array<{ title: string; content: string }> = presentation?.slides
    ? (typeof presentation.slides === "string" ? JSON.parse(presentation.slides) : presentation.slides)
    : [];

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate AI speaking (in production this would be driven by TTS/WebRTC)
  useEffect(() => {
    const toggle = setInterval(() => {
      setIsSpeaking((s) => !s);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(toggle);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setEnded(true);
    setTimeout(() => navigate("/"), 3000);
  };

  if (ended) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Call Ended</h2>
          <p className="text-gray-400">Duration: {formatDuration(callDuration)}</p>
          <p className="text-gray-600 text-sm mt-4">Redirecting you home...</p>
        </div>
      </div>
    );
  }

  const agentName = meeting?.agentName ?? "AI Agent";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-medium text-sm">{meeting?.title ?? "AI Sales Meeting"}</span>
          <Badge className="bg-gray-800 text-gray-400 border-gray-700 text-xs font-mono">
            {formatDuration(callDuration)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">{participantName}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Left: Avatar + Slides */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Avatar + Slides Row */}
          <div className="flex gap-4 h-72">
            {/* AI Avatar */}
            <div className="w-64 shrink-0">
              <AIAvatar name={agentName} isSpeaking={isSpeaking} />
            </div>

            {/* Slides */}
            <div className="flex-1 relative">
              {slides.length > 0 ? (
                <>
                  <SlideView slide={slides[currentSlide]} index={currentSlide} total={slides.length} />
                  {/* Slide navigation */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <button
                      onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                      disabled={currentSlide === 0}
                      className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlide(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? "bg-indigo-500" : "bg-gray-700"}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
                      disabled={currentSlide === slides.length - 1}
                      className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <Maximize2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No presentation loaded</p>
                    <p className="text-xs mt-1">The AI agent will guide the conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participant video placeholder */}
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
            {camOn ? (
              <div className="text-center text-gray-600">
                <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Camera preview</p>
                <p className="text-xs text-gray-700 mt-1">(Camera access required)</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-gray-400">{participantName.charAt(0).toUpperCase()}</span>
                </div>
                <p className="text-gray-500 text-sm">{participantName}</p>
                <p className="text-gray-700 text-xs">Camera off</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat Panel */}
        {showChat && (
          <div className="w-80 shrink-0">
            <ChatPanel slug={params.slug ?? ""} agentName={agentName} />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-4">
        <button
          onClick={() => setMicOn(!micOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          }`}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setCamOn(!camOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            camOn ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          }`}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setSpeakerOn(!speakerOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            speakerOn ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          }`}
        >
          {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setShowChat(!showChat)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            showChat ? "bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-400" : "bg-gray-800 hover:bg-gray-700 text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          onClick={handleEndCall}
          className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
