import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.TREASURY_WALLET ?? deployer.address;
  const TreasuryPayments = await ethers.getContractFactory("TreasuryPayments");
  const contract = await TreasuryPayments.deploy(deployer.address, treasury);
  await contract.waitForDeployment();
  console.log(`TreasuryPayments deployed: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
