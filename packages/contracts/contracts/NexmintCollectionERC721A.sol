// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NexmintCollectionERC721A is ERC721A, ERC2981, Ownable, Pausable, ReentrancyGuard {
    uint256 public immutable maxSupply;
    uint256 public publicMintPrice;
    uint256 public maxMintPerWallet;
    uint64 public publicMintStartAt;
    uint64 public publicMintEndAt;
    address public immutable creator;
    address public platformTreasury;
    uint96 public platformFeeBps;
    bool public revealed;
    string private baseTokenUri;
    string public placeholderUri;

    mapping(address => uint256) public mintedByWallet;

    event PublicMinted(address indexed minter, uint256 quantity, uint256 totalPaid);
    event RevenueSplit(address indexed creator, address indexed treasury, uint256 creatorAmount, uint256 platformFee);
    event CollectionRevealed(string baseURI);
    event MintConfigUpdated(uint256 price, uint256 startAt, uint256 endAt, uint256 maxMintPerWallet);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxMintPerWallet_,
        uint64 publicMintStartAt_,
        uint64 publicMintEndAt_,
        string memory baseURI_,
        string memory placeholderURI_,
        address creator_,
        address owner_,
        address platformTreasury_,
        uint96 platformFeeBps_,
        address royaltyReceiver_,
        uint96 royaltyBps_
    ) ERC721A(name_, symbol_) Ownable(owner_) {
        require(maxSupply_ > 0, "max supply zero");
        require(maxMintPerWallet_ > 0, "wallet limit zero");
        require(creator_ != address(0), "creator zero");
        require(platformTreasury_ != address(0), "treasury zero");
        require(platformFeeBps_ <= 1_000, "platform fee too high");
        require(royaltyBps_ <= 1_000, "royalty too high");
        maxSupply = maxSupply_;
        publicMintPrice = mintPrice_;
        maxMintPerWallet = maxMintPerWallet_;
        publicMintStartAt = publicMintStartAt_;
        publicMintEndAt = publicMintEndAt_;
        baseTokenUri = baseURI_;
        placeholderUri = placeholderURI_;
        creator = creator_;
        platformTreasury = platformTreasury_;
        platformFeeBps = platformFeeBps_;
        _setDefaultRoyalty(royaltyReceiver_ == address(0) ? creator_ : royaltyReceiver_, royaltyBps_);
    }

    function publicMint(uint256 quantity) external payable whenNotPaused nonReentrant {
        require(quantity > 0, "quantity zero");
        require(publicMintStartAt != 0 && block.timestamp >= publicMintStartAt, "mint not started");
        require(publicMintEndAt == 0 || block.timestamp <= publicMintEndAt, "mint ended");
        require(_totalMinted() + quantity <= maxSupply, "sold out");
        require(mintedByWallet[msg.sender] + quantity <= maxMintPerWallet, "wallet limit");

        uint256 requiredValue = publicMintPrice * quantity;
        require(msg.value >= requiredValue, "insufficient ETH");

        mintedByWallet[msg.sender] += quantity;
        _safeMint(msg.sender, quantity);

        if (requiredValue > 0) {
            uint256 platformFee = (requiredValue * platformFeeBps) / 10_000;
            uint256 creatorAmount = requiredValue - platformFee;
            if (platformFee > 0) _sendValue(platformTreasury, platformFee);
            if (creatorAmount > 0) _sendValue(creator, creatorAmount);
            emit RevenueSplit(creator, platformTreasury, creatorAmount, platformFee);
        }

        if (msg.value > requiredValue) {
            _sendValue(msg.sender, msg.value - requiredValue);
        }

        emit PublicMinted(msg.sender, quantity, requiredValue);
    }

    function ownerMint(address to, uint256 quantity) external onlyOwner {
        require(to != address(0), "recipient zero");
        require(quantity > 0, "quantity zero");
        require(_totalMinted() + quantity <= maxSupply, "sold out");
        _safeMint(to, quantity);
    }

    function mintedSupply() external view returns (uint256) {
        return _totalMinted();
    }

    function setMintConfig(uint256 price, uint64 startAt, uint64 endAt, uint256 nextMaxMintPerWallet) external onlyOwner {
        require(nextMaxMintPerWallet > 0, "wallet limit zero");
        publicMintPrice = price;
        publicMintStartAt = startAt;
        publicMintEndAt = endAt;
        maxMintPerWallet = nextMaxMintPerWallet;
        emit MintConfigUpdated(price, startAt, endAt, nextMaxMintPerWallet);
    }

    function reveal(string calldata nextBaseURI) external onlyOwner {
        baseTokenUri = nextBaseURI;
        revealed = true;
        emit CollectionRevealed(nextBaseURI);
    }

    function setPlaceholderURI(string calldata nextPlaceholderURI) external onlyOwner {
        placeholderUri = nextPlaceholderURI;
    }

    function setPlatformTreasury(address nextTreasury) external onlyOwner {
        require(nextTreasury != address(0), "treasury zero");
        platformTreasury = nextTreasury;
    }

    function setPlatformFeeBps(uint96 nextPlatformFeeBps) external onlyOwner {
        require(nextPlatformFeeBps <= 1_000, "platform fee too high");
        platformFeeBps = nextPlatformFeeBps;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawDust(address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "recipient zero");
        uint256 value = address(this).balance;
        _sendValue(to, value);
        emit FundsWithdrawn(to, value);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        if (!revealed && bytes(placeholderUri).length != 0) return placeholderUri;
        return string(abi.encodePacked(baseTokenUri, _toString(tokenId), ".json"));
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, ERC2981) returns (bool) {
        return ERC721A.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }

    function _sendValue(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "transfer failed");
    }
}
