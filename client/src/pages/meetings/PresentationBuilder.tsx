import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles, ChevronLeft, ChevronRight, Copy, Share2,
  Presentation, Plus, Trash2, LayoutDashboard, Bot,
  Video, CreditCard, Settings, BookOpen
} from "lucide-react";
import { useEffect } from "react";

const customerNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "AI Agents", href: "/dashboard#agents", icon: <Bot className="w-4 h-4" /> },
  { label: "Meetings", href: "/dashboard#meetings", icon: <Video className="w-4 h-4" /> },
  { label: "Presentations", href: "/presentations", icon: <Presentation className="w-4 h-4" /> },
  { label: "Knowledge Base", href: "/dashboard#knowledge", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Credits", href: "/dashboard#credits", icon: <CreditCard className="w-4 h-4" /> },
];

// ─── Slide Preview ────────────────────────────────────────────────────────────
function SlidePreview({ slide, index, total, isActive, onClick }: {
  slide: { title: string; content: string };
  index: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isActive ? "border-indigo-500 bg-indigo-500/10" : "border-gray-800 bg-gray-900 hover:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-gray-600 text-xs font-mono">{index + 1}/{total}</span>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </div>
      <p className="text-white text-xs font-medium line-clamp-1">{slide.title}</p>
      <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{slide.content}</p>
    </button>
  );
}

// ─── Full Slide View ──────────────────────────────────────────────────────────
function FullSlideView({ slide, index, total }: {
  slide: { title: string; content: string; notes?: string };
  index: number;
  total: number;
}) {
  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden flex flex-col p-10 shadow-2xl">
      <div className="absolute top-4 right-4 text-gray-600 text-xs font-mono">{index + 1} / {total}</div>
      <div className="w-12 h-1 bg-indigo-500 rounded-full mb-6" />
      <h2 className="text-3xl font-bold text-white mb-5 leading-tight">{slide.title}</h2>
      <p className="text-gray-300 text-lg leading-relaxed flex-1">{slide.content}</p>
      {slide.notes && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-500 text-sm italic">{slide.notes}</p>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PresentationBuilder() {
  const { user, loading, isAuthenticated } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [theme, setTheme] = useState("dark");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPresId, setSelectedPresId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const { data: presentations, refetch } = trpc.meetings.listPresentations.useQuery(
    undefined, { enabled: isAuthenticated }
  );

  const { data: selectedPres } = trpc.meetings.getPresentation.useQuery(
    { id: selectedPresId ?? 0 },
    { enabled: !!selectedPresId }
  );

  const generateMutation = trpc.meetings.generatePresentation.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.slides.length} slides!`);
      setSelectedPresId(data.id);
      setCurrentSlide(0);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!title.trim() || !prompt.trim()) {
      toast.error("Please enter a title and describe your presentation");
      return;
    }
    generateMutation.mutate({ title, prompt, slideCount, theme });
  };

  const slides: Array<{ title: string; content: string; notes?: string }> =
    selectedPres?.slides
      ? (typeof selectedPres.slides === "string"
          ? JSON.parse(selectedPres.slides)
          : selectedPres.slides)
      : [];

  const copyShareLink = (presId: number) => {
    // In production this would create a meeting with this presentation
    const url = `${window.location.origin}/presentations/${presId}`;
    navigator.clipboard.writeText(url);
    toast.success("Presentation link copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardShell title="AI Presentation Builder" navItems={customerNavItems} role="customer">
      <div className="space-y-6">
        <Tabs defaultValue="builder">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="builder" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
              Create New
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400">
              My Presentations ({presentations?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Generation Form */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Generate with AI
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Describe your presentation and AI will create professional slides instantly
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block">Presentation Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. VonWork AI Workforce Solution"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block">What should this presentation cover?</label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={5}
                        placeholder="e.g. A sales presentation for a dental clinic showing how VonWork's AI receptionist can handle appointment booking, reduce no-shows by 40%, and free up staff time. Include ROI calculations and a clear call to action."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1.5 block">Slides</label>
                        <select
                          value={slideCount}
                          onChange={(e) => setSlideCount(parseInt(e.target.value))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                          {[5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                            <option key={n} value={n}>{n} slides</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1.5 block">Theme</label>
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                          {["dark", "light", "corporate", "minimal", "bold"].map((t) => (
                            <option key={t} value={t} className="capitalize">{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending || !title.trim() || !prompt.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {generateMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating {slideCount} slides...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Generate Presentation
                        </span>
                      )}
                    </Button>

                    <p className="text-gray-600 text-xs text-center">Uses 5 credits per generation</p>
                  </CardContent>
                </Card>

                {/* Slide Thumbnails */}
                {slides.length > 0 && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm">Slides ({slides.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                      {slides.map((slide, i) => (
                        <SlidePreview
                          key={i}
                          slide={slide}
                          index={i}
                          total={slides.length}
                          isActive={currentSlide === i}
                          onClick={() => setCurrentSlide(i)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Slide Preview */}
              <div className="lg:col-span-2">
                {slides.length > 0 ? (
                  <div className="space-y-4">
                    <FullSlideView slide={slides[currentSlide]} index={currentSlide} total={slides.length} />

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                        disabled={currentSlide === 0}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>

                      <div className="flex gap-1">
                        {slides.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? "bg-indigo-500" : "bg-gray-700"}`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
                        disabled={currentSlide === slides.length - 1}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    {/* Actions */}
                    {selectedPresId && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyShareLink(selectedPresId)}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Link
                        </Button>
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-500"
                          onClick={() => toast.info("Create a Video Sales Agent to use this presentation in meetings")}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Use in Meeting
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <Presentation className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium text-gray-500">Your presentation will appear here</p>
                      <p className="text-sm mt-2">Fill in the form and click Generate</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library">
            {!presentations?.length ? (
              <div className="text-center py-16 text-gray-500">
                <Presentation className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No presentations yet</p>
                <p className="text-sm mt-2">Create your first AI-generated presentation above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {presentations.map((pres) => {
                  const presSlides = pres.slides
                    ? (typeof pres.slides === "string" ? JSON.parse(pres.slides) : pres.slides)
                    : [];
                  return (
                    <Card
                      key={pres.id}
                      className={`bg-gray-900 border-gray-800 hover:border-gray-700 transition-all cursor-pointer ${selectedPresId === pres.id ? "border-indigo-500" : ""}`}
                      onClick={() => { setSelectedPresId(pres.id); setCurrentSlide(0); }}
                    >
                      {/* Mini slide preview */}
                      <div className="h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-xl p-4 overflow-hidden">
                        {presSlides[0] && (
                          <>
                            <div className="w-6 h-0.5 bg-indigo-500 rounded mb-2" />
                            <p className="text-white text-xs font-bold line-clamp-1">{presSlides[0].title}</p>
                            <p className="text-gray-500 text-xs line-clamp-2 mt-1">{presSlides[0].content}</p>
                          </>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="text-white font-medium text-sm mb-1 line-clamp-1">{pres.title}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">
                              {presSlides.length} slides
                            </Badge>
                            <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs capitalize">
                              {pres.theme}
                            </Badge>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyShareLink(pres.id); }}
                            className="text-gray-600 hover:text-gray-400 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-gray-600 text-xs mt-2">
                          {new Date(pres.createdAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
