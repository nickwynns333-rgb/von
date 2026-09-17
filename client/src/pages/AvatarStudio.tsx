import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Upload, CheckCircle, Loader2, User, Sparkles, Camera, Video } from "lucide-react";

export default function AvatarStudio() {
  const [, params] = useRoute("/agents/:id/avatar-studio");
  const agentId = parseInt(params?.id ?? "0");
  const [uploading, setUploading] = useState(false);
  const [selectedStockAvatar, setSelectedStockAvatar] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [simliFaceId, setSimliFaceId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: config, refetch } = trpc.avatarStudio.getAgentAvatarConfig.useQuery(
    { agentId },
    { enabled: agentId > 0 }
  );

  const { data: stockAvatars = [], isLoading: loadingAvatars } = trpc.avatarStudio.listAvatars.useQuery();

  const assignStockMutation = trpc.avatarStudio.assignStockAvatar.useMutation({
    onSuccess: () => {
      toast.success("Avatar assigned! Your agent now has a live video avatar.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const createAvatarMutation = trpc.avatarStudio.createAvatar.useMutation({
    onSuccess: () => {
      toast.success("Custom avatar created! Processing may take a few minutes.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const createConsentMutation = trpc.avatarStudio.createMediaConsent.useMutation({ onError: (e) => toast.error(e.message) });
  const connectFaceMutation = trpc.avatarStudio.connectSimliFace.useMutation({
    onSuccess: () => { toast.success("Simli face connected to this agent."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (file: File) => {
    if (!subjectName.trim() || !typedSignature.trim() || !rightsConfirmed) {
      toast.error("Confirm the rights and sign the likeness consent before uploading a custom avatar.");
      return;
    }
    setUploading(true);
    try {
      const consent = await createConsentMutation.mutateAsync({
        agentId,
        mediaType: "AVATAR",
        subjectName,
        purpose: "Create and operate a custom AI video avatar for this VonWork agent.",
        rightsConfirmed: true,
        disclosureConfirmed: true,
        typedSignature,
      });
      // Upload to S3 via storage endpoint
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url, key } = await res.json();
      setPreviewUrl(url);

      // Create Simli avatar from uploaded image
      await createAvatarMutation.mutateAsync({
        agentId,
        name: `Agent ${agentId} Avatar`,
        imageUrl: url,
        avatarVideoKey: key,
        consentRecordId: consent.consentRecordId,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAssignStock = (avatarId: string, thumbnailUrl?: string) => {
    setSelectedStockAvatar(avatarId);
    assignStockMutation.mutate({
      agentId,
      simliAvatarId: avatarId,
      avatarUrl: thumbnailUrl,
    });
  };

  const handleConnectFace = async () => {
    if (!simliFaceId.trim() || !subjectName.trim() || !typedSignature.trim() || !rightsConfirmed) {
      toast.error("Enter a Simli Face ID and complete the likeness consent first.");
      return;
    }
    try {
      const consent = await createConsentMutation.mutateAsync({
        agentId,
        mediaType: "AVATAR",
        subjectName,
        purpose: "Connect and operate an existing Simli face as a VonWork AI video avatar.",
        rightsConfirmed: true,
        disclosureConfirmed: true,
        typedSignature,
      });
      await connectFaceMutation.mutateAsync({ agentId, simliFaceId: simliFaceId.trim(), consentRecordId: consent.consentRecordId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect the Simli face.");
    }
  };

  return (
    <PageShell title="Avatar Studio" subtitle="Create and customize AI video avatars for your agents" icon={<Video className="w-5 h-5" />}>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Sparkles className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            {/* Title moved to PageShell header */}
            <p className="text-sm text-gray-600">
              Choose a live video avatar for your AI agent's meeting room
            </p>
          </div>
        </div>

        {/* Current Status */}
        {config?.simliAvatarId && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="flex items-center gap-3 pt-4">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-300">Avatar configured</p>
                <p className="text-xs text-gray-400">ID: {config.simliAvatarId}</p>
              </div>
              {config.avatarUrl && (
                <img
                  src={config.avatarUrl}
                  alt="Current avatar"
                  className="w-12 h-12 rounded-full object-cover ml-auto border border-green-500/30"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Custom Photo */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Camera className="w-5 h-5 text-cyan-400" />
              Upload Your Photo
            </CardTitle>
            <CardDescription>
              Upload a clear face photo to create a custom photorealistic avatar. Best results with a
              front-facing portrait on a neutral background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
              <p className="font-bold">Likeness consent is required for a custom avatar.</p>
              <div className="grid sm:grid-cols-2 gap-3"><Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Name of person in the photo" /><Input value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} placeholder="Type your full name as signature" /></div>
              <label className="flex gap-2 items-start cursor-pointer"><input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="mt-1" /><span>I have the subject&apos;s authorization to use this likeness for this AI avatar, and I understand this AI-generated media must be disclosed where required.</span></label>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-violet-400/50 hover:bg-violet-500/5 transition-all"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  <p className="text-sm text-gray-600">Creating your avatar…</p>
                </div>
              ) : previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-violet-400"
                  />
                  <p className="text-sm text-gray-600">Click to change photo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Click to upload photo</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP — max 10MB</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Avatars */}
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <User className="w-5 h-5 text-cyan-400" />
              Connect a Simli Face
            </CardTitle>
            <CardDescription>
              Choose or create a face in your Simli dashboard, then paste its Face ID here. This avoids reliance on a deprecated public avatar-list endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-4 mb-5">
              <div className="flex flex-col md:flex-row gap-3">
                <Input value={simliFaceId} onChange={(event) => setSimliFaceId(event.target.value)} placeholder="Paste Simli Face ID" />
                <Button onClick={handleConnectFace} disabled={connectFaceMutation.isPending || createConsentMutation.isPending} className="bg-[#0B1736] hover:bg-[#1647B9] text-white">
                  {connectFaceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect Face"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Your active likeness consent above is recorded before a Face ID can be linked.</p>
            </div>
            {loadingAvatars ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : stockAvatars.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stockAvatars.map((avatar) => {
                  const isSelected =
                    selectedStockAvatar === avatar.avatar_id ||
                    config?.simliAvatarId === avatar.avatar_id;
                  return (
                    <button
                      key={avatar.avatar_id}
                      onClick={() =>
                        handleAssignStock(avatar.avatar_id, avatar.thumbnail_url)
                      }
                      disabled={assignStockMutation.isPending}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                        isSelected
                          ? "border-violet-400 ring-2 ring-violet-400/30"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {avatar.thumbnail_url ? (
                        <img
                          src={avatar.thumbnail_url}
                          alt={avatar.avatar_name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white font-medium truncate">
                          {avatar.avatar_name}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-violet-500 text-white text-xs px-1.5 py-0.5">
                            Active
                          </Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : <p className="text-xs text-gray-500">No public stock-face list is requested. Use a Face ID from your authenticated Simli dashboard, or create a consented custom avatar above.</p>}
          </CardContent>
        </Card>

        {/* Action */}
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
