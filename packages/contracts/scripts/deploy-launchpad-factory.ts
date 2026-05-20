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
  const treasury = optionalAddress(process.env.TREASURY_WALLET, deployer.address, "TREASURY_WALLET");
  const platformFeeBps = BigInt(process.env.PLATFORM_MINT_FEE_BPS ?? "250");
  const Factory = await hre.ethers.getContractFactory("NexmintCollectionFactory");
  const factory = await Factory.deploy(deployer.address, treasury, platformFeeBps);
  await factory.waitForDeployment();

  const networkName = hre.network.name;
  const file = deploymentFileByNetwork[networkName] ?? `${networkName}.json`;
  const outputPath = path.resolve("deployments", file);
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await fs.readFile(outputPath, "utf8"));
  } catch {
    existing = {};
  }

  const deployment = {
    ...existing,
    chainId: Number(hre.network.config.chainId),
    network: networkName,
    nexmintCollectionFactory: await factory.getAddress(),
    platformTreasury: treasury,
    platformFeeBps: platformFeeBps.toString(),
    factoryDeployer: deployer.address,
    factoryTxHash: factory.deploymentTransaction()?.hash ?? null,
    factoryDeployedAt: new Date().toISOString()
  };

  await fs.mkdir(path.resolve("deployments"), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
