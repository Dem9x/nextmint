// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NexmintMarketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    mapping(address => mapping(uint256 => Listing)) private listings;

    address public treasury;
    uint96 public platformFeeBps;

    event ItemListed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price);
    event ItemSold(address indexed nftContract, uint256 indexed tokenId, address indexed seller, address buyer, uint256 price, uint256 platformFee);
    event ListingCancelled(address indexed nftContract, uint256 indexed tokenId, address indexed seller);
    event PlatformFeeUpdated(uint96 platformFeeBps);
    event TreasuryUpdated(address treasury);

    constructor(address treasury_, uint96 platformFeeBps_) Ownable(msg.sender) {
        require(treasury_ != address(0), "treasury zero");
        require(platformFeeBps_ <= 1_000, "fee too high");
        treasury = treasury_;
        platformFeeBps = platformFeeBps_;
    }

    function listItem(address nftContract, uint256 tokenId, uint256 price) external {
        require(nftContract != address(0), "nft zero");
        require(price > 0, "price zero");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "not owner");
        require(
            nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)),
            "marketplace not approved"
        );
        require(!listings[nftContract][tokenId].active, "already listed");

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit ItemListed(nftContract, tokenId, msg.sender, price);
    }

    function cancelListing(address nftContract, uint256 tokenId) external {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.active, "listing inactive");
        require(msg.sender == listing.seller, "not seller");

        listing.active = false;
        emit ListingCancelled(nftContract, tokenId, msg.sender);
    }

    function buyItem(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.active, "listing inactive");
        require(msg.value == listing.price, "wrong payment");
        require(msg.sender != listing.seller, "seller cannot buy");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == listing.seller, "seller not owner");
        require(
            nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(listing.seller, address(this)),
            "marketplace not approved"
        );

        address seller = listing.seller;
        uint256 price = listing.price;
        uint256 platformFee = (price * platformFeeBps) / 10_000;
        uint256 sellerProceeds = price - platformFee;

        listing.active = false;

        nft.safeTransferFrom(seller, msg.sender, tokenId);

        if (platformFee > 0) {
            (bool treasuryPaid, ) = payable(treasury).call{value: platformFee}("");
            require(treasuryPaid, "treasury payment failed");
        }

        (bool sellerPaid, ) = payable(seller).call{value: sellerProceeds}("");
        require(sellerPaid, "seller payment failed");

        emit ItemSold(nftContract, tokenId, seller, msg.sender, price, platformFee);
    }

    function getListing(address nftContract, uint256 tokenId) external view returns (Listing memory) {
        return listings[nftContract][tokenId];
    }

    function updatePlatformFee(uint96 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1_000, "fee too high");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "treasury zero");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }
}
