import { GenerationStageLoader } from "./GenerationStageLoader";
import { GenerationTimeline } from "./GenerationTimeline";

export function GenerationProgressCard({ status, progress, usedFallback }: { status: string; progress: number; usedFallback?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Progress</p>
          <h2 className="text-2xl font-bold">{labelForStatus(status)}</h2>
        </div>
        {usedFallback && <span className="rounded-md border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">Fallback used</span>}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-cyan transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-5"><GenerationStageLoader status={status} /></div>
      <GenerationTimeline status={status} />
    </div>
  );
}

function labelForStatus(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    queued: "Queued",
    enhancing_prompt: "Enhancing Prompt",
    generating_image: "Generating Image",
    image_ready: "Image Ready",
    uploading_image_ipfs: "Uploading Image to IPFS",
    generating_metadata: "Generating Metadata",
    uploading_metadata_ipfs: "Uploading Metadata to IPFS",
    ready_to_mint: "NFT Metadata Ready",
    minting: "Minting",
    verifying_mint: "Verifying Mint",
    minted: "NFT Minted",
    failed: "Failed"
  };
  return labels[status] ?? status;
}
