import { ArrowRight, BookOpen, Boxes, CheckCircle2, Code2, Database, FileJson, Globe2, KeyRound, Layers, Rocket, ShieldCheck, Terminal, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const docCards = [
  ["Quick Start", BookOpen, "Run the web app, API, contracts, Redis workers, and required local services.", "/docs/quick-start"],
  ["Architecture", Layers, "Understand the frontend, API, workers, storage, database, and contracts.", "/docs/architecture"],
  ["Deployment", Rocket, "Deploy Base Sepolia contracts, configure env, and verify addresses.", "/docs/deployment"],
  ["Crypto Payments", Wallet, "Payment quote, on-chain payment, backend verification, and dashboard history.", "/docs/crypto-payments"],
  ["Cloud Services", Globe2, "AI providers, IPFS/Filebase, MongoDB, Redis, and external infrastructure.", "/docs/cloud-services"],
  ["Folder Structure", Code2, "Navigate the monorepo workspaces, app routes, API services, and contracts.", "/docs/folder-structure"]
] satisfies Array<[string, LucideIcon, string, string]>;

const apiGroups = [
  ["Auth", ["POST /api/auth/register", "POST /api/auth/login", "GET /api/auth/me", "POST /api/auth/wallet/verify"]],
  ["AI + NFT", ["POST /api/generate", "POST /api/nft/prepare-from-generation", "POST /api/nft/verify-mint", "GET /api/nft/items/:id"]],
  ["Collections", ["POST /api/collections/generate", "GET /api/collections/:id/generation-status", "POST /api/collections/:id/deploy", "POST /api/collections/:id/publish"]],
  ["Launchpad", ["GET /api/launchpad/collections", "GET /api/launchpad/collections/:slug", "POST /api/launchpad/collections/:id/verify-mint"]],
  ["Pricing", ["GET /api/pricing/plans", "POST /api/subscription/quote", "POST /api/subscription/verify-payment", "GET /api/subscription/status"]],
  ["Admin", ["GET /api/admin/dashboard/summary", "GET /api/admin/treasury/balances", "POST /api/admin/treasury/sync", "POST /api/admin/payouts/:id/approve"]]
];

const launchChecklist = [
  "Generate collection assets through Collection Studio",
  "Upload every image to IPFS/Filebase",
  "Create metadata files from 1.json to maxSupply.json",
  "Upload metadata folder and validate baseURI",
  "Deploy ERC721A collection from factory",
  "Verify publish fee payment",
  "Publish public mint campaign",
  "Verify public mint receipts before updating stats"
];

const envGroups = [
  ["Core", ["NEXT_PUBLIC_API_URL", "MONGODB_URI", "REDIS_URL", "JWT_SECRET"]],
  ["AI", ["OPENROUTER_API_KEY", "REPLICATE_API_TOKEN", "HUGGINGFACE_API_KEY"]],
  ["IPFS", ["IPFS_PROVIDER=filebase", "FILEBASE_ACCESS_KEY", "FILEBASE_SECRET_KEY", "FILEBASE_BUCKET"]],
  ["Base", ["BASE_SEPOLIA_RPC_URL", "BASE_SEPOLIA_PRIVATE_KEY", "BASE_SEPOLIA_NFT_FACTORY", "BASE_SEPOLIA_PAYMENT_CONTRACT"]]
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <SiteHeader />
      <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),transparent_45%,rgba(163,230,53,0.07))]">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan">
              <Terminal size={14} /> Builder Docs
            </div>
            <h1 className="mt-6 text-5xl font-black leading-tight md:text-6xl">NEXMINT AI documentation</h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Developer notes for the AI generator, IPFS metadata pipeline, ERC721A launchpad, crypto payments, subscription system, and admin operations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center gap-2 rounded-md bg-cyan px-5 text-sm font-black text-slate-950 hover:brightness-110" href="/studio/collection">
                Start Collection Flow <ArrowRight size={16} />
              </Link>
              <Link className="inline-flex h-11 items-center rounded-md border border-white/15 px-5 text-sm font-bold hover:bg-white/10" href="https://github.com/Dem9x/nextmint">
                GitHub Repository
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 md:grid-cols-2 lg:grid-cols-3">
        {docCards.map(([title, Icon, text, href]) => (
          <Link key={title} className="rounded-xl border border-white/10 bg-[#0b1020] p-6 transition hover:border-cyan/40 hover:bg-white/[0.055]" href={href}>
            <Icon className="text-cyan" />
            <h2 className="mt-5 text-xl font-black">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-xl border border-white/10 bg-[#0b1020] p-6">
          <div className="flex items-center gap-3">
            <Boxes className="text-lime" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-lime">Launchpad checklist</p>
              <h2 className="mt-1 text-2xl font-black">Safe collection deploy flow</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {launchChecklist.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                <CheckCircle2 className="mt-0.5 shrink-0 text-lime" size={17} />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1020] p-6">
          <div className="flex items-center gap-3">
            <Database className="text-cyan" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan">API map</p>
              <h2 className="mt-1 text-2xl font-black">Core REST endpoints</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {apiGroups.map(([group, endpoints]) => (
              <div key={group as string} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <h3 className="font-black">{group}</h3>
                <div className="mt-3 space-y-2">
                  {(endpoints as string[]).map((endpoint) => (
                    <code key={endpoint} className="block rounded-md bg-white/[0.04] px-3 py-2 text-xs text-slate-300">{endpoint}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0b1020] p-6">
          <div className="flex items-center gap-3">
            <KeyRound className="text-cyan" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan">Environment</p>
              <h2 className="mt-1 text-2xl font-black">Required config groups</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {envGroups.map(([group, vars]) => (
              <div key={group as string} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <h3 className="font-black">{group}</h3>
                <div className="mt-3 space-y-2">
                  {(vars as string[]).map((name) => (
                    <code key={name} className="block rounded-md bg-white/[0.04] px-3 py-2 text-xs text-slate-300">{name}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-cyan/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(11,16,32,0.95)_55%,rgba(163,230,53,0.08))] p-6">
          <FileJson className="text-lime" />
          <h2 className="mt-5 text-2xl font-black">Metadata rule of thumb</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Single NFT minting uses one direct token URI. Collection launchpad minting uses a folder base URI and token IDs starting at 1.
          </p>
          <div className="mt-5 space-y-3">
            <CodeBlock label="Single NFT tokenURI" value="ipfs://IMAGE_METADATA_CID" />
            <CodeBlock label="Collection baseURI" value="ipfs://METADATA_FOLDER_CID/" />
            <CodeBlock label="tokenURI(1)" value="ipfs://METADATA_FOLDER_CID/1.json" />
          </div>
          <div className="mt-6 rounded-lg border border-lime/20 bg-lime/10 p-4 text-sm text-lime">
            Deploy is intentionally blocked until every generated item has image IPFS, metadata JSON, metadata IPFS, and a valid collection baseURI.
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.025]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan">Need the product flow?</p>
            <p className="mt-2 text-muted">Generate assets first, then deploy and publish from the manage page.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center rounded-md border border-white/10 px-4 text-sm font-bold hover:bg-white/10" href="/studio">
              Single NFT Studio
            </Link>
            <Link className="inline-flex h-11 items-center rounded-md bg-cyan px-4 text-sm font-black text-slate-950" href="/studio/collection">
              Collection Studio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <code className="mt-2 block break-all text-sm text-cyan">{value}</code>
    </div>
  );
}
