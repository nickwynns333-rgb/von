import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Mic, Upload, CheckCircle, Loader2, Play, Square, Sparkles } from "lucide-react";

const BUILT_IN_VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral, balanced" },
  { id: "echo", name: "Echo", description: "Clear, professional" },
  { id: "fable", name: "Fable", description: "Warm, storytelling" },
  { id: "onyx", name: "Onyx", description: "Deep, authoritative" },
  { id: "nova", name: "Nova", description: "Energetic, friendly" },
  { id: "shimmer", name: "Shimmer", description: "Soft, calm" },
];

export default function VoiceStudio() {
  const [, params] = useRoute("/agents/:id/voice-studio");
  const agentId = parseInt(params?.id ?? "0");

  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedBuiltIn, setSelectedBuiltIn] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: config, refetch } = trpc.avatarStudio.getAgentAvatarConfig.useQuery(
    { agentId },
    { enabled: agentId > 0 }
  );
  const { data: openVoiceStatus } = trpc.avatarStudio.getOpenVoiceStatus.useQuery();
  const [gatewayHealth, setGatewayHealth] = useState<{ configured: boolean; healthy: boolean; status?: number } | null>(null);
  const speechConfig = (config?.config ?? {}) as Record<string, unknown>;
  const usesOpenVoice = speechConfig.speechProvider === "openvoice";

  const checkGatewayMutation = trpc.avatarStudio.checkOpenVoiceHealth.useMutation({
    onSuccess: (result) => {
      setGatewayHealth(result);
      if (result.healthy) toast.success("OpenVoice gateway responded to the protected health check.");
      else toast.error(result.configured ? "OpenVoice gateway did not pass the protected health check." : "OpenVoice gateway configuration is incomplete.");
    },
    onError: (error) => toast.error(error.message),
  });

  const cloneVoiceMutation = trpc.avatarStudio.cloneVoice.useMutation({
    onSuccess: () => {
      toast.success("Voice cloned! Your agent will now speak in this voice.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const createConsentMutation = trpc.avatarStudio.createMediaConsent.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const updateAgentMutation = trpc.agents.update.useMutation({
    onSuccess: () => {
      toast.success("Voice updated!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleFileSelect = (file: File) => {
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const handleCloneVoice = async () => {
    if (!audioBlob) return;
    if (!subjectName.trim() || !typedSignature.trim() || !rightsConfirmed) {
      toast.error("Confirm the voice rights and sign the consent before creating a custom voice.");
      return;
    }
    setUploading(true);
    try {
      const consent = await createConsentMutation.mutateAsync({
        agentId,
        mediaType: "VOICE",
        subjectName,
        purpose: "Create and operate a custom AI voice for this VonWork agent.",
        rightsConfirmed: true,
        disclosureConfirmed: true,
        typedSignature,
      });
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-sample.webm");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url, key } = await res.json();

      await cloneVoiceMutation.mutateAsync({
        agentId,
        name: `Agent ${agentId} Voice`,
        audioUrl: url,
        voiceReferenceKey: key,
        consentRecordId: consent.consentRecordId,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Voice cloning failed");
    } finally {
      setUploading(false);
    }
  };

  const setSpeechProviderMutation = trpc.avatarStudio.setSpeechProvider.useMutation({
    onSuccess: () => {
      toast.success("Speech output updated.");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSelectBuiltIn = (voiceId: string) => {
    setSelectedBuiltIn(voiceId);
    setSpeechProviderMutation.mutate({ agentId, provider: "built_in", builtInVoice: voiceId });
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  return (
    <PageShell title="Voice Studio" subtitle="Configure and preview AI voice settings for your agents" icon={<Mic className="w-5 h-5" />}>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            {/* Title moved to PageShell header */}
            <p className="text-sm text-gray-600">
              Clone a custom voice or choose a built-in voice for your AI agent
            </p>
          </div>
        </div>

        {/* Current Status */}
        {(config?.fishVoiceId || usesOpenVoice) && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="flex items-center gap-3 pt-4">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">{usesOpenVoice ? "OpenVoice profile configured" : "Custom voice configured"}</p>
                <p className="text-xs text-gray-600">{usesOpenVoice ? "This approved voice is selected for chatbot and video-agent speech when the OpenVoice gateway is online." : `Voice ID: ${config?.fishVoiceId?.slice(0, 20) ?? "configured"}…`}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900"><Sparkles className="w-5 h-5 text-blue-600" />OpenVoice for chatbots and video agents</CardTitle>
            <CardDescription>After a signed voice consent and sample upload, VonWork selects the OpenVoice profile for spoken chatbot replies and LiveKit/Simli video-agent speech. Text reasoning stays on OpenRouter.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p><strong>Profile:</strong> {usesOpenVoice ? "Selected for this agent" : "Not selected — upload a consented sample below to configure it."}</p>
            <p><strong>Gateway:</strong> {gatewayHealth ? (gatewayHealth.healthy ? "Protected health check passed — ready for controlled synthesis." : `Health check did not pass${gatewayHealth.status ? ` (HTTP ${gatewayHealth.status})` : ""}; built-in voice remains available.`) : openVoiceStatus?.configured ? "Configured — run the protected health check before controlled synthesis." : "Waiting for the GPU-hosted OpenVoice gateway; built-in voice remains available until then."}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2 border-blue-300 text-blue-800" onClick={() => checkGatewayMutation.mutate()} disabled={checkGatewayMutation.isPending}>
              {checkGatewayMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Run protected gateway check
            </Button>
            <p className="text-xs text-gray-500">Voice cloning and avatar use remain consent-gated. Audio is never synthesized until the secure provider service is configured.</p>
          </CardContent>
        </Card>

        {/* Record or Upload Voice Sample */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Mic className="w-5 h-5 text-cyan-400" />
              Clone Your Voice
            </CardTitle>
            <CardDescription>
              Record or upload at least 30 seconds of clear speech to create a custom voice clone.
              The more audio you provide, the better the quality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
              <p className="font-bold">Voice consent is required for custom cloning.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Name of voice subject" />
                <Input value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} placeholder="Type your full name as signature" />
              </div>
              <label className="flex gap-2 items-start cursor-pointer"><input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="mt-1" /><span>I have the subject&apos;s authorization to use this voice for this AI agent, and I understand the synthetic voice must be disclosed where required.</span></label>
            </div>
            {/* Record */}
            <div className="flex gap-3">
              <Button
                onClick={recording ? stopRecording : startRecording}
                variant={recording ? "destructive" : "outline"}
                className={recording ? "" : "border-gray-300 text-gray-300"}
              >
                {recording ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Record Voice
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="border-gray-300 text-gray-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Audio
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>

            {recording && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Recording… speak clearly for at least 30 seconds
              </div>
            )}

            {/* Audio preview */}
            {audioUrl && !recording && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-white/10">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300"
                  onClick={togglePlayback}
                >
                  {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <span className="text-sm text-gray-300">Voice sample ready</span>
                <Button
                  size="sm"
                  onClick={handleCloneVoice}
                  disabled={uploading || cloneVoiceMutation.isPending}
                  className="ml-auto bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {uploading || cloneVoiceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Clone Voice"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Built-in Voices */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Mic className="w-5 h-5 text-violet-400" />
              Built-in Voices
            </CardTitle>
            <CardDescription>
              Use one of OpenAI's high-quality built-in voices — no upload required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BUILT_IN_VOICES.map((voice) => {
                const isSelected = selectedBuiltIn === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => handleSelectBuiltIn(voice.id)}
                    disabled={updateAgentMutation.isPending}
                    className={`p-3 rounded-xl border text-left transition-all hover:scale-105 ${
                      isSelected
                        ? "border-violet-400 bg-violet-500/10 ring-1 ring-violet-400/30"
                        : "border-gray-200 bg-white hover:border-white/30"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{voice.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{voice.description}</p>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-violet-400 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="text-gray-400 border-gray-300"
          >
            Back to Agent
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
