import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Search, Globe, BarChart3, FileText, Zap, TrendingUp, 
  Plus, Trash2, RefreshCw, Target, Link2, MapPin, 
  Code2, Cpu, ShoppingCart, ChevronRight, AlertCircle,
  CheckCircle2, AlertTriangle, Info, Tag, PenTool, Loader2,
  Brain, Bot, Network, MessageSquare, Sparkles, Copy, Star
} from "lucide-react";

const AUDIT_TYPES = [
  { value: "full", label: "Full Audit", icon: BarChart3, description: "Complete SEO analysis" },
  { value: "technical", label: "Technical", icon: Cpu, description: "Crawlability & Core Web Vitals" },
  { value: "content", label: "Content", icon: FileText, description: "E-E-A-T & content quality" },
  { value: "schema", label: "Schema", icon: Code2, description: "Structured data markup" },
  { value: "geo", label: "GEO/AEO", icon: Zap, description: "AI search optimization" },
  { value: "local", label: "Local SEO", icon: MapPin, description: "Local search presence" },
  { value: "keywords", label: "Keywords", icon: Search, description: "Keyword opportunities" },
  { value: "backlinks", label: "Backlinks", icon: Link2, description: "Link building strategy" },
];

const SEVERITY_CONFIG = {
  critical: { color: "text-red-500", bg: "bg-red-50 border-red-200", icon: AlertCircle, badge: "destructive" as const },
  high: { color: "text-orange-500", bg: "bg-orange-50 border-orange-200", icon: AlertTriangle, badge: "destructive" as const },
  medium: { color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: Info, badge: "secondary" as const },
  low: { color: "text-blue-500", bg: "bg-blue-50 border-blue-200", icon: CheckCircle2, badge: "outline" as const },
};

export default function SEODashboard() {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [auditType, setAuditType] = useState("full");
  const [auditUrl, setAuditUrl] = useState("");
  const [keywordSeed, setKeywordSeed] = useState("");
  const [briefKeyword, setBriefKeyword] = useState("");
  const [briefIndustry, setBriefIndustry] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [yourUrl, setYourUrl] = useState("");
  const [activeTab, setActiveTab] = useState("projects");

  const { data: projects, refetch: refetchProjects } = trpc.seo.listProjects.useQuery();
  const { data: audits, refetch: refetchAudits } = trpc.seo.listAudits.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const createProject = trpc.seo.createProject.useMutation({
    onSuccess: () => {
      toast.success("Project created!");
      setNewProjectName("");
      setNewProjectUrl("");
      refetchProjects();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteProject = trpc.seo.deleteProject.useMutation({
    onSuccess: () => { toast.success("Project deleted"); refetchProjects(); },
  });

  const runAudit = trpc.seo.runAudit.useMutation({
    onSuccess: (data) => {
      toast.success(`Audit complete! Score: ${data.score}/100`);
      refetchAudits();
      refetchProjects();
    },
    onError: (e) => toast.error(e.message),
  });

  const generateBrief = trpc.seo.generateContentBrief.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const keywordResearch = trpc.seo.keywordResearch.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const analyzeCompetitor = trpc.seo.analyzeCompetitor.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const writeMetaTags = trpc.seo.writeMetaTags.useMutation({
    onSuccess: () => toast.success("Meta tags generated!"),
    onError: (e) => toast.error(e.message),
  });

  const generateSchema = trpc.seo.generateSchema.useMutation({
    onSuccess: () => toast.success("Schema markup generated!"),
    onError: (e) => toast.error(e.message),
  });

  const writeArticle = trpc.seo.writeArticle.useMutation({
    onSuccess: () => toast.success("Article written!"),
    onError: (e) => toast.error(e.message),
  });

  const optimizePage = trpc.seo.optimizePage.useMutation({
    onSuccess: () => toast.success("Page analyzed!"),
    onError: (e) => toast.error(e.message),
  });

  const planInternalLinks = trpc.seo.planInternalLinks.useMutation({
    onSuccess: () => toast.success("Linking plan ready!"),
    onError: (e) => toast.error(e.message),
  });

  const [metaUrl, setMetaUrl] = useState("");
  const [metaKeyword, setMetaKeyword] = useState("");
  const [metaPageType, setMetaPageType] = useState("homepage");
  const [schemaUrl, setSchemaUrl] = useState("");
  const [schemaType, setSchemaType] = useState("LocalBusiness");
  const [schemaBizName, setSchemaBizName] = useState("");
  const [articleKeyword, setArticleKeyword] = useState("");
  const [articleWordCount, setArticleWordCount] = useState(1200);
  const [articleTone, setArticleTone] = useState("professional");
  const [optimizeContent, setOptimizeContent] = useState("");
  const [optimizeKeyword, setOptimizeKeyword] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
  const [linkPages, setLinkPages] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  // GEO/AEO state
  const [geoContent, setGeoContent] = useState("");
  const [geoQuery, setGeoQuery] = useState("");
  const [geoBrand, setGeoBrand] = useState("");
  const [faqTopic, setFaqTopic] = useState("");
  const [faqUrl, setFaqUrl] = useState("");
  const [faqIndustry, setFaqIndustry] = useState("");
  const [entityTopic, setEntityTopic] = useState("");
  const [entityBrand, setEntityBrand] = useState("");
  const [entityUrl, setEntityUrl] = useState("");
  const [simQuery, setSimQuery] = useState("");
  const [simBrand, setSimBrand] = useState("");
  const [simUrl, setSimUrl] = useState("");
  const [simEngine, setSimEngine] = useState<"chatgpt"|"perplexity"|"gemini"|"claude"|"bing">("perplexity");
  const [rewriteContent, setRewriteContent] = useState("");
  const [rewriteKeyword, setRewriteKeyword] = useState("");
  const [rewriteBrand, setRewriteBrand] = useState("");
  // GEO/AEO mutations
  const optimizeForAICitation = trpc.seo.optimizeForAICitation.useMutation({
    onSuccess: () => toast.success("AI Citation optimization complete!"),
    onError: (e) => toast.error(e.message),
  });
  const buildFAQSchema = trpc.seo.buildFAQSchema.useMutation({
    onSuccess: () => toast.success("FAQ Schema generated!"),
    onError: (e) => toast.error(e.message),
  });
  const analyzeEntityStrategy = trpc.seo.analyzeEntityStrategy.useMutation({
    onSuccess: () => toast.success("Entity strategy analyzed!"),
    onError: (e) => toast.error(e.message),
  });
  const simulateAIAnswer = trpc.seo.simulateAIAnswer.useMutation({
    onSuccess: () => toast.success("AI answer simulated!"),
    onError: (e) => toast.error(e.message),
  });
  const rewriteForAISearch = trpc.seo.rewriteForAISearch.useMutation({
    onSuccess: () => toast.success("Content rewritten for AI search!"),
    onError: (e) => toast.error(e.message),
  });
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const parseFindings = (findings: string | null) => {
    if (!findings) return [];
    try { return JSON.parse(findings); } catch { return []; }
  };

  return (
    <PageShell title="AI SEO Dashboard" subtitle="AI-powered SEO audits, keyword research, and optimization" icon={<Search className="w-5 h-5" />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-500" />
              AI SEO Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Powered by Claude SEO Team — 25 specialized SEO agents
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = "/seo/pricing"}>
            Upgrade Plan <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto w-full">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="article">Write</TabsTrigger>
            <TabsTrigger value="meta">Meta Tags</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="onpage">On-Page</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="competitor">Competitor</TabsTrigger>
            <TabsTrigger value="geo" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              GEO/AEO
            </TabsTrigger>
          </TabsList>

          {/* ── Projects Tab ── */}
          <TabsContent value="projects" className="space-y-4">
            {/* Add project */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Website Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="Project name (e.g. My Business)"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="https://example.com"
                    value={newProjectUrl}
                    onChange={e => setNewProjectUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => createProject.mutate({ name: newProjectName, url: newProjectUrl })}
                    disabled={!newProjectName || !newProjectUrl || createProject.isPending}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Project list */}
            <div className="grid gap-3">
              {!projects?.length && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No projects yet. Add your first website above.</p>
                  </CardContent>
                </Card>
              )}
              {projects?.map(project => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedProjectId === project.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => { setSelectedProjectId(project.id); setAuditUrl(project.url); }}
                >
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {project.auditScore != null && (
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${project.auditScore >= 70 ? "text-green-500" : project.auditScore >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                            {project.auditScore}
                          </div>
                          <div className="text-xs text-muted-foreground">SEO Score</div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); deleteProject.mutate({ projectId: project.id }); }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent audits for selected project */}
            {selectedProjectId && audits && audits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Audits — {selectedProject?.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {audits.map(audit => (
                    <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{audit.auditType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(audit.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`font-bold ${(audit.score ?? 0) >= 70 ? "text-green-500" : (audit.score ?? 0) >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                        {audit.score}/100
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Audit Tab ── */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run SEO Audit</CardTitle>
                <CardDescription>Analyze any URL with Claude SEO Team's 25 specialized agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input
                    placeholder="https://example.com"
                    value={auditUrl}
                    onChange={e => setAuditUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={selectedProjectId?.toString() ?? ""}
                    onValueChange={v => setSelectedProjectId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audit Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AUDIT_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setAuditType(type.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${auditType === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <Icon className="w-4 h-4 mb-1 text-primary" />
                          <div className="text-xs font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!selectedProjectId) { toast.error("Select a project first"); return; }
                    if (!auditUrl) { toast.error("Enter a URL to audit"); return; }
                    runAudit.mutate({ projectId: selectedProjectId, url: auditUrl, auditType: auditType as any });
                  }}
                  disabled={runAudit.isPending}
                >
                  {runAudit.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing with Claude SEO Team...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Run {AUDIT_TYPES.find(t => t.value === auditType)?.label} Audit</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Audit Results */}
            {runAudit.data && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Audit Results</CardTitle>
                    <div className={`text-3xl font-bold ${runAudit.data.score >= 70 ? "text-green-500" : runAudit.data.score >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                      {runAudit.data.score}/100
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parseFindings(runAudit.data.findings).map((finding: any, i: number) => {
                    const sev = SEVERITY_CONFIG[finding.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                    const SevIcon = sev.icon;
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${sev.bg}`}>
                        <div className="flex items-start gap-2">
                          <SevIcon className={`w-4 h-4 mt-0.5 ${sev.color} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{finding.title}</span>
                              <Badge variant={sev.badge} className="text-xs">{finding.severity}</Badge>
                              {finding.category && <Badge variant="outline" className="text-xs">{finding.category}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                            {finding.recommendation && (
                              <p className="text-sm mt-2 font-medium text-foreground">
                                ✓ {finding.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Raw response fallback */}
                  {parseFindings(runAudit.data.findings).length === 0 && runAudit.data.rawResponse && (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">{runAudit.data.rawResponse}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Keywords Tab ── */}
          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Keyword Research</CardTitle>
                <CardDescription>Discover keyword opportunities with search intent analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Seed keyword (e.g. AI sales software)"
                    value={keywordSeed}
                    onChange={e => setKeywordSeed(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => keywordResearch.mutate({ seed: keywordSeed, count: 20 })}
                    disabled={!keywordSeed || keywordResearch.isPending}
                  >
                    {keywordResearch.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {keywordResearch.data?.keywords && keywordResearch.data.keywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Keyword Ideas ({keywordResearch.data.keywords.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {keywordResearch.data.keywords.map((kw: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{kw.keyword}</span>
                          {kw.contentIdea && <p className="text-xs text-muted-foreground mt-0.5 truncate">{kw.contentIdea}</p>}
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{kw.intent}</Badge>
                          <Badge
                            variant={kw.difficulty === "low" ? "default" : kw.difficulty === "medium" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {kw.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{kw.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Content Brief Tab ── */}
          <TabsContent value="brief" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Content Brief Generator</CardTitle>
                <CardDescription>Generate comprehensive SEO content briefs for any keyword</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Target Keyword</Label>
                    <Input
                      placeholder="e.g. best AI sales tools 2025"
                      value={briefKeyword}
                      onChange={e => setBriefKeyword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry (optional)</Label>
                    <Input
                      placeholder="e.g. SaaS, E-commerce, Healthcare"
                      value={briefIndustry}
                      onChange={e => setBriefIndustry(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => generateBrief.mutate({ keyword: briefKeyword, industry: briefIndustry || undefined })}
                  disabled={!briefKeyword || generateBrief.isPending}
                >
                  {generateBrief.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating Brief...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" /> Generate Content Brief</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {generateBrief.data?.brief && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Content Brief: {briefKeyword}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generateBrief.data!.brief);
                        toast.success("Copied to clipboard!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px]">
                    {generateBrief.data.brief}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Competitor Tab ── */}
          <TabsContent value="competitor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitor Gap Analysis</CardTitle>
                <CardDescription>Find SEO opportunities your competitors have that you don't</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Your Website</Label>
                    <Input
                      placeholder="https://yoursite.com"
                      value={yourUrl}
                      onChange={e => setYourUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Competitor Website</Label>
                    <Input
                      placeholder="https://competitor.com"
                      value={competitorUrl}
                      onChange={e => setCompetitorUrl(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => analyzeCompetitor.mutate({ yourUrl, competitorUrl })}
                  disabled={!yourUrl || !competitorUrl || analyzeCompetitor.isPending}
                >
                  {analyzeCompetitor.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Target className="w-4 h-4 mr-2" /> Analyze Competitor</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {analyzeCompetitor.data?.analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Competitor Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px]">
                    {analyzeCompetitor.data.analysis}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          {/* ── Article Writer Tab ── */}
          <TabsContent value="article" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><PenTool className="w-4 h-4" />AI Article Writer</CardTitle>
                <CardDescription>Full SEO-optimized article ready to publish — keyword in H1, E-E-A-T signals, FAQ section, schema markup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Target keyword (e.g. best AI sales software)" value={articleKeyword} onChange={e => setArticleKeyword(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Word Count</Label>
                    <Select value={String(articleWordCount)} onValueChange={v => setArticleWordCount(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[500,800,1200,1500,2000,2500,3000].map(n => <SelectItem key={n} value={String(n)}>{n} words</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tone</Label>
                    <Select value={articleTone} onValueChange={setArticleTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["professional","conversational","authoritative","friendly"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" disabled={!articleKeyword || writeArticle.isPending}
                  onClick={() => writeArticle.mutate({ keyword: articleKeyword, wordCount: articleWordCount, tone: articleTone as any })}>
                  {writeArticle.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Writing article (GPT-4o)…</> : <><PenTool className="w-4 h-4 mr-2" />Write SEO Article</>}
                </Button>
              </CardContent>
            </Card>
            {writeArticle.data?.article && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Article: {articleKeyword}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(writeArticle.data!.article); toast.success("Copied!"); }}>Copy</Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px]">{writeArticle.data.article}</pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Meta Tags Tab ── */}
          <TabsContent value="meta" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4" />Meta Tag Writer</CardTitle>
                <CardDescription>AI-optimized title (50-60 chars), meta description (150-160 chars), OG tags, H1, robots recommendation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="https://yoursite.com/page" value={metaUrl} onChange={e => setMetaUrl(e.target.value)} />
                <Input placeholder="Target keyword" value={metaKeyword} onChange={e => setMetaKeyword(e.target.value)} />
                <Select value={metaPageType} onValueChange={setMetaPageType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["homepage","product","blog","service","about","contact"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={!metaUrl || writeMetaTags.isPending}
                  onClick={() => writeMetaTags.mutate({ url: metaUrl, targetKeyword: metaKeyword || undefined, pageType: metaPageType as any })}>
                  {writeMetaTags.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Writing…</> : <><Tag className="w-4 h-4 mr-2" />Write Meta Tags</>}
                </Button>
              </CardContent>
            </Card>
            {writeMetaTags.data?.metaTags && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Generated Meta Tags</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(writeMetaTags.data!.metaTags, null, 2)); toast.success("Copied!"); }}>Copy JSON</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(writeMetaTags.data.metaTags).map(([k, v]) => (
                    <div key={k} className="space-y-1">
                      <Label className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</Label>
                      <div className="text-sm bg-muted/50 rounded p-2 font-mono">{String(v)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Schema Tab ── */}
          <TabsContent value="schema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Code2 className="w-4 h-4" />Schema Markup Generator</CardTitle>
                <CardDescription>Ready-to-paste JSON-LD structured data for rich snippets in Google</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="https://yoursite.com" value={schemaUrl} onChange={e => setSchemaUrl(e.target.value)} />
                <Input placeholder="Business / site name" value={schemaBizName} onChange={e => setSchemaBizName(e.target.value)} />
                <Select value={schemaType} onValueChange={setSchemaType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LocalBusiness","Product","Article","FAQ","HowTo","Organization","Person","BreadcrumbList","WebSite"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={!schemaUrl || generateSchema.isPending}
                  onClick={() => generateSchema.mutate({ url: schemaUrl, schemaType: schemaType as any, businessName: schemaBizName || undefined })}>
                  {generateSchema.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Code2 className="w-4 h-4 mr-2" />Generate Schema</>}
                </Button>
              </CardContent>
            </Card>
            {generateSchema.data?.result && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Schema Markup — {schemaType}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generateSchema.data!.result!.jsonLd || ""); toast.success("Copied!"); }}>Copy</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="whitespace-pre-wrap text-xs font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-80">{generateSchema.data.result.jsonLd}</pre>
                  {generateSchema.data.result.explanation && (
                    <p className="text-sm text-muted-foreground">{generateSchema.data.result.explanation}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── On-Page Optimizer Tab ── */}
          <TabsContent value="onpage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />On-Page Optimizer</CardTitle>
                <CardDescription>Paste your page content and get scored optimization fixes with keyword density, readability, and LSI keywords</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Target keyword" value={optimizeKeyword} onChange={e => setOptimizeKeyword(e.target.value)} />
                <Textarea placeholder="Paste your page content here…" value={optimizeContent} onChange={e => setOptimizeContent(e.target.value)} rows={8} />
                <Button className="w-full" disabled={!optimizeContent || !optimizeKeyword || optimizePage.isPending}
                  onClick={() => optimizePage.mutate({ content: optimizeContent, targetKeyword: optimizeKeyword })}>
                  {optimizePage.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</> : <><Zap className="w-4 h-4 mr-2" />Optimize Page</>}
                </Button>
              </CardContent>
            </Card>
            {optimizePage.data?.result && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Optimization Report</CardTitle>
                    <div className={`text-2xl font-bold ${(optimizePage.data.result.score ?? 0) >= 70 ? "text-green-500" : "text-yellow-500"}`}>{optimizePage.data.result.score}/100</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {optimizePage.data.result.issues?.map((issue: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{issue.severity}</Badge>
                        <span className="text-sm font-medium">{issue.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      {issue.fix && <p className="text-xs text-primary mt-1">Fix: {issue.fix}</p>}
                    </div>
                  ))}
                  {optimizePage.data.result.suggestedLSIKeywords?.length > 0 && (
                    <div>
                      <Label className="text-xs">Suggested LSI Keywords</Label>
                      <div className="flex flex-wrap gap-1 mt-1">{optimizePage.data.result.suggestedLSIKeywords.map((k: string) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Internal Links Tab ── */}
          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" />Internal Linking Planner</CardTitle>
                <CardDescription>Build a pillar-cluster linking strategy across your pages to boost topical authority</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="https://yoursite.com" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
                <Textarea placeholder={"List your pages, one per line:\nhttps://site.com/\nhttps://site.com/services\nhttps://site.com/blog"} value={linkPages} onChange={e => setLinkPages(e.target.value)} rows={6} />
                <Input placeholder="Priority page to boost (optional)" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} />
                <Button className="w-full" disabled={!linkUrl || !linkPages || planInternalLinks.isPending}
                  onClick={() => {
                    const pages = linkPages.split("\n").map(p => p.trim()).filter(Boolean);
                    if (pages.length < 2) { toast.error("Enter at least 2 pages"); return; }
                    planInternalLinks.mutate({ url: linkUrl, pages, targetPage: linkTarget || undefined });
                  }}>
                  {planInternalLinks.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Planning…</> : <><Link2 className="w-4 h-4 mr-2" />Plan Internal Links</>}
                </Button>
              </CardContent>
            </Card>
            {planInternalLinks.data?.result && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Linking Plan</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(planInternalLinks.data!.result, null, 2)); toast.success("Copied!"); }}>Copy</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {planInternalLinks.data.result.linkingPlan?.map((link: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={link.priority === "high" ? "default" : "secondary"} className="text-xs">{link.priority}</Badge>
                        <span className="font-medium truncate">{link.fromPage}</span>
                        <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-primary">{link.toPage}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Anchor: "{link.anchorText}" — {link.reason}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── GEO/AEO Tab ── */}
          <TabsContent value="geo" className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base">GEO/AEO — AI Search Optimization</h2>
                <p className="text-xs text-muted-foreground">Get cited by ChatGPT, Perplexity, Claude, Gemini &amp; Bing Copilot</p>
              </div>
              <Badge className="ml-auto bg-violet-500/20 text-violet-300 border-violet-500/30">New</Badge>
            </div>

            {/* Tool 1: AI Citation Optimizer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  AI Citation Optimizer
                </CardTitle>
                <CardDescription>Rewrite your content so AI engines quote it directly in their answers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Target Query (what users ask AI engines)</Label>
                    <Input placeholder="e.g. What is the best CRM for small business?" value={geoQuery} onChange={e => setGeoQuery(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Brand Name (optional)</Label>
                    <Input placeholder="Your brand name" value={geoBrand} onChange={e => setGeoBrand(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Content to Optimize</Label>
                  <Textarea placeholder="Paste your existing content here..." value={geoContent} onChange={e => setGeoContent(e.target.value)} rows={5} />
                </div>
                <Button onClick={() => optimizeForAICitation.mutate({ content: geoContent, targetQuery: geoQuery, brand: geoBrand || undefined })} disabled={optimizeForAICitation.isPending || !geoContent || !geoQuery} className="w-full">
                  {optimizeForAICitation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Optimizing...</> : <><Sparkles className="w-4 h-4 mr-2" />Optimize for AI Citation</>}
                </Button>
                {optimizeForAICitation.data?.result && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AI Readiness Score</span>
                      <Badge className="bg-green-500/20 text-green-400">{optimizeForAICitation.data.result.aiReadinessScore}/100</Badge>
                    </div>
                    {optimizeForAICitation.data.result.citationSnippets?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Most Likely to be Quoted by AI</Label>
                        {optimizeForAICitation.data.result.citationSnippets.map((s: string, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 text-sm">
                            <p className="text-xs text-violet-400 mb-1">Snippet {i+1}</p>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(optimizeForAICitation.data!.result.optimizedContent ?? "").then(() => toast.success("Copied!"))}>
                        <Copy className="w-3 h-3 mr-1" />Copy Optimized Content
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tool 2: FAQ Schema Builder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  FAQ Schema Builder
                </CardTitle>
                <CardDescription>Generate FAQ blocks that match how people ask ChatGPT and Perplexity questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Topic</Label>
                    <Input placeholder="e.g. AI sales software" value={faqTopic} onChange={e => setFaqTopic(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Page URL</Label>
                    <Input placeholder="https://yoursite.com/page" value={faqUrl} onChange={e => setFaqUrl(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Industry (optional)</Label>
                    <Input placeholder="e.g. SaaS, Real Estate" value={faqIndustry} onChange={e => setFaqIndustry(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => buildFAQSchema.mutate({ topic: faqTopic, url: faqUrl, industry: faqIndustry || undefined })} disabled={buildFAQSchema.isPending || !faqTopic || !faqUrl} className="w-full">
                  {buildFAQSchema.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building...</> : <><MessageSquare className="w-4 h-4 mr-2" />Build FAQ Schema</>}
                </Button>
                {buildFAQSchema.data?.result && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Coverage Score</span>
                      <Badge className="bg-blue-500/20 text-blue-400">{buildFAQSchema.data.result.coverageScore}/100</Badge>
                    </div>
                    {buildFAQSchema.data.result.faqs?.slice(0, 5).map((faq: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">
                        <p className="font-medium text-xs mb-1">Q: {faq.question}</p>
                        <p className="text-muted-foreground text-xs">{faq.answer}</p>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(buildFAQSchema.data!.result.jsonLd ?? "").then(() => toast.success("JSON-LD copied!"))}>
                      <Copy className="w-3 h-3 mr-1" />Copy JSON-LD Schema
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tool 3: Entity & Brand Mention Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Network className="w-4 h-4 text-green-500" />
                  Entity &amp; Brand Strategy
                </CardTitle>
                <CardDescription>Discover which entities and authority figures to mention to appear in AI knowledge graphs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Topic to Rank For</Label>
                    <Input placeholder="e.g. AI workforce automation" value={entityTopic} onChange={e => setEntityTopic(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Brand Name</Label>
                    <Input placeholder="Your company name" value={entityBrand} onChange={e => setEntityBrand(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Website URL</Label>
                    <Input placeholder="https://yoursite.com" value={entityUrl} onChange={e => setEntityUrl(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => analyzeEntityStrategy.mutate({ topic: entityTopic, brand: entityBrand, url: entityUrl })} disabled={analyzeEntityStrategy.isPending || !entityTopic || !entityBrand || !entityUrl} className="w-full">
                  {analyzeEntityStrategy.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Network className="w-4 h-4 mr-2" />Analyze Entity Strategy</>}
                </Button>
                {analyzeEntityStrategy.data?.result && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current AI Visibility Score</span>
                      <Badge className="bg-green-500/20 text-green-400">{analyzeEntityStrategy.data.result.currentVisibilityScore}/100</Badge>
                    </div>
                    {analyzeEntityStrategy.data.result.coreEntities?.slice(0, 6).map((e: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm flex items-start gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{e.type}</Badge>
                        <div>
                          <p className="font-medium text-xs">{e.entity}</p>
                          <p className="text-muted-foreground text-xs">{e.howToMention}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tool 4: AI Answer Simulator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4 text-orange-500" />
                  AI Answer Simulator
                </CardTitle>
                <CardDescription>See what ChatGPT or Perplexity says today — and exactly how to get your brand cited instead</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Query to Simulate</Label>
                    <Input placeholder="e.g. Best AI sales tools 2025" value={simQuery} onChange={e => setSimQuery(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">AI Engine</Label>
                    <Select value={simEngine} onValueChange={(v) => setSimEngine(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="perplexity">Perplexity</SelectItem>
                        <SelectItem value="chatgpt">ChatGPT</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="claude">Claude</SelectItem>
                        <SelectItem value="bing">Bing Copilot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Your Brand</Label>
                    <Input placeholder="Your company name" value={simBrand} onChange={e => setSimBrand(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Your Website</Label>
                    <Input placeholder="https://yoursite.com" value={simUrl} onChange={e => setSimUrl(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => simulateAIAnswer.mutate({ query: simQuery, brand: simBrand, url: simUrl, engine: simEngine })} disabled={simulateAIAnswer.isPending || !simQuery || !simBrand || !simUrl} className="w-full">
                  {simulateAIAnswer.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulating...</> : <><Bot className="w-4 h-4 mr-2" />Simulate AI Answer</>}
                </Button>
                {simulateAIAnswer.data?.result && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Displacement Difficulty</span>
                      <Badge className={simulateAIAnswer.data.result.difficultyScore > 7 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>{simulateAIAnswer.data.result.difficultyScore}/10</Badge>
                    </div>
                    <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                      <p className="text-xs text-orange-400 font-medium mb-2">What {simEngine.charAt(0).toUpperCase()+simEngine.slice(1)} says today (without your brand)</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{simulateAIAnswer.data.result.currentAIAnswer}</p>
                    </div>
                    {simulateAIAnswer.data.result.brandInsertionPoints?.slice(0, 3).map((pt: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-xs">
                        <p className="text-green-400 font-medium mb-1">Insertion Point {i+1}: {pt.location}</p>
                        <p className="text-muted-foreground">{pt.reason}</p>
                        <p className="mt-1 italic">Suggested: "{pt.suggestedText}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tool 5: AI-Optimized Content Rewriter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-pink-500" />
                  AI-Optimized Content Rewriter
                </CardTitle>
                <CardDescription>Rewrite existing content with statistics, named entities, and FAQ blocks to maximize AI citations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Target Keyword</Label>
                    <Input placeholder="e.g. AI workforce management" value={rewriteKeyword} onChange={e => setRewriteKeyword(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Brand (optional)</Label>
                    <Input placeholder="Your brand name" value={rewriteBrand} onChange={e => setRewriteBrand(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Content to Rewrite</Label>
                  <Textarea placeholder="Paste your existing content here..." value={rewriteContent} onChange={e => setRewriteContent(e.target.value)} rows={6} />
                </div>
                <Button onClick={() => rewriteForAISearch.mutate({ content: rewriteContent, targetKeyword: rewriteKeyword, brand: rewriteBrand || undefined })} disabled={rewriteForAISearch.isPending || !rewriteContent || !rewriteKeyword} className="w-full">
                  {rewriteForAISearch.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rewriting...</> : <><Brain className="w-4 h-4 mr-2" />Rewrite for AI Search</>}
                </Button>
                {rewriteForAISearch.data?.result && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Before</p>
                        <Badge variant="outline">{rewriteForAISearch.data.result.beforeAfterScore?.before}/100</Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">After</p>
                        <Badge className="bg-green-500/20 text-green-400">{rewriteForAISearch.data.result.beforeAfterScore?.after}/100</Badge>
                      </div>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigator.clipboard.writeText(rewriteForAISearch.data!.result.rewrittenContent ?? "").then(() => toast.success("Copied!"))}>
                        <Copy className="w-3 h-3 mr-1" />Copy Rewritten Content
                      </Button>
                    </div>
                    {rewriteForAISearch.data.result.citationSnippets?.slice(0, 3).map((s: string, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-pink-500/20 bg-pink-500/5 text-xs">
                        <p className="text-pink-400 font-medium mb-1">Citation Snippet {i+1}</p>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
