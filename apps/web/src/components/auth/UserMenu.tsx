"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";

function short(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No wallet";
}

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  if (!user) return null;
  const activePlan = user.activePlan ?? user.plan ?? "free";
  const planClass =
    activePlan === "pro" ? "border-cyan/40 bg-cyan/15 text-cyan" :
    activePlan === "enterprise" ? "border-fuchsia-300/40 bg-fuchsia-300/15 text-fuchsia-100" :
    activePlan === "starter" ? "border-lime/40 bg-lime/15 text-lime" :
    "border-white/15 bg-white/5 text-muted";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-sm">
      <div className="px-2">
        <div className="flex items-center gap-2">
          <p className="font-bold">{user.username ?? user.email ?? short(user.walletAddress)}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${planClass}`}>
            {activePlan}
          </span>
        </div>
        <p className="text-xs text-muted">{short(user.walletAddress)} / {user.credits} credits</p>
        <p className="text-[11px] text-muted">Max public supply: {user.planLimits?.maxCollectionSize ?? 0}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className="rounded-md px-2 py-1 text-cyan hover:bg-white/10" href="/dashboard">Dashboard</Link>
        <Link className="rounded-md px-2 py-1 text-cyan hover:bg-white/10" href="/studio">Studio</Link>
        <Link className="rounded-md px-2 py-1 text-cyan hover:bg-white/10" href="/studio/collection">Collection Studio</Link>
        <Link className="rounded-md px-2 py-1 text-cyan hover:bg-white/10" href="/collections/create">Create</Link>
        <Link className="rounded-md px-2 py-1 text-cyan hover:bg-white/10" href="/dashboard/creator">Creator</Link>
        <Link className="rounded-md px-2 py-1 text-cyan hover:bg-white/10" href="/earn">Earn</Link>
        <button className="rounded-md px-2 py-1 text-muted hover:bg-white/10 hover:text-white" onClick={() => void logout()}>Logout</button>
      </div>
    </div>
  );
}
