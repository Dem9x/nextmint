import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.PLATFORM_TREASURY_WALLET ?? process.env.TREASURY_WALLET ?? deployer.address;
  const platformFeeBps = BigInt(process.env.MARKETPLACE_PLATFORM_FEE_BPS ?? "250");
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const factory = await ethers.getContractFactory("NexmintMarketplace");
  const marketplace = await factory.deploy(treasury, platformFeeBps);
  await marketplace.waitForDeployment();
  const receipt = await marketplace.deploymentTransaction()?.wait();

  console.log(JSON.stringify({
    chainId,
    network: network.name,
    nexmintMarketplace: await marketplace.getAddress(),
    treasury,
    platformFeeBps: platformFeeBps.toString(),
    deployer: deployer.address,
    txHash: receipt?.hash,
    deployedAt: new Date().toISOString()
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
