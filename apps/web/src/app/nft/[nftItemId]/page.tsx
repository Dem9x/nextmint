"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { NftAttributesGrid } from "@/components/nft/NftAttributesGrid";
import { NftOnchainDetails } from "@/components/nft/NftOnchainDetails";
import { NftResultCard } from "@/components/nft/NftResultCard";
import { NftResultSkeleton } from "@/components/nft/NftResultSkeleton";
import { NftSuccessHero } from "@/components/nft/NftSuccessHero";
import { getNftItem, type NftResultItem } from "@/lib/api/nft";
import { getExplorerAddressUrl, getExplorerTokenUrl, getExplorerTxUrl } from "@/lib/web3/explorer";

export default function NftResultPage() {
  const params = useParams<{ nftItemId: string }>();
  const [nft, setNft] = useState<NftResultItem>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.nftItemId) return;
    getNftItem(params.nftItemId)
      .then(setNft)
      .catch((err) => setError(err instanceof Error ? err.message : "NFT not found"))
      .finally(() => setIsLoading(false));
  }, [params.nftItemId]);

  const txUrl = nft?.explorerTxUrl ?? (nft?.chainId ? getExplorerTxUrl(nft.chainId, nft.mintTxHash) : undefined);
  const contractUrl = nft?.chainId ? getExplorerAddressUrl(nft.chainId, nft.contractAddress) : undefined;
  const tokenUrl = nft?.explorerTokenUrl ?? (nft?.chainId ? getExplorerTokenUrl(nft.chainId, nft.contractAddress, nft.tokenId) : undefined);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      {isLoading && <NftResultSkeleton />}
      {error && !isLoading && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-xl border border-rose/30 bg-rose/10 p-6 text-rose">
            <h1 className="text-3xl font-black">NFT not found</h1>
            <p className="mt-2 text-sm">{error}</p>
            <Link href="/studio"><Button className="mt-5">Back to Studio</Button></Link>
          </div>
        </section>
      )}
      {nft && !isLoading && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <NftSuccessHero nft={nft} />
          {nft.mintStatus !== "minted" && (
            <div className="mt-5 rounded-lg border border-yellow-300/25 bg-yellow-400/10 p-4 text-sm text-yellow-100">
              {nft.mintStatus === "minting" ? "Mint transaction is being verified." : "This NFT is prepared but not minted yet."}
            </div>
          )}
          <div className="mt-6 grid gap-6 lg:grid-cols-[520px_1fr]">
            <NftResultCard nft={nft} />
            <div className="space-y-6">
              <NftOnchainDetails nft={nft} />
              <NftAttributesGrid attributes={nft.attributes} />
              <div className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-panel p-5">
                {txUrl && <a href={txUrl} target="_blank" rel="noreferrer"><Button>View Transaction</Button></a>}
                {contractUrl && <a href={contractUrl} target="_blank" rel="noreferrer"><Button className="border border-cyan/30 bg-transparent text-cyan">View Contract</Button></a>}
                {nft.metadataGatewayUrl && <a href={nft.metadataGatewayUrl} target="_blank" rel="noreferrer"><Button className="border border-cyan/30 bg-transparent text-cyan">View Metadata</Button></a>}
                {nft.imageGatewayUrl && <a href={nft.imageGatewayUrl} target="_blank" rel="noreferrer"><Button className="border border-cyan/30 bg-transparent text-cyan">View Image</Button></a>}
                {tokenUrl && <a href={tokenUrl} target="_blank" rel="noreferrer"><Button className="border border-cyan/30 bg-transparent text-cyan">View NFT on Explorer</Button></a>}
                <Link href="/studio"><Button className="border border-cyan/30 bg-transparent text-cyan">Back to Studio</Button></Link>
                <Link href="/studio"><Button className="border border-cyan/30 bg-transparent text-cyan">Create Another NFT</Button></Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
