import { ArrowRight, Bot, Boxes, Coins, FileJson, Layers, LockKeyhole, Rocket, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const features = [
  ["AI asset engine", Bot, "Generate single NFTs or full trait-weighted collections with retry-safe backend workers."],
  ["IPFS metadata", FileJson, "Images and ERC721 metadata are pinned before deploy, with collection baseURI validation."],
  ["ERC721A launchpad", Rocket, "Deploy collection contracts, publish campaigns, and open public mint pages."],
  ["Revenue rails", Coins, "Publish fees, mint fees, creator earnings, crypto quotes, and treasury tracking."],
  ["Wallet native", Wallet, "RainbowKit, signature auth, testnet switching, and verified on-chain transactions."],
  ["Operator controls", ShieldCheck, "Admin-only routes, guarded deploys, publish checks, and no mock dashboard data."]
] satisfies Array<[string, LucideIcon, string]>;

const pipeline = [
  ["Generate", "AI creates the art set and weighted traits."],
  ["Pin", "Images and 1.json...N.json metadata go to IPFS."],
  ["Deploy", "Factory creates an ERC721A public mint contract."],
  ["Publish", "Creator pays launch fee and opens the campaign."],
  ["Mint", "Collectors mint from the launchpad and revenue is split."]
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <SiteHeader />
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(34,211,238,0.14),transparent_35%,rgba(163,230,53,0.08)_70%,transparent)]" />
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-[1fr_.92fr]">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan">
              <Sparkles size={14} /> AI NFT Launchpad
            </div>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.95] md:text-7xl">
              Build AI collections that are ready for public mint.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              NEXMINT AI turns prompts into IPFS-backed NFT drops: generate assets, prepare metadata, deploy ERC721A contracts, publish launchpad campaigns, and track real creator revenue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cyan px-5 text-sm font-black text-slate-950 transition hover:brightness-110" href="/studio/collection">
                Generate Collection <ArrowRight size={18} />
              </Link>
              <Link className="inline-flex h-12 items-center rounded-md border border-white/15 bg-white/[0.03] px-5 text-sm font-bold transition hover:bg-white/10" href="/launchpad">
                Explore Launchpad
              </Link>
              <Link className="inline-flex h-12 items-center rounded-md border border-lime/30 bg-lime/10 px-5 text-sm font-bold text-lime transition hover:bg-lime/15" href="/pricing">
                View Plans
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <MiniStat label="Modes" value="Single + Collection" />
              <MiniStat label="Metadata" value="IPFS first" />
              <MiniStat label="Network" value="Testnet ready" />
            </div>
          </div>

          <HeroShowcase />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan">Launch flow</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">From prompt to public mint</h2>
          </div>
          <Link className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10" href="/docs">
            Read Docs <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {pipeline.map(([title, text], index) => (
            <div key={title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan/30 bg-cyan/10 text-sm font-black text-cyan">{index + 1}</div>
              <h3 className="mt-5 font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 lg:grid-cols-2">
        <ModeCard
          icon={Zap}
          title="Single NFT Studio"
          text="Generate one premium AI image, pin the image and metadata, then mint with the default NEXMINT single NFT contract."
          href="/studio"
          cta="Open Studio"
        />
        <ModeCard
          icon={Boxes}
          title="Pre-generated Collection"
          text="Create 10, 100, 1000, or custom supply collections with unique traits, folder metadata, and ERC721A public mint."
          href="/studio/collection"
          cta="Build Collection"
        />
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, Icon, text]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-[#0b1020]/80 p-6">
              <Icon className="mb-5 text-cyan" />
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="overflow-hidden rounded-xl border border-cyan/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(5,7,13,0.92)_55%,rgba(163,230,53,0.12))] p-8 md:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime">Creator-ready</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">Launch collections with real metadata, real contracts, and real verification.</h2>
            <p className="mt-5 text-sm leading-7 text-slate-300 md:text-base">
              No fake mint counts, no mock revenue, no broken baseURI. NEXMINT keeps the launch checklist strict so creators know exactly when a campaign is ready.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan px-5 text-sm font-black text-slate-950" href="/collections/create">
                Create Campaign <ArrowRight size={17} />
              </Link>
              <Link className="inline-flex h-11 items-center rounded-md border border-white/15 px-5 text-sm font-bold hover:bg-white/10" href="/dashboard/creator">
                Creator Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroShowcase() {
  return (
    <div className="relative z-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-cyan/10 backdrop-blur-xl">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#090d18]">
          <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#10203a,#071018_42%,#132a26)]">
            <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
            <div className="absolute left-6 top-6 rounded-full border border-cyan/30 bg-black/30 px-3 py-1 text-xs font-bold text-cyan">LIVE TESTNET DROP</div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="grid grid-cols-3 gap-3">
                <PreviewTile title="#1" tone="cyan" />
                <PreviewTile title="#2" tone="lime" />
                <PreviewTile title="#3" tone="violet" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-36 w-36 rounded-[2rem] border border-cyan/30 bg-cyan/10 p-4 shadow-[0_0_80px_rgba(34,211,238,.22)]">
                <div className="h-full w-full rounded-[1.5rem] bg-[conic-gradient(from_180deg,#22d3ee,#a3e635,#8b5cf6,#22d3ee)] p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-[1.4rem] bg-[#071018]">
                    <Layers className="text-cyan" size={46} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-3">
            <MiniStat label="baseURI" value="ipfs://CID/" />
            <MiniStat label="Mint" value="ERC721A" />
            <MiniStat label="Guard" value="Verified" />
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1020] p-4">
        <div className="flex items-center gap-3">
          <LockKeyhole className="text-lime" size={18} />
          <p className="text-sm text-slate-300">Deploy is unlocked only after every generated item has image IPFS and metadata IPFS ready.</p>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ title, tone }: { title: string; tone: "cyan" | "lime" | "violet" }) {
  const color = tone === "cyan" ? "from-cyan/70" : tone === "lime" ? "from-lime/70" : "from-violet-400/70";
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-2">
      <div className={`aspect-square rounded-md bg-gradient-to-br ${color} via-white/10 to-black`} />
      <p className="mt-2 text-xs font-black">{title} Metadata ready</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}

function ModeCard({ icon: Icon, title, text, href, cta }: { icon: LucideIcon; title: string; text: string; href: string; cta: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1020] p-7">
      <Icon className="text-cyan" />
      <h2 className="mt-5 text-2xl font-black">{title}</h2>
      <p className="mt-3 min-h-16 text-sm leading-6 text-muted">{text}</p>
      <Link className="mt-6 inline-flex h-11 items-center gap-2 rounded-md border border-cyan/30 px-4 text-sm font-bold text-cyan hover:bg-cyan/10" href={href}>
        {cta} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
