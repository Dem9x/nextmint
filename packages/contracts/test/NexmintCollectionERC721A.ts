import { expect } from "chai";
import { ethers } from "hardhat";

describe("NexmintCollectionERC721A", function () {
  async function deployCollection(options: { placeholderURI?: string; revealed?: boolean; maxSupply?: bigint; maxMintPerWallet?: bigint } = {}) {
    const [deployer, creator, treasury, minter] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("NexmintCollectionERC721A");
    const startAt = BigInt(Math.floor(Date.now() / 1000) - 60);
    const collection = await factory.deploy(
      "Cyber Cats",
      "CCAT",
      options.maxSupply ?? 5n,
      ethers.parseEther("0.1"),
      options.maxMintPerWallet ?? 3n,
      startAt,
      0n,
      "ipfs://metadata-cid/",
      options.placeholderURI ?? "",
      creator.address,
      deployer.address,
      treasury.address,
      250,
      creator.address,
      500
    );
    if (options.revealed) await collection.reveal("ipfs://metadata-cid/");
    return { collection, deployer, creator, treasury, minter };
  }

  it("starts token IDs at 1 and resolves tokenURI as baseURI + tokenId + .json", async function () {
    const { collection, minter } = await deployCollection({ revealed: true });
    await collection.connect(minter).publicMint(1, { value: ethers.parseEther("0.1") });

    expect(await collection.ownerOf(1)).to.equal(minter.address);
    await expect(collection.ownerOf(0)).to.be.reverted;
    expect(await collection.tokenURI(1)).to.equal("ipfs://metadata-cid/1.json");
    expect(await collection.mintedSupply()).to.equal(1n);
  });

  it("reverts tokenURI for nonexistent token IDs", async function () {
    const { collection } = await deployCollection({ revealed: true });
    await expect(collection.tokenURI(1)).to.be.revertedWith("URI query for nonexistent token");
  });

  it("respects maxMintPerWallet", async function () {
    const { collection, minter } = await deployCollection({ maxMintPerWallet: 2n });
    await collection.connect(minter).publicMint(2, { value: ethers.parseEther("0.2") });
    await expect(collection.connect(minter).publicMint(1, { value: ethers.parseEther("0.1") })).to.be.revertedWith("wallet limit");
  });

  it("respects max supply", async function () {
    const { collection, minter } = await deployCollection({ maxSupply: 2n, maxMintPerWallet: 5n });
    await collection.connect(minter).publicMint(2, { value: ethers.parseEther("0.2") });
    await expect(collection.connect(minter).publicMint(1, { value: ethers.parseEther("0.1") })).to.be.revertedWith("sold out");
  });

  it("splits public mint revenue between creator and platform treasury", async function () {
    const { collection, creator, treasury, minter } = await deployCollection();

    await expect(() => collection.connect(minter).publicMint(2, { value: ethers.parseEther("0.2") }))
      .to.changeEtherBalances(
        [creator, treasury],
        [ethers.parseEther("0.195"), ethers.parseEther("0.005")]
      );
  });

  it("uses placeholder URI before reveal and final base URI after reveal", async function () {
    const { collection, deployer, minter } = await deployCollection({ placeholderURI: "ipfs://placeholder/hidden.json" });
    await collection.connect(minter).publicMint(1, { value: ethers.parseEther("0.1") });

    expect(await collection.tokenURI(1)).to.equal("ipfs://placeholder/hidden.json");
    await collection.connect(deployer).reveal("ipfs://metadata-cid/");
    expect(await collection.tokenURI(1)).to.equal("ipfs://metadata-cid/1.json");
  });
});

