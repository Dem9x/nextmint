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
  const TreasuryPayments = await hre.ethers.getContractFactory("TreasuryPayments");
  const contract = await TreasuryPayments.deploy(deployer.address, treasury);
  await contract.waitForDeployment();

  const networkName = hre.network.name;
  const address = await contract.getAddress();
  const deployment = {
    chainId: Number(hre.network.config.chainId),
    network: networkName,
    treasuryPayment: address,
    treasury,
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
