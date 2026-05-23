type NftLinkInput = {
  chainId?: number;
  contractAddress?: string;
  tokenId?: string | number;
};

type TxLinkInput = {
  chainId?: number;
  txHash?: string;
};

const CHAIN_LINKS: Record<number, {
  explorer: string;
  openSeaSlug?: string;
  magicEdenSlug?: string;
  reservoirSlug?: string;
}> = {
  8453: {
    explorer: "https://basescan.org",
    openSeaSlug: "base",
    magicEdenSlug: "base",
    reservoirSlug: "base"
  },
  84532: {
    explorer: "https://sepolia.basescan.org",
    openSeaSlug: "base-sepolia",
    reservoirSlug: "base-sepolia"
  },
  11155111: {
    explorer: "https://sepolia.etherscan.io",
    openSeaSlug: "sepolia",
    reservoirSlug: "sepolia"
  },
  80002: {
    explorer: "https://amoy.polygonscan.com",
    openSeaSlug: "amoy",
    reservoirSlug: "polygon-amoy"
  }
};

function cleanAddress(address?: string) {
  return address?.trim();
}

function cleanTokenId(tokenId?: string | number) {
  if (tokenId === undefined || tokenId === null || tokenId === "") return undefined;
  return String(tokenId);
}

export function getExplorerBaseUrl(chainId?: number) {
  return chainId ? CHAIN_LINKS[chainId]?.explorer : undefined;
}

export function getExplorerNftUrl(input: NftLinkInput) {
  const baseUrl = getExplorerBaseUrl(input.chainId);
  const contractAddress = cleanAddress(input.contractAddress);
  const tokenId = cleanTokenId(input.tokenId);
  return baseUrl && contractAddress && tokenId ? `${baseUrl}/token/${contractAddress}?a=${tokenId}` : undefined;
}

export function getExplorerTxUrl(input: TxLinkInput) {
  const baseUrl = getExplorerBaseUrl(input.chainId);
  return baseUrl && input.txHash ? `${baseUrl}/tx/${input.txHash}` : undefined;
}

export function getOpenSeaUrl(input: NftLinkInput) {
  const config = input.chainId ? CHAIN_LINKS[input.chainId] : undefined;
  const contractAddress = cleanAddress(input.contractAddress);
  const tokenId = cleanTokenId(input.tokenId);
  if (!config?.openSeaSlug || !contractAddress || !tokenId) return undefined;
  const host = input.chainId === 8453 ? "https://opensea.io" : "https://testnets.opensea.io";
  return `${host}/assets/${config.openSeaSlug}/${contractAddress}/${tokenId}`;
}

export function getMagicEdenUrl(input: NftLinkInput) {
  const config = input.chainId ? CHAIN_LINKS[input.chainId] : undefined;
  const contractAddress = cleanAddress(input.contractAddress);
  const tokenId = cleanTokenId(input.tokenId);
  if (!config?.magicEdenSlug || !contractAddress || !tokenId) return undefined;
  return `https://magiceden.io/item-details/${config.magicEdenSlug}/${contractAddress}/${tokenId}`;
}

export function getReservoirUrl(input: NftLinkInput) {
  const config = input.chainId ? CHAIN_LINKS[input.chainId] : undefined;
  const contractAddress = cleanAddress(input.contractAddress);
  const tokenId = cleanTokenId(input.tokenId);
  if (!config?.reservoirSlug || !contractAddress || !tokenId) return undefined;
  return `https://reservoir.market/${config.reservoirSlug}/asset/${contractAddress}:${tokenId}`;
}

export function getExternalMarketplaceLinks(input: NftLinkInput & TxLinkInput) {
  return [
    { label: "View on Explorer", url: getExplorerNftUrl(input) },
    { label: "View Transaction", url: getExplorerTxUrl(input) },
    { label: "View on OpenSea", url: getOpenSeaUrl(input) },
    { label: "View on Magic Eden", url: getMagicEdenUrl(input) },
    { label: "View on Reservoir", url: getReservoirUrl(input) }
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));
}
