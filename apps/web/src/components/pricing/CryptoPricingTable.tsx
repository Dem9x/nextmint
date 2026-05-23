import { PaymentQuoteCard } from "./PaymentQuoteCard";

type Plan = {
  id: string;
  tier?: string;
  name: string;
  billingPeriod?: "free" | "monthly" | "yearly" | "custom";
  durationDays?: number | null;
  priceUsd?: number | null;
  monthlyUsdPrice?: number | null;
  yearlyUsdPrice?: number | null;
  credits: number | null;
  monthlyCredits?: number | null;
  maxImageSize?: number;
  maxCollectionSupply?: number;
  allowedCollectionSize?: number;
  canPublishLaunchpad?: boolean;
  canDeployContract?: boolean;
  marketplaceListingEnabled?: boolean;
  includedLaunchpadPublishes?: number | null;
  priorityQueue?: boolean;
  features: string[];
};

export function CryptoPricingTable({ plans, billingPeriod }: { plans: Plan[]; billingPeriod: "monthly" | "yearly" }) {
  if (!plans.length) return <div className="rounded-lg border border-white/10 bg-panel p-5 text-muted">No pricing plans configured.</div>;
  const visiblePlans = plans.filter((plan) => plan.billingPeriod === billingPeriod || plan.billingPeriod === "free" || plan.billingPeriod === "custom");
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cyan/20 bg-cyan/10 p-5 text-sm text-cyan">
        <p className="font-black uppercase tracking-[0.16em]">Credit costs</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <span>512px image = 1 credit</span>
          <span>768px image = 2 credits</span>
          <span>1024px image = 4 credits</span>
          <span>IPFS image upload = 0.25 credit</span>
        </div>
        <p className="mt-3 text-cyan/80">Metadata generation/upload is included. Large collections consume credits per generated item.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
      {visiblePlans.map((plan) => (
        <div key={plan.id} className="rounded-lg border border-white/10 bg-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs uppercase text-cyan">{plan.billingPeriod}</span>
          </div>
          <p className="mt-2 text-3xl font-black">{plan.priceUsd == null ? "Custom" : `$${plan.priceUsd}`}</p>
          <p className="mt-1 text-sm text-muted">{plan.durationDays ? `/ ${plan.durationDays} days` : plan.billingPeriod === "free" ? "/ selamanya" : "/ custom"}</p>
          <p className="mt-2 text-sm text-muted">{plan.credits == null ? "Custom credits" : `${plan.credits} credits/month`}</p>
          <div className="mt-4 space-y-1 text-sm text-muted">
            <p>Max {plan.maxCollectionSupply ?? plan.allowedCollectionSize ?? 0} NFT collection</p>
            <p>Max image size: {plan.maxImageSize ?? 768}px</p>
            <p>{plan.canPublishLaunchpad ? `${plan.includedLaunchpadPublishes ?? "custom"} launchpad publish/month` : "Launchpad publish not included"}</p>
            <p>{plan.canDeployContract ? "Contract deploy enabled" : "No contract deploy"}</p>
            <p>{plan.marketplaceListingEnabled ? "Internal marketplace listing" : "External marketplace links only"}</p>
            {plan.priorityQueue && <p>Priority generation queue</p>}
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          {plan.priceUsd != null && plan.priceUsd > 0 && <div className="mt-5"><PaymentQuoteCard planId={plan.id} mode="subscription" /></div>}
          {plan.priceUsd === 0 && <div className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted">Current free baseline. Upgrade when you need launchpad publishing.</div>}
        </div>
      ))}
      </div>
    </div>
  );
}
