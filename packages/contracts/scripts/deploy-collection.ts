import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const Collection = await ethers.getContractFactory("NexMintERC721A");
  const contract = await Collection.deploy(
    process.env.COLLECTION_NAME ?? "NEXMINT Collection",
    process.env.COLLECTION_SYMBOL ?? "NEX",
    Number(process.env.MAX_SUPPLY ?? 1000),
    deployer.address,
    process.env.ROYALTY_RECEIVER ?? deployer.address,
    Number(process.env.ROYALTY_BPS ?? 500),
    process.env.HIDDEN_URI ?? "ipfs://hidden/metadata.json"
  );
  await contract.waitForDeployment();
  console.log(`NexMintERC721A deployed: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
