import { defineChain, type Chain } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import { env } from "./env.js";

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

export type ChainRegistryEntry = {
  chainId: number;
  slug: "base-sepolia" | "sepolia" | "arbitrum-sepolia" | "bsc-testnet";
  name: string;
  chain: Chain;
  nativeCurrency: "ETH" | "tBNB";
  rpcUrl?: string;
  explorerUrl: string;
  confirmations: number;
  isTestnet: true;
  paymentContract?: `0x${string}`;
  treasuryAddress?: `0x${string}`;
  privateKey?: `0x${string}`;
};

function address(value?: string) {
  return value?.startsWith("0x") ? (value as `0x${string}`) : undefined;
}

function privateKey(value?: string) {
  return value?.startsWith("0x") ? (value as `0x${string}`) : undefined;
}

export const CHAIN_REGISTRY: Record<number, ChainRegistryEntry> = {
  84532: {
    chainId: 84532,
    slug: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    nativeCurrency: "ETH",
    rpcUrl: env.BASE_SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.basescan.org",
    confirmations: 2,
    isTestnet: true,
    paymentContract: address(env.BASE_SEPOLIA_PAYMENT_CONTRACT),
    treasuryAddress: address(env.BASE_SEPOLIA_TREASURY_ADDRESS),
    privateKey: privateKey(env.BASE_SEPOLIA_PRIVATE_KEY)
  },
  11155111: {
    chainId: 11155111,
    slug: "sepolia",
    name: "Ethereum Sepolia",
    chain: sepolia,
    nativeCurrency: "ETH",
    rpcUrl: env.SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.etherscan.io",
    confirmations: 2,
    isTestnet: true,
    paymentContract: address(env.SEPOLIA_PAYMENT_CONTRACT),
    treasuryAddress: address(env.SEPOLIA_TREASURY_ADDRESS),
    privateKey: privateKey(env.SEPOLIA_PRIVATE_KEY)
  },
  421614: {
    chainId: 421614,
    slug: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    nativeCurrency: "ETH",
    rpcUrl: env.ARBITRUM_SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.arbiscan.io",
    confirmations: 2,
    isTestnet: true,
    paymentContract: address(env.ARBITRUM_SEPOLIA_PAYMENT_CONTRACT),
    treasuryAddress: address(env.ARBITRUM_SEPOLIA_TREASURY_ADDRESS),
    privateKey: privateKey(env.ARBITRUM_SEPOLIA_PRIVATE_KEY)
  },
  97: {
    chainId: 97,
    slug: "bsc-testnet",
    name: "BSC Testnet",
    chain: bscTestnet,
    nativeCurrency: "tBNB",
    rpcUrl: env.BSC_TESTNET_RPC_URL,
    explorerUrl: "https://testnet.bscscan.com",
    confirmations: 3,
    isTestnet: true,
    paymentContract: address(env.BSC_TESTNET_PAYMENT_CONTRACT),
    treasuryAddress: address(env.BSC_TESTNET_TREASURY_ADDRESS),
    privateKey: privateKey(env.BSC_TESTNET_PRIVATE_KEY)
  }
};

export const TESTNET_CHAIN_IDS = Object.keys(CHAIN_REGISTRY).map(Number);

export function getChainConfig(chainId: number) {
  return CHAIN_REGISTRY[chainId];
}

export function assertSupportedChain(chainId: number) {
  const chain = getChainConfig(chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  if (env.ENABLE_TESTNET_MODE && !chain.isTestnet) throw new Error(`Mainnet chain rejected in testnet mode: ${chainId}`);
  if (!chain.rpcUrl) throw new Error(`Missing RPC URL for ${chain.name}`);
  return chain;
}

export function getRpcUrl(chainId: number) {
  return assertSupportedChain(chainId).rpcUrl!;
}

export function getExplorerTxUrl(chainId: number, txHash: string) {
  return `${assertSupportedChain(chainId).explorerUrl}/tx/${txHash}`;
}

export function getRequiredConfirmations(chainId: number) {
  return assertSupportedChain(chainId).confirmations;
}
