import { useRoute } from "wouter";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ProspectDemoPage() {
  const [, params] = useRoute("/prospect-demo/:slug");
  const demo = trpc.prospecting.getPublicDemo.useQuery({ demoSlug: params?.slug ?? "" }, { enabled: !!params?.slug });
  if (demo.isLoading) return <div className="min-h-screen grid place-items-center text-gray-500">Loading private concept…</div>;
  if (!demo.data) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><ShieldCheck className="w-10 h-10 text-gray-400 mx-auto mb-3"/><h1 className="font-extrabold text-xl text-gray-900">This private concept is unavailable</h1><p className="text-gray-500 mt-2">It may have expired or not yet been approved for sharing.</p></div></div>;
  return <div className="min-h-screen bg-slate-100"><div className="bg-[#0f172a] text-white px-5 py-3 text-center text-sm font-semibold">Private VonWork concept preview — this is not the business&apos;s live website</div><iframe title={demo.data.title} sandbox="allow-forms allow-scripts" className="w-full min-h-[calc(100vh-44px)] border-0 bg-white" srcDoc={demo.data.generatedHtml} /></div>;
}
