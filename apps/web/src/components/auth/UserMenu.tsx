"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

function short(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No wallet";
}

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const activePlan = user.activePlan ?? user.plan ?? "free";
  const planClass =
    activePlan === "pro" ? "border-cyan/40 bg-cyan/15 text-cyan" :
    activePlan === "enterprise" ? "border-fuchsia-300/40 bg-fuchsia-300/15 text-fuchsia-100" :
    activePlan === "starter" ? "border-lime/40 bg-lime/15 text-lime" :
    "border-white/15 bg-white/5 text-muted";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm transition hover:border-cyan/30 hover:bg-white/[0.07]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan/15 text-cyan">
          <UserCircle size={17} />
        </span>
        <span className="hidden text-left md:block">
          <span className="block max-w-28 truncate font-bold">{user.username ?? user.email ?? short(user.walletAddress)}</span>
          <span className="block text-[11px] text-muted">{user.credits} credits</span>
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${planClass}`}>
          {activePlan}
        </span>
        <ChevronDown size={14} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-white/10 bg-[#080b12]/95 p-3 text-sm shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2">
              <p className="truncate font-bold">{user.username ?? user.email ?? short(user.walletAddress)}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${planClass}`}>
                {activePlan}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{short(user.walletAddress)} / {user.credits} credits</p>
            <p className="mt-1 text-[11px] text-muted">Max public supply: {user.planLimits?.maxCollectionSize ?? 0}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MenuLink href="/dashboard" label="Dashboard" />
            <MenuLink href="/studio" label="Studio" />
            <MenuLink href="/studio/collection" label="Collection" />
            <MenuLink href="/collections/create" label="Create" />
            <MenuLink href="/dashboard/creator" label="Creator" />
            <MenuLink href="/earn" label="Earn" />
          </div>
          <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-muted hover:bg-white/10 hover:text-white" onClick={() => void logout()}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="rounded-md px-3 py-2 text-cyan hover:bg-white/10" href={href}>
      {label}
    </Link>
  );
}
