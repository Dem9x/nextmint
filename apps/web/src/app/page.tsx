import { ArrowRight, Bot, Coins, Layers, Rocket, ShieldCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const features = [
  ["AI generation", Bot, "SDXL, FLUX, HuggingFace, ComfyUI, LoRA, prompt enhancement, upscaling."],
  ["Collection engine", Layers, "Weighted traits, duplicate prevention, rarity scores, metadata, ZIP exports."],
  ["Crypto payments", Coins, "ETH, USDC, USDT, DAI across Base, Ethereum, Polygon, Arbitrum, and BNB."],
  ["Launchpad", Rocket, "ERC721A deploys, whitelist, reveal, royalties, mint pages, revenue analytics."],
  ["Wallet native", Wallet, "RainbowKit, WalletConnect, MetaMask, Rabby, Coinbase Wallet."],
  ["Secure ops", ShieldCheck, "JWT, wallet signatures, rate limits, transaction verification, admin controls."]
] satisfies Array<[string, LucideIcon, string]>;

export default function HomePage() {
  return (
    <main className="mesh min-h-screen">
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase text-cyan">AI Web3 launch infrastructure</p>
          <h1 className="max-w-4xl text-5xl font-black leading-tight md:text-7xl">NEXMINT AI</h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">Generate full NFT collections, upload metadata to IPFS, deploy ERC721A contracts, and run wallet-native mint launches with crypto subscriptions and credit payments.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan px-5 text-sm font-semibold text-slate-950 transition hover:brightness-110" href="/studio">Open Studio <ArrowRight size={18} /></Link>
            <Link className="inline-flex h-11 items-center rounded-md border border-white/15 px-5 text-sm font-semibold" href="/launchpad">Explore launchpad</Link>
            <Link className="inline-flex h-11 items-center rounded-md border border-cyan/30 px-5 text-sm font-semibold text-cyan" href="/collections/create">Launch collection</Link>
          </div>
        </div>
        <div className="relative grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <div className="aspect-[5/3] rounded-md bg-[linear-gradient(135deg,#22d3ee,#111827_45%,#a3e635)]" />
              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold">Genesis #{i + 421}</span>
                <span className="text-sm text-lime">Mythic</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-16 md:grid-cols-3">
        {features.map(([title, Icon, text]) => (
          <div key={title as string} className="rounded-lg border border-white/10 bg-panel p-6">
            <Icon className="mb-4 text-cyan" />
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
