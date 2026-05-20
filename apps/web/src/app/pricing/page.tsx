"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { CryptoPricingTable } from "@/components/pricing/CryptoPricingTable";
import { TokenPriceTicker } from "@/components/pricing/TokenPriceTicker";
import { ChainFeeEstimateCard } from "@/components/pricing/ChainFeeEstimateCard";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

export default function PricingPage() {
  const [plans, setPlans] = useState<Array<{ id: string; name: string; billingPeriod?: "free" | "monthly" | "yearly" | "custom"; durationDays?: number | null; priceUsd?: number | null; monthlyUsdPrice?: number | null; yearlyUsdPrice?: number | null; credits: number | null; features: string[] }>>([]);
  const [tokens, setTokens] = useState<Array<{ tokenSymbol: string; priceUsd: number; provider: string }>>([]);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    withMinimumDelay(Promise.all([
      api<{ plans: typeof plans }>("/api/pricing/plans"),
      api<{ tokens: typeof tokens }>("/api/pricing/tokens")
    ]))
      .then(([planResult, tokenResult]) => {
        setPlans(planResult.plans);
        setTokens(tokenResult.tokens);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Pricing unavailable"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-4xl font-black">Crypto Pricing</h1>
        <p className="mt-3 text-muted">No Stripe. Quotes are calculated server-side from pricing providers and verified on-chain.</p>
        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
          {(["monthly", "yearly"] as const).map((period) => (
            <button key={period} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${billingPeriod === period ? "bg-cyan text-black" : "text-muted hover:text-white"}`} onClick={() => setBillingPeriod(period)}>
              {period}{period === "yearly" ? " · save 20%" : ""}
            </button>
          ))}
        </div>
        {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-rose">{error}</p>}
        <div className="mt-8 space-y-6">
          <TokenPriceTicker prices={isLoading ? [] : tokens} />
          <CryptoPricingTable plans={isLoading ? [] : plans} billingPeriod={billingPeriod} />
          <ChainFeeEstimateCard />
        </div>
      </section>
    </main>
  );
}
