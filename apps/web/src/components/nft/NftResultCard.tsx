"use client";

import { useState } from "react";
import type { NftResultItem } from "@/lib/api/nft";
import { ChainBadge } from "@/components/web3/ChainBadge";

function gatewayFromIpfs(ipfsUri: string | undefined, gateway: string) {
  if (!ipfsUri?.startsWith("ipfs://")) return undefined;
  return `${gateway.replace(/\/$/, "")}/${ipfsUri.replace("ipfs://", "").replace(/^\/+/, "")}`;
}

export function NftResultCard({ nft }: { nft: NftResultItem }) {
  const imageCandidates = [
    nft.imageGatewayUrl,
    nft.imageUrl,
    gatewayFromIpfs(nft.imageIpfsUri, "https://gateway.pinata.cloud/ipfs"),
    gatewayFromIpfs(nft.imageIpfsUri, "https://ipfs.io/ipfs")
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  const [imageIndex, setImageIndex] = useState(0);
  const imageSrc = imageCandidates[imageIndex];
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-panel">
      <div className={`p-1 ${nft.mintStatus === "minted" ? "bg-[linear-gradient(135deg,rgba(132,204,22,.8),rgba(34,211,238,.8),rgba(236,72,153,.6))]" : "bg-white/10"}`}>
        <div className="aspect-square overflow-hidden rounded-lg bg-black/70">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={nft.name}
              className="h-full w-full object-cover"
              onError={() => setImageIndex((current) => current + 1)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted">
              <span>Image unavailable from current gateway.</span>
              {nft.imageIpfsUri ? <span className="break-all text-xs text-cyan">{nft.imageIpfsUri}</span> : null}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{nft.name}</h2>
            <p className="mt-2 text-sm text-muted">{nft.description || "No description available."}</p>
          </div>
          {nft.chainId ? <ChainBadge chainId={nft.chainId} compact /> : null}
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Token ID" value={nft.tokenId ?? "Not minted yet"} />
          <Info label="Status" value={nft.mintStatus} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
