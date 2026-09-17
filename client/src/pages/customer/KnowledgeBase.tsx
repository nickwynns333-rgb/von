import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Upload,
  Search,
  Trash2,
  FileText,
  Loader2,
  ChevronRight,
  Database,
  Zap,
  X,
} from "lucide-react";
import { getLoginUrl } from "@/const";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    ready: "bg-green-500/20 text-green-400 border-green-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}

// ─── Create KB Dialog ─────────────────────────────────────────────────────────

function CreateKBDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createKB = trpc.kb.create.useMutation({
    onSuccess: () => {
      toast.success("Knowledge base created!");
      setOpen(false);
      setName("");
      setDescription("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          New Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200 text-gray-900">
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription className="text-gray-400">
            A knowledge base stores documents your AI agents can search and reference.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm text-gray-300 mb-1 block">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product FAQ, Sales Scripts"
              className="bg-white border-gray-200 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of content will this KB contain?"
              className="bg-white border-gray-200 text-white resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-400">
            Cancel
          </Button>
          <Button
            onClick={() => createKB.mutate({ name, description })}
            disabled={!name.trim() || createKB.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {createKB.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ kbId, onUploaded }: { kbId: number; onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kbId", String(kbId));

        const res = await fetch("/api/kb/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");

        toast.success(`"${file.name}" uploaded — processing in background`);
        onUploaded();
      } catch (e: any) {
        toast.error(e.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [kbId, onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-violet-500 bg-violet-500/10"
          : "border-gray-600 hover:border-violet-500/50 hover:bg-gray-50"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.csv"
        className="hidden"
        onChange={handleFileChange}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-gray-300 text-sm">Uploading & processing…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-8 h-8 text-gray-500" />
          <div>
            <p className="text-gray-300 text-sm font-medium">Drop a file here or click to browse</p>
            <p className="text-gray-500 text-xs mt-1">PDF, DOCX, TXT, MD, CSV — max 10 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KB Detail Panel ──────────────────────────────────────────────────────────

function KBDetailPanel({ kbId, kbName }: { kbId: number; kbName: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  const docsQuery = trpc.kb.listDocuments.useQuery({ kbId }, { refetchInterval: 5000 });
  const chunksQuery = trpc.kb.getChunks.useQuery(
    { docId: selectedDocId! },
    { enabled: selectedDocId !== null }
  );
  const searchMutation = trpc.kb.search.useMutation({
    onSuccess: (data) => setSearchResults(data),
    onError: (e) => toast.error(e.message),
  });
  const deleteDocMutation = trpc.kb.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      docsQuery.refetch();
      setSelectedDocId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-violet-400" />
          Upload Documents
        </h3>
        <UploadZone kbId={kbId} onUploaded={() => docsQuery.refetch()} />
      </div>

      {/* Documents list */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          Documents ({docsQuery.data?.length ?? 0})
        </h3>
        {docsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : docsQuery.data?.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents yet. Upload one above.</p>
        ) : (
          <div className="space-y-2">
            {docsQuery.data?.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDocId === doc.id
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-gray-700 bg-gray-50 hover:border-gray-600"
                }`}
                onClick={() => setSelectedDocId(selectedDocId === doc.id ? null : doc.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {doc.chunkCount} chunks · {doc.charCount?.toLocaleString()} chars
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${doc.filename}"?`)) {
                        deleteDocMutation.mutate({ docId: doc.id });
                      }
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunk viewer */}
      {selectedDocId && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />
            Chunks ({chunksQuery.data?.length ?? 0})
          </h3>
          {chunksQuery.isLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading chunks…
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {chunksQuery.data?.map((chunk) => (
                <div key={chunk.id} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-violet-400 font-mono">Chunk #{chunk.chunkIndex + 1}</span>
                    <span className="text-xs text-gray-500">{chunk.tokenCount} tokens</span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-4 leading-relaxed">{chunk.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Semantic search */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-violet-400" />
          Test Semantic Search
        </h3>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask a question to test retrieval…"
            className="bg-white border-gray-200 text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                searchMutation.mutate({ kbId, query: searchQuery, topK: 5 });
              }
            }}
          />
          <Button
            onClick={() => searchMutation.mutate({ kbId, query: searchQuery, topK: 5 })}
            disabled={!searchQuery.trim() || searchMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
          >
            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">{searchResults.length} results found</p>
            {searchResults.map((r, i) => (
              <div key={r.chunkId} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-violet-400 font-medium">Result #{i + 1}</span>
                  <span className="text-xs text-green-400 font-mono">
                    {(r.similarity * 100).toFixed(1)}% match
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-5 leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [selectedKBId, setSelectedKBId] = useState<number | null>(null);

  const kbsQuery = trpc.kb.list.useQuery(undefined, { enabled: isAuthenticated });
  const deleteKBMutation = trpc.kb.delete.useMutation({
    onSuccess: () => {
      toast.success("Knowledge base deleted");
      setSelectedKBId(null);
      kbsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const selectedKB = kbsQuery.data?.find((kb) => kb.id === selectedKBId);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/90 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Knowledge Base</h1>
              <p className="text-xs text-gray-500">Upload documents · Embed & search · Power your AI agents</p>
            </div>
          </div>
          <CreateKBDialog onCreated={() => kbsQuery.refetch()} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KB List */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              {kbsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </div>
              ) : kbsQuery.data?.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No knowledge bases yet</p>
                  <p className="text-gray-600 text-xs mt-1">Create one to get started</p>
                </div>
              ) : (
                kbsQuery.data?.map((kb) => (
                  <div
                    key={kb.id}
                    onClick={() => setSelectedKBId(kb.id === selectedKBId ? null : kb.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                      selectedKBId === kb.id
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{kb.name}</p>
                        {kb.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{kb.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {kb.docCount} docs
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {kb.chunkCount} chunks
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <ChevronRight
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            selectedKBId === kb.id ? "rotate-90 text-violet-400" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* KB Detail */}
          <div className="lg:col-span-2">
            {selectedKB ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-gray-800 text-base">{selectedKB.name}</CardTitle>
                      {selectedKB.description && (
                        <CardDescription className="text-gray-400 mt-1">
                          {selectedKB.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${selectedKB.name}" and all its documents?`)) {
                            deleteKBMutation.mutate({ id: selectedKB.id });
                          }
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedKBId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <KBDetailPanel kbId={selectedKB.id} kbName={selectedKB.name} />
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center py-24">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">Select a knowledge base to manage it</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Or create a new one to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
