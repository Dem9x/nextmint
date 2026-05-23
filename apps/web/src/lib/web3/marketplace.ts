import { parseAbi, parseEther, type Address } from "viem";
import { getChainMetadata } from "@/config/chains";

export const marketplaceAbi = parseAbi([
  "function listItem(address nftContract,uint256 tokenId,uint256 price)",
  "function cancelListing(address nftContract,uint256 tokenId)",
  "function buyItem(address nftContract,uint256 tokenId) payable",
  "function getListing(address nftContract,uint256 tokenId) view returns ((address seller,address nftContract,uint256 tokenId,uint256 price,bool active))"
]);

export const erc721ApprovalAbi = parseAbi([
  "function isApprovedForAll(address owner,address operator) view returns (bool)",
  "function setApprovalForAll(address operator,bool approved)"
]);

export function getMarketplaceAddress(chainId?: number) {
  const address = getChainMetadata(chainId)?.marketplaceContract;
  return address?.startsWith("0x") ? (address as Address) : undefined;
}

export function buildListItemArgs(nftContract: string, tokenId: string | number, priceEth: string) {
  return [nftContract as Address, BigInt(tokenId), parseEther(priceEth)] as const;
}

export function buildBuyItemArgs(nftContract: string, tokenId: string | number) {
  return [nftContract as Address, BigInt(tokenId)] as const;
}

export function buildCancelListingArgs(nftContract: string, tokenId: string | number) {
  return [nftContract as Address, BigInt(tokenId)] as const;
}
