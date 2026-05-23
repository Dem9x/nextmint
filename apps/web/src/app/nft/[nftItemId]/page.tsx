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
import { ExternalMarketplaceLinks } from "@/components/nft/ExternalMarketplaceLinks";
import { ListForSaleModal } from "@/components/nft/ListForSaleModal";
import { getNftItem, type NftResultItem } from "@/lib/api/nft";
import { getExplorerAddressUrl, getExplorerTokenUrl, getExplorerTxUrl } from "@/lib/web3/explorer";

export default function NftResultPage() {
  const params = useParams<{ nftItemId: string }>();
  const [nft, setNft] = useState<NftResultItem>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);

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
  const canListForSale = Boolean(nft?.mintStatus === "minted" && nft.chainId && nft.contractAddress && nft.tokenId);

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
              <div className="rounded-xl border border-cyan/20 bg-cyan/[0.04] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-cyan">NEXMINT Marketplace</p>
                    <p className="mt-1 text-xs text-muted">List this minted NFT for a fixed-price sale inside NEXMINT.</p>
                  </div>
                  <Button disabled={!canListForSale} onClick={() => setShowListModal(true)}>
                    List for Sale
                  </Button>
                </div>
                {!canListForSale && (
                  <p className="mt-3 text-xs text-muted">Listing unlocks after the NFT has chain, contract, and token ID data.</p>
                )}
              </div>
              {nft.chainId ? (
                <ExternalMarketplaceLinks
                  chainId={nft.chainId}
                  contractAddress={nft.contractAddress}
                  tokenId={nft.tokenId}
                  txHash={nft.mintTxHash}
                />
              ) : null}
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
      {nft && (
        <ListForSaleModal
          open={showListModal}
          onClose={() => setShowListModal(false)}
          nft={nft}
          onListed={() => setShowListModal(false)}
        />
      )}
    </main>
  );
}
