import { CheckCircle2, Circle } from "lucide-react";

const stages = [
  ["enhancing_prompt", "Prompt enhanced", "Prompt is improved by backend AI."],
  ["generating_image", "Image generated", "AI image generation is running."],
  ["image_ready", "Image ready", "Preview image is available."],
  ["uploading_image_ipfs", "Image IPFS", "Generated image is pinned."],
  ["generating_metadata", "Metadata", "ERC721 metadata is created."],
  ["uploading_metadata_ipfs", "Metadata IPFS", "Metadata JSON is pinned."],
  ["ready_to_mint", "Ready to mint", "NFTItem exists in MongoDB."],
  ["minting", "Minting", "Wallet transaction is pending."],
  ["verifying_mint", "Verifying", "Backend confirms tx receipt."],
  ["minted", "Minted", "NFT is confirmed on-chain."]
] as const;

const rank: Record<string, number> = {
  pending: 0,
  queued: 0,
  enhancing_prompt: 1,
  generating_image: 2,
  image_ready: 3,
  uploading_image_ipfs: 4,
  generating_metadata: 5,
  uploading_metadata_ipfs: 6,
  ready_to_mint: 7,
  minting: 8,
  verifying_mint: 9,
  minted: 10
};

export function GenerationTimeline({ status }: { status: string }) {
  const current = rank[status] ?? 0;
  return (
    <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-5">
      {stages.map(([stage, label, description], index) => {
        const done = current > index;
        return (
          <div key={stage} className={`rounded-md border p-3 ${done ? "border-lime/30 bg-lime/10 text-lime" : "border-white/10 bg-white/5"}`}>
            {done ? <CheckCircle2 className="mb-2 h-4 w-4" /> : <Circle className="mb-2 h-4 w-4" />}
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-xs opacity-80">{description}</p>
          </div>
        );
      })}
    </div>
  );
}
