import { api } from "@/lib/api";

export type NftResultItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageGatewayUrl?: string;
  imageIpfsUri?: string;
  metadataIpfsUri?: string;
  metadataGatewayUrl?: string;
  attributes: Array<{ trait_type: string; value: string | number; display_type?: string }>;
  chainId?: number;
  chainName?: string;
  contractAddress?: string;
  tokenId?: string;
  mintTxHash?: string;
  ownerWallet?: string;
  mintStatus: "draft" | "ipfs_ready" | "ready_to_mint" | "minting" | "minted" | "failed";
  explorerTxUrl?: string;
  explorerTokenUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export function getNftItem(id: string) {
  return api<NftResultItem>(`/api/nft/items/${id}`);
}
