import type { NftResultItem } from "@/lib/api/nft";

function short(value?: string) {
  return value && value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value ?? "Unavailable";
}

async function copy(value?: string) {
  if (!value || typeof navigator === "undefined") return;
  await navigator.clipboard.writeText(value);
}

export function NftOnchainDetails({ nft }: { nft: NftResultItem }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <h3 className="text-xl font-bold">On-chain Details</h3>
      <div className="mt-4 grid gap-3 text-sm">
        <Detail label="Chain" value={nft.chainName ?? (nft.chainId ? String(nft.chainId) : undefined)} />
        <Detail label="Contract" value={short(nft.contractAddress)} raw={nft.contractAddress} />
        <Detail label="Token ID" value={nft.tokenId ?? "Not minted yet"} />
        <Detail label="Owner" value={short(nft.ownerWallet)} raw={nft.ownerWallet} />
        <Detail label="Transaction" value={short(nft.mintTxHash)} raw={nft.mintTxHash} />
        <Detail label="Metadata URI" value={nft.metadataIpfsUri ?? "Metadata unavailable"} raw={nft.metadataIpfsUri} />
        <Detail label="Metadata Gateway" value={short(nft.metadataGatewayUrl)} raw={nft.metadataGatewayUrl} href={nft.metadataGatewayUrl} />
        <Detail label="Image IPFS URI" value={nft.imageIpfsUri ?? "Image IPFS unavailable"} raw={nft.imageIpfsUri} />
        <Detail label="Image Gateway" value={short(nft.imageGatewayUrl)} raw={nft.imageGatewayUrl} href={nft.imageGatewayUrl} />
      </div>
    </div>
  );
}

function Detail({ label, value, raw, href }: { label: string; value?: string; raw?: string; href?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
      <div>
        <p className="text-xs uppercase text-muted">{label}</p>
        <p className="mt-1 break-all font-semibold">{value ?? "Unavailable"}</p>
      </div>
      <div className="flex gap-2">
        {href && <a className="rounded-md border border-cyan/30 px-3 py-1 text-xs text-cyan hover:bg-cyan/10" href={href} target="_blank" rel="noreferrer">Open</a>}
        {raw && <button className="rounded-md border border-cyan/30 px-3 py-1 text-xs text-cyan hover:bg-cyan/10" onClick={() => void copy(raw)}>Copy</button>}
      </div>
    </div>
  );
}
