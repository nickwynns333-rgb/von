import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Volume2,
  VolumeX,
  Loader2,
  Send,
} from "lucide-react";
import { Room, RoomEvent, RemoteParticipant, Track } from "livekit-client";
import { SimliClient } from "@/lib/simli-shim";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function LiveMeetingRoom() {
  const [, params] = useRoute("/meet/:slug/room");
  const slug = params?.slug ?? "";

  const [phase, setPhase] = useState<"connecting" | "live" | "ended">("connecting");
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [participantName] = useState("Guest");

  const videoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const simliRef = useRef<SimliClient | null>(null);
  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const openVoiceAudioUrlRef = useRef<string | null>(null);

  const getLiveKitTokenMutation = trpc.avatarStudio.getLiveKitToken.useMutation();
  const startAvatarSessionMutation = trpc.avatarStudio.startAvatarSession.useMutation();
  const synthesizeMeetingSpeechMutation = trpc.avatarStudio.synthesizeMeetingSpeech.useMutation();
  const [meetingSpeechProvider, setMeetingSpeechProvider] = useState<"openvoice" | "built_in" | "managed">("built_in");
  const [openVoiceReady, setOpenVoiceReady] = useState(false);

  const { data: meetingData } = trpc.meetings.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const agentChatMutation = trpc.agents.chat.useMutation({
    onSuccess: (data) => {
      const reply = data.reply;
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: new Date() },
      ]);
      void speakText(reply);
    },
  });

  // ─── Start LiveKit room ───────────────────────────────────────────────────
  const connectToRoom = useCallback(async () => {
    try {
      const { token, roomName, livekitUrl } = await getLiveKitTokenMutation.mutateAsync({
        meetingSlug: slug,
        participantName,
      });

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log("[LiveKit] Participant connected:", participant.identity);
      });

      await room.connect(livekitUrl, token);
      await room.localParticipant.enableCameraAndMicrophone();

      // Show local video
      const localTrack = room.localParticipant.videoTrackPublications.values().next().value;
      if (localTrack?.track && userVideoRef.current) {
        localTrack.track.attach(userVideoRef.current);
      }

      console.log("[LiveKit] Connected to room:", roomName);
    } catch (err) {
      console.error("[LiveKit] Connection error:", err);
    }
  }, [slug, participantName]);

  // ─── Start Simli avatar session ───────────────────────────────────────────
  const startSimliAvatar = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const sessionData = await startAvatarSessionMutation.mutateAsync({ meetingSlug: slug });
      setMeetingSpeechProvider(sessionData.speechProvider as "openvoice" | "built_in" | "managed");
      setOpenVoiceReady(Boolean(sessionData.openVoice?.configured && sessionData.openVoiceProfileId));

      // Simli v3 API: constructor takes (session_token, videoElement, audioElement, ...)
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);

      const simli = new SimliClient(
        sessionData.session_token ?? "",
        videoRef.current!,
        audioEl,
        null // iceServers — use defaults
      );
      simliRef.current = simli;

      await simli.start();
      setPhase("live");
      setAgentSpeaking(true);

      // Greet the user
      const greeting = `Hello! I'm ${sessionData.agentName}. How can I help you today?`;
      setChatMessages([{ role: "assistant", content: greeting, timestamp: new Date() }]);
      void speakText(greeting);
    } catch (err) {
      console.error("[Simli] Avatar session error:", err);
      // Fall back to live mode without avatar
      setPhase("live");
    }
  }, [slug]);

  // ─── OpenVoice speech with browser TTS fallback ───────────────────────────
  const speakText = useCallback(
    async (text: string) => {
      if (!speakerEnabled) return;
      if (meetingSpeechProvider === "openvoice" && openVoiceReady) {
        try {
          const result = await synthesizeMeetingSpeechMutation.mutateAsync({ meetingSlug: slug, text, format: "wav" });
          const bytes = Uint8Array.from(atob(result.audioBase64), (character) => character.charCodeAt(0));
          const blobUrl = URL.createObjectURL(new Blob([bytes], { type: result.contentType }));
          if (openVoiceAudioUrlRef.current) URL.revokeObjectURL(openVoiceAudioUrlRef.current);
          openVoiceAudioUrlRef.current = blobUrl;
          const audio = new Audio(blobUrl);
          simliRef.current?.listenToAudioElement(audio);
          audio.onplay = () => setAgentSpeaking(true);
          audio.onended = () => {
            setAgentSpeaking(false);
            URL.revokeObjectURL(blobUrl);
            if (openVoiceAudioUrlRef.current === blobUrl) openVoiceAudioUrlRef.current = null;
            startListening();
          };
          await audio.play();
          return;
        } catch (error) {
          console.warn("[OpenVoice] Meeting synthesis unavailable; using browser speech fallback.", error);
        }
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setAgentSpeaking(true);
        utterance.onend = () => {
          setAgentSpeaking(false);
          startListening();
        };
        window.speechSynthesis.speak(utterance);
      }
    },
    [speakerEnabled, meetingSpeechProvider, openVoiceReady, synthesizeMeetingSpeechMutation, slug]
  );

  // ─── Speech recognition (STT) ────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!micEnabled) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        handleUserSpeech(transcript);
      }
    };

    recognition.onerror = () => {
      // Silently retry
      setTimeout(startListening, 1000);
    };

    recognition.start();
  }, [micEnabled]);

  const handleUserSpeech = useCallback(
    (text: string) => {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: text, timestamp: new Date() },
      ]);

      const agentId = (meetingData as unknown as { agentId?: number })?.agentId;
      if (agentId) {
        agentChatMutation.mutate({
          agentId,
          message: text,
          history: chatMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });
      }
    },
    [meetingData, chatMessages]
  );

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    handleUserSpeech(chatInput);
    setChatInput("");
  };

  const toggleMic = () => {
    const newVal = !micEnabled;
    setMicEnabled(newVal);
    roomRef.current?.localParticipant.setMicrophoneEnabled(newVal);
    if (!newVal) {
      recognitionRef.current?.stop();
    } else {
      startListening();
    }
  };

  const toggleSpeaker = () => {
    setSpeakerEnabled(!speakerEnabled);
    if (speakerEnabled) window.speechSynthesis.cancel();
  };

  const endCall = () => {
    window.speechSynthesis.cancel();
    if (openVoiceAudioUrlRef.current) URL.revokeObjectURL(openVoiceAudioUrlRef.current);
    recognitionRef.current?.stop();
    simliRef.current?.stop();
    roomRef.current?.disconnect();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ended");
  };

  // ─── Initialize on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    connectToRoom();
    startSimliAvatar();

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      simliRef.current?.stop();
      roomRef.current?.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slug]);

  // Start listening after avatar speaks
  useEffect(() => {
    if (phase === "live" && !agentSpeaking) {
      startListening();
    }
  }, [phase, agentSpeaking]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ─── Ended screen ─────────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
            <PhoneOff className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Call Ended</h2>
          <p className="text-gray-400 text-sm">Duration: {formatDuration(duration)}</p>
          <Button onClick={() => (window.location.href = "/")} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/80 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-300 font-medium">
            {meetingData?.agentName ?? "AI Agent"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {phase === "connecting" && (
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Connecting…
            </Badge>
          )}
          {phase === "live" && (
            <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
              Live · {formatDuration(duration)}
            </Badge>
          )}
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* AI Avatar (main tile) */}
        <div className="flex-1 relative bg-gray-900">
          {phase === "connecting" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <p className="text-gray-400 text-sm">Connecting to AI agent…</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Agent speaking indicator */}
          {agentSpeaking && phase === "live" && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <div className="flex gap-0.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-cyan-400 rounded-full animate-pulse"
                    style={{
                      height: `${8 + i * 4}px`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Agent name label */}
          <div className="absolute top-4 left-4 bg-black/60 rounded-lg px-3 py-1.5">
            <p className="text-sm text-white font-medium">
              {meetingData?.agentName ?? "AI Agent"}
            </p>
          </div>
        </div>

        {/* User video (picture-in-picture) */}
        <div className="absolute bottom-20 right-4 w-32 h-24 rounded-xl overflow-hidden border border-white/20 bg-gray-800 shadow-xl">
          <video
            ref={userVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5">
            <p className="text-xs text-white">You</p>
          </div>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-80 bg-gray-900 border-l border-white/10 flex flex-col">
            <div className="p-3 border-b border-white/10">
              <p className="text-sm font-medium text-white">Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white"
                        : "bg-gray-800 text-gray-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Type a message…"
                className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-400"
              />
              <Button size="sm" onClick={handleSendChat} className="bg-violet-600 hover:bg-violet-500">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 py-4 bg-gray-900/80 border-t border-white/5">
        <Button
          size="icon"
          variant="outline"
          onClick={toggleMic}
          className={`rounded-full w-12 h-12 border-white/20 ${!micEnabled ? "bg-red-500/20 border-red-500/40 text-red-400" : "text-gray-300"}`}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          size="icon"
          variant="outline"
          onClick={toggleSpeaker}
          className={`rounded-full w-12 h-12 border-white/20 ${!speakerEnabled ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "text-gray-300"}`}
        >
          {speakerEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>

        <Button
          size="icon"
          variant="outline"
          onClick={() => setShowChat(!showChat)}
          className={`rounded-full w-12 h-12 border-white/20 ${showChat ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "text-gray-300"}`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <Button
          size="icon"
          onClick={endCall}
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
