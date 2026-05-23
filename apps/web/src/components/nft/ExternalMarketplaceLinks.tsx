"use client";

import { ExternalLink } from "lucide-react";
import { getExternalMarketplaceLinks } from "@/lib/web3/marketplace-links";

type ExternalMarketplaceLinksProps = {
  chainId: number;
  contractAddress?: string;
  tokenId?: string | number;
  txHash?: string;
};

export function ExternalMarketplaceLinks({ chainId, contractAddress, tokenId, txHash }: ExternalMarketplaceLinksProps) {
  const links = getExternalMarketplaceLinks({ chainId, contractAddress, tokenId, txHash });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-cyan">External marketplace</p>
        <p className="mt-1 text-xs text-muted">External marketplaces may take time to index newly minted NFTs.</p>
      </div>

      {links.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-cyan/30 px-3 py-2 text-xs font-bold text-cyan transition hover:bg-cyan/10"
            >
              {link.label} <ExternalLink size={13} />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-muted">
          Marketplace links will appear after the NFT is minted and indexed.
        </p>
      )}
    </div>
  );
}
