import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEther, type Abi } from "viem";
import { AppError } from "../../middleware/error.js";
import { getDeployerForChain } from "../contract-deploy.service.js";
import { getPublicClient } from "../blockchain/rpc-client.service.js";

type CollectionArtifact = {
  abi: Abi;
  bytecode: `0x${string}`;
};

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../../../../..");

async function readLaunchpadArtifact() {
  const artifactPath = path.join(repoRoot, "packages/contracts/artifacts/contracts/NexmintCollectionERC721A.sol/NexmintCollectionERC721A.json");
  try {
    return JSON.parse(await fs.readFile(artifactPath, "utf8")) as CollectionArtifact;
  } catch {
    throw new AppError(500, "Launchpad collection artifact missing. Run npm --workspace @nexmint/contracts run compile.");
  }
}

export async function deployLaunchpadCollection(input: {
  chainId: number;
  name: string;
  symbol: string;
  maxSupply: number;
  mintPrice: string;
  maxMintPerWallet: number;
  publicMintStartAt?: Date;
  publicMintEndAt?: Date;
  metadataBaseUri: string;
  placeholderUri?: string;
  creatorWallet: `0x${string}`;
  payoutWallet: `0x${string}`;
  royaltyBps: number;
  platformFeeBps: number;
}) {
  const { chain, walletClient } = getDeployerForChain(input.chainId);
  if (!chain.treasuryAddress) throw new AppError(400, `Missing treasury address for ${chain.name}`);
  const artifact = await readLaunchpadArtifact();
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [
      input.name,
      input.symbol,
      BigInt(input.maxSupply),
      parseEther(input.mintPrice),
      BigInt(input.maxMintPerWallet),
      BigInt(Math.floor((input.publicMintStartAt?.getTime() ?? Date.now()) / 1000)),
      BigInt(input.publicMintEndAt ? Math.floor(input.publicMintEndAt.getTime() / 1000) : 0),
      input.metadataBaseUri,
      input.placeholderUri ?? "",
      input.payoutWallet,
      input.creatorWallet,
      chain.treasuryAddress,
      input.platformFeeBps,
      input.payoutWallet,
      input.royaltyBps
    ]
  });
  const receipt = await getPublicClient(input.chainId).waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new AppError(500, "Collection deployment failed");
  return { contractAddress: receipt.contractAddress, txHash: hash, explorerUrl: `${chain.explorerUrl}/tx/${hash}` };
}
