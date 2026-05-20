import { CheckCircle2, Clock3 } from "lucide-react";
import type { NftResultItem } from "@/lib/api/nft";

export function NftSuccessHero({ nft }: { nft: NftResultItem }) {
  const minted = nft.mintStatus === "minted";
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-panel p-6 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(132,204,22,0.16),transparent_35%)]" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${minted ? "border-lime/30 bg-lime/10 text-lime" : "border-cyan/30 bg-cyan/10 text-cyan"}`}>
            {minted ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
            {minted ? "On-chain confirmed" : "Metadata ready"}
          </div>
          <h1 className="mt-4 text-4xl font-black">{minted ? "NFT Minted Successfully" : "NFT Metadata Ready"}</h1>
          <p className="mt-2 text-muted">{minted ? "Your AI-generated NFT is now on-chain." : "This NFT has not been minted yet."}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Step active={Boolean(nft.imageIpfsUri)} label="Image generated" />
          <Step active={Boolean(nft.metadataIpfsUri)} label="Metadata uploaded" />
          <Step active={minted} label="Mint confirmed" />
        </div>
      </div>
    </div>
  );
}

function Step({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-center ${active ? "border-lime/30 bg-lime/10 text-lime" : "border-white/10 bg-white/5 text-muted"}`}>
      {label}
    </div>
  );
}
