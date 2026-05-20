import { getChainById } from "@/config/chains";

type ContractName = "treasuryPayment" | "nftFactory";

export const CONTRACT_ADDRESSES: Record<number, Partial<Record<ContractName, string | undefined>>> = {
  84532: {
    treasuryPayment: process.env.NEXT_PUBLIC_BASE_SEPOLIA_PAYMENT_CONTRACT,
    nftFactory: process.env.NEXT_PUBLIC_BASE_SEPOLIA_NFT_FACTORY
  },
  11155111: {
    treasuryPayment: process.env.NEXT_PUBLIC_SEPOLIA_PAYMENT_CONTRACT,
    nftFactory: process.env.NEXT_PUBLIC_SEPOLIA_NFT_FACTORY
  },
  421614: {
    treasuryPayment: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_PAYMENT_CONTRACT,
    nftFactory: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_NFT_FACTORY
  },
  97: {
    treasuryPayment: process.env.NEXT_PUBLIC_BSC_TESTNET_PAYMENT_CONTRACT,
    nftFactory: process.env.NEXT_PUBLIC_BSC_TESTNET_NFT_FACTORY
  }
};

export function getContractAddress(chainId: number, contractName: ContractName) {
  const address = CONTRACT_ADDRESSES[chainId]?.[contractName];
  if (!address && process.env.NODE_ENV === "development") {
    const chainName = getChainById(chainId)?.name ?? chainId;
    console.warn(`[NEXMINT] Missing ${contractName} address for ${chainName}.`);
  }
  return address;
}

export function hasContractAddress(chainId: number, contractName: ContractName) {
  return Boolean(getContractAddress(chainId, contractName));
}
