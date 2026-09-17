import { useEffect, useMemo, useState } from "react";
import { Bot, ClipboardCheck, Copy, ExternalLink, FileSearch, Globe2, MapPin, MessageSquareText, PlayCircle, Search, ShieldBan, Sparkles, Upload, UserCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { prospectingIndustryGroups } from "@shared/prospectingIndustries";

type Filter = "ALL" | "MISSING_WEBSITE" | "REVIEW_READY" | "APPROVED" | "SUPPRESSED";

const filterLabels: Record<Filter, string> = { ALL: "All prospects", MISSING_WEBSITE: "No website signal", REVIEW_READY: "Needs review", APPROVED: "Approved", SUPPRESSED: "Suppressed" };

function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = ""; continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const valueFor = (values: string[], aliases: string[]) => values[headers.findIndex((header) => aliases.includes(header))] ?? "";
  return rows.slice(1).map((values) => ({
    businessName: valueFor(values, ["businessname", "company", "companyname", "name"]),
    industry: valueFor(values, ["industry", "category", "businesscategory"]),
    formattedAddress: valueFor(values, ["address", "formattedaddress", "streetaddress"]),
    phone: valueFor(values, ["phone", "phonenumber", "businessphone", "telephone"]),
    email: valueFor(values, ["email", "businessemail", "contactemail"]),
    decisionMakerName: valueFor(values, ["decisionmaker", "decisionmakername", "contactname", "owner", "ownername"]),
    decisionMakerEmail: valueFor(values, ["decisionmakeremail", "owneremail", "contactemail"]),
    officialWebsite: valueFor(values, ["website", "url", "officialwebsite", "domain"]),
    sourceRecordId: valueFor(values, ["id", "recordid", "sourceid"]),
  })).filter((row) => row.businessName);
}

function websiteAiScan(prospect: any) {
  try { return JSON.parse(prospect.rawSourceData ?? "{}").websiteAiScan ?? null; } catch { return null; }
}

function aiScanTone(status?: string) {
  if (status === "HAS_AI_EXPERIENCE") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "NO_AI_SIGNAL" || status === "NO_WEBSITE") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function statusTone(status: string) {
  if (status === "MISSING_SIGNAL" || status === "REVIEW_READY") return "bg-amber-100 text-amber-800 border-amber-200";
  if (["APPROVED", "DEMO_CREATED", "OUTREACH_APPROVED", "APPROVED_FOR_SHARE"].includes(status)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "SUPPRESSED") return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function ProspectingStudio() {
  const [industry, setIndustry] = useState("HVAC companies");
  const [locationQuery, setLocationQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("MISSING_WEBSITE");
  const [importName, setImportName] = useState("");
  const [sourceAttribution, setSourceAttribution] = useState("Client-owned business list");
  const [businessPurpose, setBusinessPurpose] = useState("Use this client-owned business list to prepare reviewed, non-automated campaign and presentation opportunities.");
  const [clientRows, setClientRows] = useState<any[]>([]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<number>>(new Set());
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignScript, setCampaignScript] = useState("Hello, this is a transparent VonWork concept call. We prepared a private website concept for your business. May I share the interactive preview with the appropriate decision maker?");
  const [latestPresentation, setLatestPresentation] = useState<any>(null);
  const [followUpName, setFollowUpName] = useState("");
  const [followUpAddress, setFollowUpAddress] = useState("");
  const [followUpChannel, setFollowUpChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const prospects = trpc.prospecting.listProspects.useQuery({ filter });
  const prospectLists = trpc.prospecting.listProspectLists.useQuery();
  const selectedListMembers = trpc.prospecting.getProspectListMembers.useQuery({ listId: selectedListId ?? 1 }, { enabled: !!selectedListId });
  const approvedProspects = trpc.prospecting.listProspects.useQuery({ filter: "APPROVED" });
  const campaignUsageEstimate = trpc.prospecting.estimateCampaignUsage.useQuery({ prospectCount: selectedProspectIds.size, demoCount: selectedProspectIds.size, averagePresentationQuestions: 3 });
  const demos = trpc.prospecting.listDemos.useQuery();
  const imports = trpc.prospecting.listImports.useQuery();
  const utils = trpc.useUtils();
  const scanWebsiteAi = trpc.prospecting.scanWebsiteAiCapability.useMutation({
    onSuccess: (result) => { toast.success(`AI scan: ${result.status.replaceAll("_", " ")}.`); void utils.prospecting.listProspects.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const discover = trpc.prospecting.discoverGooglePlaces.useMutation({
    onSuccess: (result) => {
      toast.success(`Found ${result.discoveredCount} businesses; ${result.missingWebsiteCount} require website-status review.`);
      void utils.prospecting.listProspects.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const review = trpc.prospecting.updateProspectReview.useMutation({ onSuccess: () => void utils.prospecting.listProspects.invalidate(), onError: (error) => toast.error(error.message) });
  const suppress = trpc.prospecting.suppressProspect.useMutation({ onSuccess: () => { toast.success("Prospect suppressed from outreach."); void utils.prospecting.listProspects.invalidate(); }, onError: (error) => toast.error(error.message) });
  const createDemo = trpc.prospecting.createPrivateDemo.useMutation({ onSuccess: () => { toast.success("Private demo created for your review."); void Promise.all([utils.prospecting.listProspects.invalidate(), utils.prospecting.listDemos.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const approveDemo = trpc.prospecting.approveDemoForShare.useMutation({ onSuccess: () => { toast.success("Demo approved for private sharing."); void utils.prospecting.listDemos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const createPresentation = trpc.prospecting.createPresentation.useMutation({
    onSuccess: async (result) => {
      await navigator.clipboard.writeText(result.presentationUrl);
      setLatestPresentation(result);
      toast.success("AI presentation link copied. Review it before sharing.");
    },
    onError: (error) => toast.error(error.message),
  });
  const importRows = trpc.prospecting.importClientRows.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.accepted} reviewed candidates; ${result.duplicates} duplicates skipped; ${result.suppressed} suppressed.`);
      setClientRows([]); setImportName(""); setConsentConfirmed(false);
      void Promise.all([utils.prospecting.listProspects.invalidate(), utils.prospecting.listImports.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
  const stageCampaign = trpc.prospecting.stageReviewedCampaign.useMutation({
    onSuccess: (result) => {
      toast.success(`Campaign staged in test mode. ${result.consentedLeads} consented leads are queued; ${result.permissionNeeded} remain outside the call queue.`);
      setSelectedProspectIds(new Set()); setCampaignName("");
      void utils.callCenter.listCampaigns.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const prepareFollowUp = trpc.prospecting.preparePresentationFollowUp.useMutation({
    onSuccess: (result) => {
      navigator.clipboard.writeText(result.body).catch(() => undefined);
      toast.success(`Prepared ${followUpChannel.toLowerCase()} follow-up for review and copied its draft text.`);
    },
    onError: (error) => toast.error(error.message),
  });
  useEffect(() => {
    if (!selectedListId || !selectedListMembers.data) return;
    setSelectedProspectIds(new Set(selectedListMembers.data.filter((prospect: any) => prospect.reviewStatus !== "SUPPRESSED" && !prospect.isDoNotContact).map((prospect: any) => Number(prospect.id))));
  }, [selectedListId, selectedListMembers.data]);

  const counts = useMemo(() => ({
    all: prospects.data?.length ?? 0,
    missing: prospects.data?.filter((p: any) => p.websiteStatus === "MISSING_SIGNAL").length ?? 0,
    review: prospects.data?.filter((p: any) => p.reviewStatus === "REVIEW_READY").length ?? 0,
  }), [prospects.data]);

  return (
    <PageShell title="Website Prospecting Studio" subtitle="Discover, review, and privately demonstrate upgraded websites — with source attribution and human approval at every outreach step" icon={<Search className="w-5 h-5" />}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-5 flex gap-4">
          <ShieldBan className="w-6 h-6 text-blue-700 shrink-0" />
          <div className="text-sm text-blue-950 space-y-1"><strong>Review-first workflow.</strong> An empty official-website field is only a <strong>missing-website signal</strong>, not proof. Every candidate stays private until reviewed. Suppressed prospects cannot receive drafts, presentations, or calls; AI voice remains unavailable without recorded consent.</div>
        </div>

        <Tabs defaultValue="discover" className="space-y-5">
          <TabsList className="bg-white border border-gray-200 p-1 h-auto flex-wrap">
            <TabsTrigger value="discover" className="gap-2"><Globe2 className="w-4 h-4" /> Discover</TabsTrigger>
            <TabsTrigger value="import" className="gap-2"><Upload className="w-4 h-4" /> Import your data</TabsTrigger>
            <TabsTrigger value="review" className="gap-2"><ClipboardCheck className="w-4 h-4" /> Review queue</TabsTrigger>
            <TabsTrigger value="demos" className="gap-2"><PlayCircle className="w-4 h-4" /> Private demos</TabsTrigger>
            <TabsTrigger value="campaign" className="gap-2"><MessageSquareText className="w-4 h-4" /> Campaign & follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-5">
            <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Official Places discovery</CardTitle><p className="text-sm text-gray-500">Choose from 64 appointment-heavy and local-service categories, then search a geography through the approved Maps provider. Results are attributed to Google Places and marked for review rather than automatically contacted.</p></CardHeader><CardContent>
              <div className="grid md:grid-cols-[1fr_1fr_140px] gap-4 items-end">
                <div className="space-y-2"><Label htmlFor="industry">Business category</Label><Select value={industry} onValueChange={setIndustry}><SelectTrigger id="industry" className="bg-white"><SelectValue placeholder="Choose an industry" /></SelectTrigger><SelectContent className="max-h-80">{prospectingIndustryGroups.map(({ group, industries }) => <div key={group} className="py-1"><p className="px-2 py-1.5 text-xs font-extrabold tracking-wide text-slate-500 uppercase">{group}</p>{industries.map((option) => <SelectItem key={option.id} value={option.label}>{option.label}</SelectItem>)}</div>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="location">City, state, or market</Label><Input id="location" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="e.g., Austin, TX" /></div>
                <Button disabled={!industry.trim() || !locationQuery.trim() || discover.isPending} onClick={() => discover.mutate({ industry, locationQuery, maxResults: 20 })} className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold"><Search className="w-4 h-4 mr-2" />{discover.isPending ? "Searching…" : "Find prospects"}</Button>
              </div>
            </CardContent></Card>
            <div className="grid md:grid-cols-3 gap-4">
              {[{ label: "Visible candidates", value: counts.all, icon: FileSearch, color: "text-blue-600" }, { label: "Missing-website signals", value: counts.missing, icon: Globe2, color: "text-amber-600" }, { label: "Needs human review", value: counts.review, icon: UserCheck, color: "text-violet-600" }].map((stat) => <Card key={stat.label} className="border-gray-200"><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">{stat.label}</p><p className="text-3xl font-extrabold text-gray-900 mt-1">{stat.value}</p></div><stat.icon className={`w-8 h-8 ${stat.color}`} /></CardContent></Card>)}
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-5">
            <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Import a client-owned business list</CardTitle><p className="text-sm text-gray-500">Upload a CSV you are authorized to use. VonWork maps common columns, preserves source attribution, skips duplicates, honors internal suppressions, and places accepted rows in human review — it does not auto-contact imported records.</p></CardHeader><CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="import-name">Import name</Label><Input id="import-name" value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Q3 local services list" /></div><div className="space-y-2"><Label htmlFor="source-attribution">List source / attribution</Label><Input id="source-attribution" value={sourceAttribution} onChange={(event) => setSourceAttribution(event.target.value)} placeholder="Client CRM export" /></div></div>
              <div className="space-y-2"><Label htmlFor="business-purpose">Business purpose</Label><Input id="business-purpose" value={businessPurpose} onChange={(event) => setBusinessPurpose(event.target.value)} placeholder="Why you are authorized to use this list" /></div>
              <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-6"><Label htmlFor="prospect-csv" className="cursor-pointer flex flex-col items-center justify-center gap-2 text-center"><Upload className="w-8 h-8 text-blue-600" /><span className="font-extrabold text-slate-900">Choose a CSV file</span><span className="text-xs text-slate-600">Supported headers include business name, industry, address, phone, email, contact/owner, website, and ID. Up to 500 rows per import.</span></Label><Input id="prospect-csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const parsed = parseCsv(await file.text()).slice(0, 500); setClientRows(parsed); if (!importName) setImportName(file.name.replace(/\.csv$/i, "")); toast.success(`${parsed.length} valid business rows are ready for review.`); }} /></div>
              {clientRows.length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col md:flex-row gap-3 justify-between md:items-center"><div><p className="font-extrabold text-emerald-950">{clientRows.length} rows ready to normalize</p><p className="text-sm text-emerald-800">Preview: {clientRows.slice(0, 3).map((row) => row.businessName).join(", ")}{clientRows.length > 3 ? "…" : ""}</p></div><Button variant="outline" onClick={() => setClientRows([])}>Clear file</Button></div> : null}
              <label className="flex gap-3 items-start text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} /><span><strong>I confirm I am authorized to use this client-owned list</strong> for the stated business purpose and will obtain any required contact permissions before a call, message, or presentation is sent.</span></label>
              <Button disabled={!clientRows.length || !importName.trim() || businessPurpose.trim().length < 20 || !consentConfirmed || importRows.isPending} onClick={() => importRows.mutate({ name: importName, sourceType: "CSV", sourceAttribution, declaredBusinessPurpose: businessPurpose, consentDeclaration: true, rows: clientRows })} className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold"><Upload className="w-4 h-4 mr-2" />{importRows.isPending ? "Normalizing list…" : `Import ${clientRows.length || ""} candidates`}</Button>
            </CardContent></Card>
            <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Import audit history</CardTitle></CardHeader><CardContent>{imports.isLoading ? <p className="text-sm text-gray-500">Loading imports…</p> : imports.data?.length ? <div className="divide-y divide-gray-100">{imports.data.map((item: any) => <div key={item.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2"><div><p className="font-bold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.sourceAttribution} · {new Date(item.createdAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><Badge variant="outline">{item.rowsReceived} received</Badge><Badge variant="outline" className="border-emerald-200 text-emerald-700">{item.rowsAccepted} accepted</Badge><Badge variant="outline">{item.rowsDuplicates} duplicates</Badge><Badge variant="outline" className="border-rose-200 text-rose-700">{item.rowsSuppressed} suppressed</Badge></div></div>)}</div> : <p className="text-sm text-gray-500">No client-owned list imports yet.</p>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between"><div className="flex gap-2 flex-wrap">{(Object.keys(filterLabels) as Filter[]).map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} className={filter === item ? "bg-[#1A6FFF]" : ""} onClick={() => setFilter(item)}>{filterLabels[item]}</Button>)}</div><Button variant="outline" size="sm" onClick={() => prospects.refetch()}>Refresh</Button></div>
            <Card className="border-gray-200 overflow-hidden"><CardContent className="p-0">
              {prospects.isLoading ? <div className="p-10 text-center text-gray-500">Loading prospects…</div> : prospects.data?.length ? <div className="divide-y divide-gray-100">{prospects.data.map((prospect: any) => <div key={prospect.id} className="p-5 grid lg:grid-cols-[1fr_auto] gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-gray-900">{prospect.businessName}</h3><Badge variant="outline" className={statusTone(prospect.websiteStatus)}>{prospect.websiteStatus.replace("_", " ")}</Badge><Badge variant="outline" className={statusTone(prospect.reviewStatus)}>{prospect.reviewStatus.replaceAll("_", " ")}</Badge></div><p className="text-sm text-gray-600 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{prospect.formattedAddress || "Address unavailable"}</p><div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1"><span>Source: {prospect.sourceAttribution}</span>{prospect.rating ? <span>Rating signal: {prospect.rating} ({prospect.ratingCount ?? 0})</span> : null}{prospect.phone ? <span>{prospect.phone}</span> : null}</div>{(() => { const scan = websiteAiScan(prospect); return scan ? <div className={`mt-2 inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${aiScanTone(scan.status)}`}><Bot className="w-3 h-3" />AI capability: {scan.status.replaceAll("_", " ")}{scan.evidence?.[0] ? <span className="font-medium">· {scan.evidence[0]}</span> : null}</div> : <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs font-semibold text-gray-500"><Bot className="w-3 h-3" />AI capability not scanned</div>; })()}<div className="mt-3 flex flex-wrap gap-2 text-xs">{prospect.demoId ? <><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">Website Creator: {prospect.websiteCreatorStatus}</Badge><button onClick={() => window.open(`/prospect-demo/${prospect.demoSlug}`, "_blank")} className="font-bold text-blue-700 hover:underline">Open website preview</button></> : <Badge variant="outline" className="border-gray-200 text-gray-600">Website Creator: not created</Badge>}{prospect.presentationId ? <><Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">Presentation: {prospect.presentationCreatorStatus}</Badge><button onClick={() => window.open(`/prospect-presentation/${prospect.presentationSlug}`, "_blank")} className="font-bold text-violet-700 hover:underline">Open presentation</button><span className="text-gray-500">{prospect.presentationViews ?? 0} views · {prospect.presentationQuestions ?? 0} questions · {prospect.pendingFollowUps ?? 0} pending follow-ups</span></> : <Badge variant="outline" className="border-gray-200 text-gray-600">Presentation Creator: not created</Badge>}</div>{prospect.officialWebsite ? <a href={prospect.officialWebsite} target="_blank" rel="noreferrer" className="inline-flex text-xs mt-2 font-bold text-blue-600 hover:underline">Official website recorded <ExternalLink className="w-3 h-3 ml-1" /></a> : <p className="text-xs mt-2 text-amber-700 font-semibold">Verify manually: no official-website field returned by the source.</p>}</div><div className="flex flex-wrap gap-2 items-start justify-end">{prospect.reviewStatus === "REVIEW_READY" ? <><Button size="sm" onClick={() => review.mutate({ prospectId: prospect.id, decision: "APPROVED", notes: "Reviewed by owner" })} className="bg-emerald-600 hover:bg-emerald-700"><UserCheck className="w-3.5 h-3.5 mr-1" />Approve</Button><Button size="sm" variant="outline" onClick={() => review.mutate({ prospectId: prospect.id, decision: "REJECTED", notes: "Not a fit" })}>Reject</Button></> : null}{prospect.reviewStatus === "APPROVED" && !prospect.demoId ? <Button size="sm" disabled={createDemo.isPending} onClick={() => createDemo.mutate({ prospectId: prospect.id })} className="bg-[#1A6FFF] hover:bg-[#0052CC]"><Sparkles className="w-3.5 h-3.5 mr-1" />Create website</Button> : null}{prospect.demoId && prospect.websiteCreatorStatus === "APPROVED_FOR_SHARE" && !prospect.presentationId ? <Button size="sm" disabled={createPresentation.isPending} onClick={() => createPresentation.mutate({ demoId: prospect.demoId, origin: window.location.origin })} className="bg-violet-600 hover:bg-violet-700"><MessageSquareText className="w-3.5 h-3.5 mr-1" />Create presentation</Button> : null}{!websiteAiScan(prospect) ? <Button size="sm" variant="outline" disabled={scanWebsiteAi.isPending} onClick={() => scanWebsiteAi.mutate({ prospectId: prospect.id })} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"><Bot className="w-3.5 h-3.5 mr-1" />Scan AI capability</Button> : null}{prospect.reviewStatus !== "SUPPRESSED" ? <Button size="sm" variant="outline" className="text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => suppress.mutate({ prospectId: prospect.id, reason: "Owner suppression" })}><ShieldBan className="w-3.5 h-3.5 mr-1" />Do not contact</Button> : null}</div></div>)}</div> : <div className="p-10 text-center text-gray-500">No prospects match this filter. Run an approved Places search from the Discover tab.</div>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="demos" className="space-y-4">
            <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Private demo approval queue</CardTitle><p className="text-sm text-gray-500">Private demos expire in 14 days. Approve a demo before a shareable presentation link can be created.</p></CardHeader><CardContent className="space-y-3">{demos.isLoading ? <p className="text-gray-500">Loading demos…</p> : demos.data?.length ? demos.data.map((demo: any) => <div key={demo.id} className="rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-bold text-gray-900">{demo.businessName}</h3><Badge variant="outline" className={statusTone(demo.status)}>{demo.status.replaceAll("_", " ")}</Badge></div><p className="text-xs text-gray-500 mt-1">Expires {new Date(demo.expiresAt).toLocaleDateString()}</p></div><div className="flex gap-2 flex-wrap">{demo.status === "READY_FOR_REVIEW" ? <Button size="sm" onClick={() => approveDemo.mutate({ demoId: demo.id })} className="bg-emerald-600 hover:bg-emerald-700">Approve for sharing</Button> : null}{demo.status === "APPROVED_FOR_SHARE" ? <><Button size="sm" variant="outline" onClick={() => window.open(`/prospect-demo/${demo.demoSlug}`, "_blank")}>Preview demo</Button><Button size="sm" disabled={createPresentation.isPending} onClick={() => createPresentation.mutate({ demoId: demo.id, origin: window.location.origin })} className="bg-[#1A6FFF] hover:bg-[#0052CC]"><MessageSquareText className="w-3.5 h-3.5 mr-1" />Create AI presentation</Button></> : null}</div></div>) : <p className="text-center py-8 text-gray-500">Approve a reviewed prospect to create its private demo.</p>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4"><Card className="border-blue-200 bg-blue-50/50"><CardHeader><CardTitle className="text-lg">Saved prospect lists</CardTitle><p className="text-sm text-gray-600">Each Places search is kept separate. Select a list to load its non-suppressed records into the existing test-mode campaign form.</p></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{prospectLists.data?.length ? prospectLists.data.map((list: any) => <Button key={list.id} size="sm" variant={selectedListId === Number(list.id) ? "default" : "outline"} className={selectedListId === Number(list.id) ? "bg-[#1A6FFF]" : ""} onClick={() => setSelectedListId(Number(list.id))}>{list.name} · {Number(list.eligibleCount ?? 0)} eligible</Button>) : <p className="text-sm text-gray-500">No saved lists yet. Run a Places search from Discover.</p>}</div>{selectedListId ? <p className="text-xs font-semibold text-blue-800">{selectedListMembers.isLoading ? "Loading list members…" : `${selectedProspectIds.size} list records loaded. Review status and consent still control call eligibility.`}</p> : null}</CardContent></Card>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Safe campaign staging.</strong> Selecting approved prospects creates a campaign in <strong>test mode</strong>. Only records with a verified opt-in and phone number enter a calling queue; all other records remain outside the queue until permission is recorded. This workspace does not dispatch calls, SMS, or email.</div>
            <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Select reviewed prospects</CardTitle><p className="text-sm text-gray-500">Choose only approved candidates. The selection stays under your account and is converted into a test-mode Call Center campaign.</p></CardHeader><CardContent className="space-y-4">{approvedProspects.isLoading ? <p className="text-sm text-gray-500">Loading approved prospects…</p> : approvedProspects.data?.length ? <div className="grid md:grid-cols-2 gap-3">{approvedProspects.data.map((prospect: any) => <label key={prospect.id} className="rounded-xl border border-gray-200 p-3 flex gap-3 cursor-pointer hover:border-blue-300"><input type="checkbox" className="mt-1" checked={selectedProspectIds.has(prospect.id)} onChange={() => setSelectedProspectIds((previous) => { const next = new Set(previous); if (next.has(prospect.id)) next.delete(prospect.id); else next.add(prospect.id); return next; })} /><span><span className="block font-extrabold text-slate-900">{prospect.businessName}</span><span className="block mt-1 text-xs text-slate-500">{prospect.decisionMakerName || "Decision maker not yet verified"} · {prospect.consentStatus === "OPTED_IN" ? "Voice opt-in recorded" : "Permission still required"}</span></span></label>)}</div> : <p className="text-sm text-gray-500">Approve prospects in the Review queue before adding them to a campaign.</p>}<div className="grid md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Campaign name</Label><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Austin HVAC website concepts" /></div><div className="space-y-2"><Label>Selected prospects</Label><div className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-sm font-bold text-slate-800">{selectedProspectIds.size} selected</div></div></div>{campaignUsageEstimate.data ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950"><strong>Estimated AI planning cost: ${campaignUsageEstimate.data.estimatedOpenRouterUsd.toFixed(4)}</strong> using {campaignUsageEstimate.data.model} for {campaignUsageEstimate.data.totalTokens.toLocaleString()} estimated tokens. This is an estimate only and excludes place-data, telephony, delivery, video/avatar, and GPU charges.</div> : null}<div className="space-y-2"><Label>Transparent call script</Label><textarea value={campaignScript} onChange={(event) => setCampaignScript(event.target.value)} className="min-h-28 w-full rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><Button disabled={!selectedProspectIds.size || !campaignName.trim() || campaignScript.trim().length < 40 || stageCampaign.isPending} onClick={() => stageCampaign.mutate({ name: campaignName, script: campaignScript, prospectIds: Array.from(selectedProspectIds), voiceId: "nova", callsPerHour: 20, maxConcurrent: 1, scheduleStartHour: 9, scheduleEndHour: 17, scheduleTimezone: "America/New_York" })} className="bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold">{stageCampaign.isPending ? "Staging campaign…" : "Stage campaign in test mode"}</Button></CardContent></Card>
            <Card className="border-gray-200"><CardHeader><CardTitle className="text-lg">Interactive presentation follow-up</CardTitle><p className="text-sm text-gray-500">After creating a presentation in Private demos, prepare a tracked, editable message. Delivery remains pending review.</p></CardHeader><CardContent className="space-y-4">{latestPresentation ? <><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Latest presentation ready: <span className="font-bold">{latestPresentation.presentationUrl}</span></div><div className="grid md:grid-cols-3 gap-4"><div className="space-y-2"><Label>Decision maker</Label><Input value={followUpName} onChange={(event) => setFollowUpName(event.target.value)} placeholder="Jordan Smith" /></div><div className="space-y-2"><Label>{followUpChannel === "EMAIL" ? "Email" : "Opted-in SMS number"}</Label><Input value={followUpAddress} onChange={(event) => setFollowUpAddress(event.target.value)} placeholder={followUpChannel === "EMAIL" ? "jordan@business.com" : "+15551234567"} /></div><div className="space-y-2"><Label>Channel</Label><Select value={followUpChannel} onValueChange={(value: "EMAIL" | "SMS") => setFollowUpChannel(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EMAIL">Email draft</SelectItem><SelectItem value="SMS">SMS draft (opt-in required)</SelectItem></SelectContent></Select></div></div><Button disabled={!followUpName.trim() || !followUpAddress.trim() || prepareFollowUp.isPending} onClick={() => prepareFollowUp.mutate({ presentationId: latestPresentation.presentationId, channel: followUpChannel, recipientName: followUpName, recipientAddress: followUpAddress, origin: window.location.origin, contactPermissionConfirmed: true })} variant="outline" className="border-blue-200 text-blue-700">{prepareFollowUp.isPending ? "Preparing…" : "Prepare follow-up for review"}</Button></> : <p className="text-sm text-gray-500">No presentation created in this session. Go to Private demos, approve a concept, and create its AI presentation first.</p>}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
