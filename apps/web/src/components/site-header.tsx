"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NetworkModeSwitcher } from "@/components/web3/NetworkModeSwitcher";
import { WrongNetworkBanner } from "@/components/web3/WrongNetworkBanner";
import { useAuthStore } from "@/stores/auth.store";
import { UserMenu } from "@/components/auth/UserMenu";

const publicNav = [
  ["Launchpad", "/launchpad"],
  ["Studio", "/studio"],
  ["Collection Studio", "/studio/collection"],
  ["Pricing", "/pricing"],
  ["Docs", "/docs"]
];

const authedNav = [
  ["Dashboard", "/dashboard"],
  ["Create", "/collections/create"],
  ["Creator", "/dashboard/creator"],
  ["Earn", "/earn"]
];

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const nav = user ? [...publicNav, ...authedNav] : publicNav;
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-black tracking-wide">NEXMINT AI</Link>
          <nav className="hidden items-center gap-5 text-sm text-muted lg:flex">
            {nav.map(([label, href]) => <Link key={href} href={href} className="hover:text-white">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <NetworkModeSwitcher />
            <ConnectButton />
            {isLoading ? <div className="h-10 w-28 animate-pulse rounded-md bg-white/10" /> : user ? <UserMenu /> : (
              <div className="hidden gap-2 sm:flex">
                <Link className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/10" href="/auth/login">Login</Link>
                <Link className="rounded-md border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm text-cyan hover:bg-cyan/20" href="/auth/register">Register</Link>
              </div>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-3 overflow-x-auto border-t border-white/5 px-4 py-2 text-xs text-muted lg:hidden">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full border border-white/10 px-3 py-1 hover:border-cyan/40 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <WrongNetworkBanner />
    </>
  );
}
