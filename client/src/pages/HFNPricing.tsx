import { ShieldCheck, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PUBLIC_PRICE: Record<string, number> = {
  hfn_starter: 499,
  hfn_pro: 999,
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export default function HFNPricing() {
  const offers = trpc.memberPricing.getHfnOwnUseOffers.useQuery();
  const checkout = trpc.memberPricing.createHfnOwnUseCheckout.useMutation({
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(error.message),
  });

  return (
    <PageShell
      title="Humans First Member Benefit"
      subtitle="Protected own-use pricing for verified, active Humans First members"
      icon={<ShieldCheck className="w-5 h-5" />}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-600 text-white border-0">HFN VERIFIED BENEFIT</Badge>
              <span className="text-sm font-semibold text-blue-800">50% off eligible own-use subscriptions</span>
            </div>
            <p className="text-sm text-blue-900 font-medium">This benefit is attached to your active Humans First membership and your own VonWork business account. It is not transferable, resellable, or available for client accounts.</p>
          </div>
          <LockKeyhole className="w-10 h-10 text-blue-600 shrink-0" />
        </div>

        {offers.isLoading ? (
          <Card className="border-gray-200"><CardContent className="py-12 text-center text-gray-500">Checking your protected member eligibility…</CardContent></Card>
        ) : !offers.data?.eligibility.eligible ? (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader><CardTitle className="text-amber-900 flex items-center gap-2"><LockKeyhole className="w-5 h-5" /> Verify your HFN membership first</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-800">
              <p>{offers.data?.eligibility.reason ?? "An active Humans First membership is required to reveal protected own-use pricing."}</p>
              <p>Open the <a className="font-bold underline" href="/vonwork">VON WORK Qualification</a> page, add your HFN Member ID, and run a fresh gate check. No protected price is displayed or purchasable until the membership service confirms that status.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              {offers.data.offers.map((offer) => {
                const publicPrice = PUBLIC_PRICE[offer.id] ?? 0;
                return (
                  <Card key={offer.id} className="border-2 border-blue-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#1A6FFF] to-[#0052CC] text-white">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-xl text-white">{offer.name.replace(" — HFN Own-Use Rate", "")}</CardTitle>
                        <Badge className="bg-white/20 border-white/30 text-white">50% OFF</Badge>
                      </div>
                      <p className="text-sm text-blue-100 mt-1">{offer.description}</p>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="mb-5">
                        <span className="text-4xl font-extrabold text-gray-900">{formatPrice(offer.priceInCents)}</span>
                        <span className="text-gray-500">/month</span>
                        <p className="mt-1 text-sm text-gray-500">Public price: <span className="line-through">${publicPrice}/month</span> · You save ${publicPrice - offer.priceInCents / 100}/month</p>
                      </div>
                      <ul className="space-y-2.5 mb-6">
                        {offer.features.map((feature) => (
                          <li key={feature} className="text-sm text-gray-700 flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />{feature}</li>
                        ))}
                      </ul>
                      <Button className="w-full bg-[#1A6FFF] hover:bg-[#0052CC] text-white font-bold" disabled={checkout.isPending} onClick={() => checkout.mutate({ plan: offer.id as "hfn_starter" | "hfn_pro", origin: window.location.origin })}>
                        <Sparkles className="w-4 h-4 mr-2" /> {checkout.isPending ? "Preparing secure checkout…" : `Activate for ${formatPrice(offer.priceInCents)}/mo`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-center text-xs text-gray-500 max-w-3xl mx-auto">AI usage, call minutes, SMS, voice, and third-party telecom charges are measured separately. Continued eligibility is rechecked against active HFN membership; a lapsed or revoked membership suspends the protected price at the next eligibility review.</p>
          </>
        )}
      </div>
    </PageShell>
  );
}
