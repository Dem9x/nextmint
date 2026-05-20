import { getChainMetadata } from "@/config/chains";

export function getExplorerBaseUrl(chainId?: number) {
  return getChainMetadata(chainId)?.explorerUrl;
}

export function getExplorerTxUrl(chainId: number, txHash?: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return baseUrl && txHash ? `${baseUrl}/tx/${txHash}` : undefined;
}

export function getExplorerAddressUrl(chainId: number, address?: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return baseUrl && address ? `${baseUrl}/address/${address}` : undefined;
}

export function getExplorerTokenUrl(chainId: number, contractAddress?: string, tokenId?: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return baseUrl && contractAddress && tokenId ? `${baseUrl}/token/${contractAddress}?a=${tokenId}` : undefined;
}
