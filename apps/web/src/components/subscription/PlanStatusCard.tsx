"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type SubscriptionStatus = {
  currentPlan?: string;
  plan?: string;
  billingPeriod?: string;
  status?: string;
  activatedAt?: string | null;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  limits?: {
    maxCollectionSize?: number;
    maxCollectionSupply?: number;
    launchEnabled?: boolean;
    canPublishLaunchpad?: boolean;
    deploymentEnabled?: boolean;
    canDeployContract?: boolean;
    priorityQueue?: boolean;
  };
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Never";
}

export function PlanStatusCard() {
  const [subscription, setSubscription] = useState<SubscriptionStatus>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    api<SubscriptionStatus>("/api/subscription/status")
      .then(setSubscription)
      .catch((err) => setError(err instanceof Error ? err.message : "Subscription unavailable"));
  }, []);

  if (error) return <div className="rounded-lg border border-rose/30 bg-rose/10 p-5 text-rose">{error}</div>;
  if (!subscription) return <div className="h-44 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />;

  const plan = subscription.currentPlan ?? subscription.plan ?? "free";
  const days = subscription.daysRemaining;
  const active = subscription.status === "active" || subscription.status === "grace_period";
  const expiringSoon = typeof days === "number" && days <= 3 && active;
  const progress = subscription.expiresAt && subscription.activatedAt
    ? Math.max(0, Math.min(100, ((Date.now() - new Date(subscription.activatedAt).getTime()) / (new Date(subscription.expiresAt).getTime() - new Date(subscription.activatedAt).getTime())) * 100))
    : 0;

  return (
    <div className="rounded-lg border border-cyan/20 bg-panel p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase text-cyan">Active Plan</p>
          <h2 className="mt-1 text-2xl font-black capitalize">{plan}</h2>
          <p className="mt-1 text-sm text-muted">
            {plan === "free" ? "You are on Free plan." : active ? `${plan} plan active. ${days ?? 0} days remaining.` : "Your plan has expired. You are now on Free."}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${active ? "border-lime/40 bg-lime/10 text-lime" : "border-rose/40 bg-rose/10 text-rose"}`}>
          {subscription.status ?? "free"}
        </span>
      </div>
      {expiringSoon && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">Your plan expires soon.</p>}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-cyan" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <p><span className="text-muted">Billing:</span> {subscription.billingPeriod ?? "free"}</p>
        <p><span className="text-muted">Expires:</span> {formatDate(subscription.expiresAt)}</p>
        <p><span className="text-muted">Max supply:</span> {subscription.limits?.maxCollectionSupply ?? subscription.limits?.maxCollectionSize ?? 0}</p>
        <p><span className="text-muted">Launchpad:</span> {subscription.limits?.canPublishLaunchpad ?? subscription.limits?.launchEnabled ? "Enabled" : "Disabled"}</p>
      </div>
      <div className="mt-5 flex gap-3">
        <Link href="/pricing"><Button>{plan === "free" || !active ? "Upgrade" : "Renew"}</Button></Link>
        {active && plan !== "pro" && <Link href="/pricing"><Button className="border border-white/10 bg-transparent text-white">Upgrade</Button></Link>}
      </div>
    </div>
  );
}
