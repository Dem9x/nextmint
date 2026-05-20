// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NexMintERC721A is ERC721A, ERC2981, Ownable, Pausable, ReentrancyGuard {
    uint256 public immutable maxSupply;
    uint256 public publicPrice;
    uint256 public whitelistPrice;
    uint256 public maxPerWallet;
    uint64 public publicSaleStart;
    uint64 public whitelistSaleStart;
    bool public revealed;
    string private baseTokenUri;
    string public hiddenUri;
    bytes32 public whitelistRoot;
    mapping(address => uint256) public mintedByWallet;
    mapping(uint256 => string) private customTokenUri;

    event Revealed(string baseUri);
    event SaleConfigUpdated(uint64 whitelistSaleStart, uint64 publicSaleStart, uint256 publicPrice, uint256 whitelistPrice);
    event WhitelistRootUpdated(bytes32 root);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address owner_,
        address royaltyReceiver_,
        uint96 royaltyBps_,
        string memory hiddenUri_
    ) ERC721A(name_, symbol_) Ownable(owner_) {
        maxSupply = maxSupply_;
        maxPerWallet = 10;
        hiddenUri = hiddenUri_;
        _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
    }

    function mint(uint256 quantity) external payable whenNotPaused nonReentrant {
        require(block.timestamp >= publicSaleStart && publicSaleStart != 0, "public sale closed");
        _mintWithPrice(msg.sender, quantity, publicPrice);
    }

    function mintTo(address to, string calldata uri) external payable whenNotPaused nonReentrant returns (uint256 tokenId) {
        require(to != address(0), "zero recipient");
        require(bytes(uri).length > 0, "uri empty");
        require(_totalMinted() + 1 <= maxSupply, "sold out");
        require(mintedByWallet[to] + 1 <= maxPerWallet, "wallet limit");
        require(msg.value >= publicPrice, "insufficient ETH");
        tokenId = _nextTokenId();
        mintedByWallet[to] += 1;
        customTokenUri[tokenId] = uri;
        _safeMint(to, 1);
    }

    function whitelistMint(uint256 quantity, bytes32[] calldata proof) external payable whenNotPaused nonReentrant {
        require(block.timestamp >= whitelistSaleStart && whitelistSaleStart != 0, "whitelist sale closed");
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
        require(MerkleProof.verify(proof, whitelistRoot, leaf), "invalid proof");
        _mintWithPrice(msg.sender, quantity, whitelistPrice);
    }

    function ownerMint(address to, uint256 quantity) external onlyOwner {
        require(_totalMinted() + quantity <= maxSupply, "sold out");
        _safeMint(to, quantity);
    }

    function reveal(string calldata nextBaseUri) external onlyOwner {
        baseTokenUri = nextBaseUri;
        revealed = true;
        emit Revealed(nextBaseUri);
    }

    function setSaleConfig(uint64 nextWhitelistStart, uint64 nextPublicStart, uint256 nextPublicPrice, uint256 nextWhitelistPrice, uint256 nextMaxPerWallet) external onlyOwner {
        whitelistSaleStart = nextWhitelistStart;
        publicSaleStart = nextPublicStart;
        publicPrice = nextPublicPrice;
        whitelistPrice = nextWhitelistPrice;
        maxPerWallet = nextMaxPerWallet;
        emit SaleConfigUpdated(nextWhitelistStart, nextPublicStart, nextPublicPrice, nextWhitelistPrice);
    }

    function setWhitelistRoot(bytes32 root) external onlyOwner {
        whitelistRoot = root;
        emit WhitelistRootUpdated(root);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw(address payable to) external onlyOwner {
        require(to != address(0), "zero address");
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        if (bytes(customTokenUri[tokenId]).length != 0) return customTokenUri[tokenId];
        if (!revealed) return hiddenUri;
        return string(abi.encodePacked(baseTokenUri, _toString(tokenId), ".json"));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, ERC2981) returns (bool) {
        return ERC721A.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }

    function _mintWithPrice(address to, uint256 quantity, uint256 price) internal {
        require(quantity > 0, "quantity zero");
        require(_totalMinted() + quantity <= maxSupply, "sold out");
        require(mintedByWallet[to] + quantity <= maxPerWallet, "wallet limit");
        require(msg.value >= price * quantity, "insufficient ETH");
        mintedByWallet[to] += quantity;
        _safeMint(to, quantity);
    }
}
