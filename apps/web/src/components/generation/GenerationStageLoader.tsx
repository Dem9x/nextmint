import { GenerateCatLoader } from "@/components/loaders/GenerateCatLoader";
import { IpfsCatLoader } from "@/components/loaders/IpfsCatLoader";
import { MintCatLoader } from "@/components/loaders/MintCatLoader";
import { TransactionCatLoader } from "@/components/loaders/TransactionCatLoader";

export function GenerationStageLoader({ status }: { status: string }) {
  if (["enhancing_prompt", "generating_image", "queued", "pending"].includes(status)) return <GenerateCatLoader />;
  if (["uploading_image_ipfs", "generating_metadata", "uploading_metadata_ipfs"].includes(status)) return <IpfsCatLoader />;
  if (status === "minting") return <MintCatLoader />;
  if (status === "verifying_mint") return <TransactionCatLoader />;
  return null;
}
