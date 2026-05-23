import { expect } from "chai";
import { ethers } from "hardhat";

describe("NexmintMarketplace", function () {
  async function fixture() {
    const [owner, treasury, seller, buyer, other] = await ethers.getSigners();
    const nftFactory = await ethers.getContractFactory("MockERC721");
    const nft = await nftFactory.deploy();
    const marketplaceFactory = await ethers.getContractFactory("NexmintMarketplace");
    const marketplace = await marketplaceFactory.deploy(treasury.address, 250);
    await nft.connect(seller).mint(seller.address);
    return { owner, treasury, seller, buyer, other, nft, marketplace, tokenId: 1n, price: ethers.parseEther("1") };
  }

  it("seller can list NFT after approval", async function () {
    const { seller, nft, marketplace, tokenId, price } = await fixture();
    await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
    await expect(marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price))
      .to.emit(marketplace, "ItemListed");
    const listing = await marketplace.getListing(await nft.getAddress(), tokenId);
    expect(listing.seller).to.equal(seller.address);
    expect(listing.active).to.equal(true);
  });

  it("cannot list NFT not owned by seller", async function () {
    const { other, nft, marketplace, tokenId, price } = await fixture();
    await expect(marketplace.connect(other).listItem(await nft.getAddress(), tokenId, price)).to.be.revertedWith("not owner");
  });

  it("cannot list with zero price", async function () {
    const { seller, nft, marketplace, tokenId } = await fixture();
    await expect(marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, 0)).to.be.revertedWith("price zero");
  });

  it("cannot list without approval", async function () {
    const { seller, nft, marketplace, tokenId, price } = await fixture();
    await expect(marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price)).to.be.revertedWith("marketplace not approved");
  });

  it("buyer can buy listed NFT and seller/treasury receive split", async function () {
    const { treasury, seller, buyer, nft, marketplace, tokenId, price } = await fixture();
    const nftAddress = await nft.getAddress();
    await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await marketplace.connect(seller).listItem(nftAddress, tokenId, price);
    await expect(() => marketplace.connect(buyer).buyItem(nftAddress, tokenId, { value: price }))
      .to.changeEtherBalances([seller, treasury], [ethers.parseEther("0.975"), ethers.parseEther("0.025")]);
    expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    const listing = await marketplace.getListing(nftAddress, tokenId);
    expect(listing.active).to.equal(false);
  });

  it("seller can cancel listing", async function () {
    const { seller, nft, marketplace, tokenId, price } = await fixture();
    await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
    await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price);
    await expect(marketplace.connect(seller).cancelListing(await nft.getAddress(), tokenId)).to.emit(marketplace, "ListingCancelled");
  });

  it("non-seller cannot cancel listing", async function () {
    const { seller, other, nft, marketplace, tokenId, price } = await fixture();
    await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
    await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price);
    await expect(marketplace.connect(other).cancelListing(await nft.getAddress(), tokenId)).to.be.revertedWith("not seller");
  });

  it("cannot buy inactive or cancelled listing", async function () {
    const { seller, buyer, nft, marketplace, tokenId, price } = await fixture();
    await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
    await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price);
    await marketplace.connect(seller).cancelListing(await nft.getAddress(), tokenId);
    await expect(marketplace.connect(buyer).buyItem(await nft.getAddress(), tokenId, { value: price })).to.be.revertedWith("listing inactive");
  });

  it("cannot buy if seller no longer owns NFT", async function () {
    const { seller, buyer, other, nft, marketplace, tokenId, price } = await fixture();
    await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price);
    await nft.connect(seller).transferFrom(seller.address, other.address, tokenId);
    await expect(marketplace.connect(buyer).buyItem(await nft.getAddress(), tokenId, { value: price })).to.be.revertedWith("seller not owner");
  });

  it("owner can update platform fee and treasury", async function () {
    const { owner, treasury, marketplace, other } = await fixture();
    await expect(marketplace.connect(owner).updatePlatformFee(300)).to.emit(marketplace, "PlatformFeeUpdated");
    expect(await marketplace.platformFeeBps()).to.equal(300n);
    await expect(marketplace.connect(owner).updateTreasury(other.address)).to.emit(marketplace, "TreasuryUpdated");
    expect(await marketplace.treasury()).to.equal(other.address);
    expect(await marketplace.treasury()).to.not.equal(treasury.address);
  });

  it("non-owner cannot update platform fee or treasury", async function () {
    const { other, marketplace } = await fixture();
    await expect(marketplace.connect(other).updatePlatformFee(300)).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    await expect(marketplace.connect(other).updateTreasury(other.address)).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
  });
});
