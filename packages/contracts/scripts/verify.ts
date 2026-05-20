import fs from "node:fs/promises";
import path from "node:path";
import hre from "hardhat";

const deploymentFileByNetwork: Record<string, string> = {
  baseSepolia: "base-sepolia.json",
  sepolia: "sepolia.json",
  arbitrumSepolia: "arbitrum-sepolia.json",
  bscTestnet: "bsc-testnet.json"
};

async function readDeployment() {
  const file = deploymentFileByNetwork[hre.network.name] ?? `${hre.network.name}.json`;
  const content = await fs.readFile(path.resolve("deployments", file), "utf8");
  return JSON.parse(content) as Record<string, string>;
}

function contractTarget(type: string | undefined) {
  if (type === "payment") return "contracts/TreasuryPayments.sol:TreasuryPayments";
  if (type === "factory") return "contracts/NexmintCollectionFactory.sol:NexmintCollectionFactory";
  if (type === "launchpad") return "contracts/NexmintCollectionERC721A.sol:NexmintCollectionERC721A";
  return "contracts/NexMintERC721A.sol:NexMintERC721A";
}

async function defaultAddressAndArgs(type: string | undefined) {
  const deployment = await readDeployment();
  const deployer = deployment.deployer ?? deployment.factoryDeployer;
  if (type === "payment") {
    return {
      address: deployment.treasuryPayment,
      args: [deployer, deployment.treasury]
    };
  }
  if (type === "factory") {
    return {
      address: deployment.nexmintCollectionFactory,
      args: [deployment.factoryDeployer, deployment.platformTreasury, deployment.platformFeeBps]
    };
  }
  return {
    address: deployment.nexmintCollection,
    args: [
      deployment.name,
      deployment.symbol,
      deployment.maxSupply,
      deployment.deployer,
      process.env.ROYALTY_RECEIVER ?? deployment.deployer,
      process.env.COLLECTION_ROYALTY_BPS ?? "500",
      process.env.COLLECTION_HIDDEN_URI ?? "ipfs://hidden.json"
    ]
  };
}

async function main() {
  const type = process.env.VERIFY_CONTRACT_TYPE ?? "single";
  const defaults = await defaultAddressAndArgs(type);
  const address = process.env.VERIFY_CONTRACT_ADDRESS ?? defaults.address;
  if (!address) throw new Error("VERIFY_CONTRACT_ADDRESS is required");
  const args = process.env.VERIFY_CONSTRUCTOR_ARGS ? JSON.parse(process.env.VERIFY_CONSTRUCTOR_ARGS) : defaults.args;
  await hre.run("verify:verify", { address, constructorArguments: args, contract: contractTarget(type) });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
