import { getAddress, isAddress, parseAbi, type Hash } from "viem";
import { AppError } from "../../middleware/error.js";
import { getPublicClient } from "./rpc-client.service.js";

const erc721ReadAbi = parseAbi([
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
]);

function sameAddress(a: string, b: string) {
  return getAddress(a).toLowerCase() === getAddress(b).toLowerCase();
}

export async function assertErc721MintOwnership(input: {
  chainId: number;
  contractAddress: string;
  owner: string;
  tokenId: string | bigint;
  expectedTokenUri?: string;
}) {
  if (!isAddress(input.contractAddress)) throw new AppError(400, "Invalid NFT contract address");
  if (!isAddress(input.owner)) throw new AppError(400, "Invalid NFT owner address");
  const client = getPublicClient(input.chainId);
  const address = getAddress(input.contractAddress);
  const tokenId = BigInt(input.tokenId);

  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x") throw new AppError(400, "NFT contract address has no deployed bytecode");

  let supportsErc721 = false;
  try {
    supportsErc721 = await client.readContract({
      address,
      abi: erc721ReadAbi,
      functionName: "supportsInterface",
      args: ["0x80ac58cd"]
    });
  } catch {
    throw new AppError(400, "Mint contract does not expose ERC721 supportsInterface");
  }
  if (!supportsErc721) throw new AppError(400, "Mint contract is not an ERC721 contract");

  let actualOwner: string;
  try {
    actualOwner = await client.readContract({
      address,
      abi: erc721ReadAbi,
      functionName: "ownerOf",
      args: [tokenId]
    });
  } catch {
    throw new AppError(400, "Minted token owner could not be verified on-chain");
  }
  if (!sameAddress(actualOwner, input.owner)) throw new AppError(400, "Minted token owner does not match wallet");

  let tokenUri: string | undefined;
  try {
    tokenUri = await client.readContract({
      address,
      abi: erc721ReadAbi,
      functionName: "tokenURI",
      args: [tokenId]
    });
  } catch {
    tokenUri = undefined;
  }
  if (input.expectedTokenUri && tokenUri && tokenUri !== input.expectedTokenUri) {
    throw new AppError(400, "Minted token metadata URI does not match prepared NFT metadata");
  }

  return { owner: actualOwner, tokenUri };
}
