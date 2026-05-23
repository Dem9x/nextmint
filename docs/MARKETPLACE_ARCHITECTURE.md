# NEXMINT AI Marketplace Architecture

The NEXMINT marketplace architecture is designed around on-chain custody and backend indexing. The frontend initiates wallet transactions, the smart contract performs NFT/payment transfers, and the backend verifies events for dashboards and activity feeds.

## Smart Contract

Contract: `NexmintMarketplace.sol`

Initial scope: fixed-price ERC721 listings only.

Functions:

- `listItem(address nftContract, uint256 tokenId, uint256 price)`
- `cancelListing(address nftContract, uint256 tokenId)`
- `buyItem(address nftContract, uint256 tokenId) payable`
- `updatePlatformFee(uint96 newPlatformFeeBps)`
- `updateTreasury(address newTreasury)`
- `getListing(address nftContract, uint256 tokenId)`

Listing requirements:

- Seller owns the NFT.
- Seller has approved the marketplace for the NFT or collection.
- Price must be greater than zero.
- Existing active listing must be cancelled or sold before relisting.

Events:

- `ItemListed(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 price)`
- `ItemSold(address indexed seller, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 price, uint256 platformFee)`
- `ListingCancelled(address indexed seller, address indexed nftContract, uint256 indexed tokenId)`

## Backend

Models:

- `MarketplaceListing`
- `MarketplaceTrade`
- `MarketplaceActivity`

Indexer:

- Reads marketplace events from supported chains.
- Upserts active listings after `ItemListed`.
- Marks listings sold after `ItemSold`.
- Marks listings cancelled after `ListingCancelled`.
- Creates trade and activity records only after receipt/event verification.

Read APIs:

- `GET /api/marketplace/listings`
- `GET /api/marketplace/listings/:chainId/:contractAddress/:tokenId`
- `GET /api/marketplace/activity`
- `GET /api/marketplace/user/:wallet`

Write APIs are intentionally avoided in the first skeleton. Listing, buying, and cancellation should happen directly from the user's wallet against the marketplace contract.

## Frontend

Routes:

- `/marketplace`
- `/marketplace/[collection]` planned
- `/marketplace/assets/[chainId]/[contractAddress]/[tokenId]`

Dashboard integration:

- "View NFT"
- "List for Sale, Coming Soon"
- "View on Explorer"

Asset page:

- NFT identity and metadata.
- Current listing status.
- Planned "Buy Now" button once the marketplace contract is deployed.
- Seller-only cancel action once event indexing is active.

## External Links

Before the internal marketplace is enabled, NEXMINT should show:

- Explorer token URL.
- Explorer contract URL.
- OpenSea URL placeholder when supported.

## Future Scope

Offers and auctions are roadmap items. They require more complex order state, expiry handling, settlement rules, and security review.
