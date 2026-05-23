import { defineChain, type Chain } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "wagmi/chains";

export const bscTestnet = defineChain({
  id: 97,
  name: "BSC Testnet",
  nativeCurrency: { decimals: 18, name: "Test BNB", symbol: "tBNB" },
  rpcUrls: {
    default: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"] },
    public: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"] }
  },
  blockExplorers: {
    default: { name: "BscScan Testnet", url: "https://testnet.bscscan.com" }
  },
  testnet: true
});

const rpcOverrides: Record<number, string | undefined> = {
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  [arbitrumSepolia.id]: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL,
  [bscTestnet.id]: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL
};

function withRpcOverride(chain: Chain): Chain {
  const rpcUrl = rpcOverrides[chain.id];
  if (!rpcUrl && process.env.NODE_ENV === "development") {
    console.warn(`[NEXMINT] Missing RPC URL for ${chain.name}; falling back to public RPC.`);
  }
  if (!rpcUrl) return chain;
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] }
    }
  };
}

export const SUPPORTED_TESTNET_CHAINS = [
  withRpcOverride(baseSepolia),
  withRpcOverride(sepolia),
  withRpcOverride(arbitrumSepolia),
  withRpcOverride(bscTestnet)
] as const;

export const SUPPORTED_CHAIN_IDS = SUPPORTED_TESTNET_CHAINS.map((chain) => chain.id);

export const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? baseSepolia.id);
export const ENABLE_TESTNET_MODE = process.env.NEXT_PUBLIC_ENABLE_TESTNET_MODE !== "false";

export const CHAIN_METADATA = {
  [baseSepolia.id]: {
    slug: "base-sepolia",
    label: "Base Sepolia",
    badgeClass: "border-blue-400/40 bg-blue-500/15 text-blue-100",
    explorerUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_EXPLORER ?? "https://sepolia.basescan.org",
    singleNftMinterContract: process.env.NEXT_PUBLIC_SINGLE_NFT_MINTER_BASE_SEPOLIA ?? process.env.NEXT_PUBLIC_BASE_SEPOLIA_SINGLE_NFT_CONTRACT,
    marketplaceContract: process.env.NEXT_PUBLIC_NEXMINT_MARKETPLACE_BASE_SEPOLIA
  },
  [sepolia.id]: {
    slug: "sepolia",
    label: "Ethereum Sepolia",
    badgeClass: "border-purple-400/40 bg-purple-500/15 text-purple-100",
    explorerUrl: process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER ?? "https://sepolia.etherscan.io",
    singleNftMinterContract: process.env.NEXT_PUBLIC_SINGLE_NFT_MINTER_SEPOLIA,
    marketplaceContract: process.env.NEXT_PUBLIC_NEXMINT_MARKETPLACE_SEPOLIA
  },
  [arbitrumSepolia.id]: {
    slug: "arbitrum-sepolia",
    label: "Arbitrum Sepolia",
    badgeClass: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
    explorerUrl: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_EXPLORER ?? "https://sepolia.arbiscan.io",
    singleNftMinterContract: undefined,
    marketplaceContract: undefined
  },
  [bscTestnet.id]: {
    slug: "bsc-testnet",
    label: "BSC Testnet",
    badgeClass: "border-yellow-300/50 bg-yellow-400/15 text-yellow-100",
    explorerUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_EXPLORER ?? "https://testnet.bscscan.com",
    singleNftMinterContract: undefined,
    marketplaceContract: undefined
  }
} as const;

export function getChainById(chainId?: number) {
  return SUPPORTED_TESTNET_CHAINS.find((chain) => chain.id === chainId);
}

export function isSupportedChain(chainId?: number): chainId is (typeof SUPPORTED_CHAIN_IDS)[number] {
  return typeof chainId === "number" && SUPPORTED_CHAIN_IDS.includes(chainId);
}

export function getChainMetadata(chainId?: number) {
  return chainId ? CHAIN_METADATA[chainId as keyof typeof CHAIN_METADATA] : undefined;
}

export function getExplorerTxUrl(chainId: number, txHash: string) {
  const metadata = getChainMetadata(chainId);
  return metadata ? `${metadata.explorerUrl}/tx/${txHash}` : undefined;
}

export function getExplorerAddressUrl(chainId: number, address: string) {
  const metadata = getChainMetadata(chainId);
  return metadata ? `${metadata.explorerUrl}/address/${address}` : undefined;
}
