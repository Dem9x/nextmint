"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { NetworkModeSwitcher } from "@/components/web3/NetworkModeSwitcher";
import { WrongNetworkBanner } from "@/components/web3/WrongNetworkBanner";
import { useAuthStore } from "@/stores/auth.store";
import { UserMenu } from "@/components/auth/UserMenu";

const publicNav = [
  ["Launchpad", "/launchpad"],
  ["Market", "/marketplace"],
  ["Studio", "/studio"],
  ["Collection Studio", "/studio/collection"],
  ["Pricing", "/pricing"],
  ["Docs", "/docs"]
];

const authedNav = [
  ["Dashboard", "/dashboard"]
];

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const nav = user ? [...publicNav, ...authedNav] : publicNav;
  const navLabel = (label: string) => label === "Collection Studio" ? "Collection" : label;
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050608]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex min-h-16 items-center justify-between gap-4">
            <Link href="/" className="shrink-0 text-lg font-black tracking-wide text-white transition hover:text-cyan">NEXMINT AI</Link>
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-sm text-muted lg:flex">
              {nav.map(([label, href]) => (
                <Link key={href} href={href} className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white xl:px-4">
                  {navLabel(label)}
                </Link>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <CompactConnectButton />
              {isLoading ? <div className="h-10 w-24 animate-pulse rounded-full bg-white/10" /> : user ? <UserMenu /> : (
                <div className="hidden gap-2 sm:flex">
                  <Link className="rounded-full border border-white/10 px-3 py-2 text-sm hover:bg-white/10" href="/auth/login">Login</Link>
                  <Link className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm text-cyan hover:bg-cyan/20" href="/auth/register">Register</Link>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 py-3">
            <div className="min-w-0 max-w-full flex-1">
              <NetworkModeSwitcher />
            </div>
            <div className="hidden shrink-0 items-center rounded-full border border-cyan/15 bg-cyan/[0.06] px-3 py-2 text-xs font-medium text-muted xl:flex">
              AI Launchpad Testnet Mode
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 border-t border-white/5 px-4 py-2 text-xs text-muted lg:hidden">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full border border-white/10 px-3 py-1 hover:border-cyan/40 hover:text-white">
              {navLabel(label)}
            </Link>
          ))}
        </nav>
      </header>
      <WrongNetworkBanner />
    </>
  );
}

function CompactConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className="flex h-10 items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 text-sm font-semibold text-cyan hover:bg-cyan/20">
              <Wallet size={16} /> Connect
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button type="button" onClick={openChainModal} className="h-10 rounded-full border border-rose/40 bg-rose/10 px-3 text-sm font-semibold text-rose">
              Wrong network
            </button>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <button type="button" onClick={openChainModal} className="hidden h-10 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white hover:bg-white/10 md:block">
              {chain.name}
            </button>
            <button type="button" onClick={openAccountModal} className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white hover:bg-white/10">
              {account.displayBalance && <span className="hidden text-muted xl:inline">{account.displayBalance}</span>}
              <span>{account.displayName}</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
