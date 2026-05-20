// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./NexmintCollectionERC721A.sol";

contract NexmintCollectionFactory is Ownable {
    address public platformTreasury;
    uint96 public platformFeeBps;

    event CollectionCreated(address indexed collection, address indexed creator, string name, string symbol, uint256 maxSupply);
    event PlatformConfigUpdated(address indexed treasury, uint96 platformFeeBps);

    constructor(address initialOwner, address initialTreasury, uint96 initialPlatformFeeBps) Ownable(initialOwner) {
        require(initialTreasury != address(0), "treasury zero");
        require(initialPlatformFeeBps <= 1_000, "fee too high");
        platformTreasury = initialTreasury;
        platformFeeBps = initialPlatformFeeBps;
    }

    function createCollection(
        string calldata name_,
        string calldata symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxMintPerWallet_,
        uint64 publicMintStartAt_,
        uint64 publicMintEndAt_,
        string calldata baseURI_,
        string calldata placeholderURI_,
        address creator_,
        address royaltyReceiver_,
        uint96 royaltyBps_
    ) external returns (address collection) {
        require(creator_ == msg.sender || msg.sender == owner(), "creator mismatch");
        NexmintCollectionERC721A created = new NexmintCollectionERC721A(
            name_,
            symbol_,
            maxSupply_,
            mintPrice_,
            maxMintPerWallet_,
            publicMintStartAt_,
            publicMintEndAt_,
            baseURI_,
            placeholderURI_,
            creator_,
            creator_,
            platformTreasury,
            platformFeeBps,
            royaltyReceiver_,
            royaltyBps_
        );
        collection = address(created);
        emit CollectionCreated(collection, creator_, name_, symbol_, maxSupply_);
    }

    function setPlatformConfig(address nextTreasury, uint96 nextPlatformFeeBps) external onlyOwner {
        require(nextTreasury != address(0), "treasury zero");
        require(nextPlatformFeeBps <= 1_000, "fee too high");
        platformTreasury = nextTreasury;
        platformFeeBps = nextPlatformFeeBps;
        emit PlatformConfigUpdated(nextTreasury, nextPlatformFeeBps);
    }
}
