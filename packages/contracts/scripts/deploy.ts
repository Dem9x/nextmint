import fs from "node:fs/promises";
import path from "node:path";
import hre from "hardhat";

const deploymentFileByNetwork: Record<string, string> = {
  baseSepolia: "base-sepolia.json",
  sepolia: "sepolia.json",
  arbitrumSepolia: "arbitrum-sepolia.json",
  bscTestnet: "bsc-testnet.json"
};

function optionalAddress(value: string | undefined, fallback: string, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (!hre.ethers.isAddress(trimmed)) throw new Error(`${label} must be a valid 0x address`);
  if (trimmed === hre.ethers.ZeroAddress) return fallback;
  return trimmed;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const name = process.env.COLLECTION_NAME ?? "NEXMINT Testnet Collection";
  const symbol = process.env.COLLECTION_SYMBOL ?? "NXMT";
  const maxSupply = BigInt(process.env.COLLECTION_MAX_SUPPLY ?? "1000");
  const hiddenUri = process.env.COLLECTION_HIDDEN_URI ?? "ipfs://hidden.json";
  const royaltyBps = Number(process.env.COLLECTION_ROYALTY_BPS ?? "500");
  const royaltyReceiver = optionalAddress(process.env.ROYALTY_RECEIVER, deployer.address, "ROYALTY_RECEIVER");

  const Collection = await hre.ethers.getContractFactory("NexMintERC721A");
  const contract = await Collection.deploy(name, symbol, maxSupply, deployer.address, royaltyReceiver, royaltyBps, hiddenUri);
  await contract.waitForDeployment();

  const networkName = hre.network.name;
  const address = await contract.getAddress();
  const deployment = {
    chainId: Number(hre.network.config.chainId),
    network: networkName,
    nexmintCollection: address,
    name,
    symbol,
    maxSupply: maxSupply.toString(),
    deployer: deployer.address,
    txHash: contract.deploymentTransaction()?.hash ?? null,
    deployedAt: new Date().toISOString()
  };
  const file = deploymentFileByNetwork[networkName] ?? `${networkName}.json`;
  await fs.mkdir(path.resolve("deployments"), { recursive: true });
  await fs.writeFile(path.resolve("deployments", file), `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
