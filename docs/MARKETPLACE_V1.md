# NEXMINT Marketplace V1

Marketplace V1 is a simple on-chain fixed-price marketplace for NFTs minted through NEXMINT.

## Supported

- Single NFTs minted with the NEXMINT default single NFT contract.
- Collection NFTs minted from NEXMINT launchpad ERC721A contracts.
- Native ETH/tBNB style payments only, depending on chain.
- List NFT for sale.
- Buy listed NFT.
- Cancel listing.
- Platform marketplace fee.
- Trade history and activity from verified marketplace events.
- Floor price from active listings.
- Total volume and total sales from verified trades.
- Top collections by volume.
- Recent marketplace activity.
- Collection marketplace pages with stats, filters, activity, and about sections.
- Asset detail pages with price panel, blockchain details, activity, external links, and fixed-price Buy Now.
- Collection owner profile management for banner, avatar, creator bio, website, and social links.
- Collection and NFT likes with duplicate prevention per wallet.
- View counts and simple trending discovery for collections and NFTs.

## How Listing Works

1. Seller owns a minted NFT.
2. Seller approves the NEXMINT marketplace contract with `setApprovalForAll`.
3. Seller calls `listItem(nftContract, tokenId, price)`.
4. Backend verifies the listing transaction and `ItemListed` event.
5. Listing becomes visible in the marketplace.

Approval is required because the marketplace contract must be able to transfer the NFT to the buyer during purchase. The backend never custodies NFTs.

## How Buying Works

1. Buyer opens a listed NFT.
2. Buyer calls `buyItem(nftContract, tokenId)` with exact native currency value.
3. The marketplace contract transfers the NFT to the buyer.
4. The contract sends platform fee to treasury and the remainder to seller.
5. Backend verifies `ItemSold`, creates trade history, and updates the NFT owner.

## How Cancel Works

The seller calls `cancelListing(nftContract, tokenId)`. Backend verifies `ListingCancelled` before marking the listing cancelled.

## Marketplace Fee

The default marketplace platform fee is configured by `MARKETPLACE_PLATFORM_FEE_BPS`.

Example:

- `250` bps = `2.5%`
- Max contract fee is capped at `1000` bps = `10%`

## Not Supported Yet

- Auctions
- Offers
- ERC20 payments
- Off-chain order signing
- Bulk listing
- Trait rarity filters
- Full historical indexing
- Real-time websocket updates
- Advanced collection analytics
- Trait floor data
- Advanced anti-gaming for trending/likes
- Comments and follows
- Royalty enforcement beyond existing NFT royalty metadata

## Discovery V1

Trending V1 is intentionally simple. It uses likes, views, verified sales, active listings, and recent sales to produce a basic discovery score. It is not a paid boosting system and does not yet include advanced bot detection or anti-gaming.

## Analytics

Marketplace V1 includes lightweight analytics from indexed NEXMINT data:

- `MarketplaceListing` powers floor price and active listing counts.
- `MarketplaceTrade` powers total volume and total sales.
- `MarketplaceActivity` powers recent activity feeds.
- `NFTItem` powers owner and item counts when collection links are available.

Wei values are summed with `BigInt` on the backend and returned as strings. The frontend formats those values to ETH for display.

## Deployment

Deploy marketplace:

```bash
npm --workspace @nexmint/contracts run deploy-marketplace:base-sepolia
```

Then set:

```env
NEXT_PUBLIC_NEXMINT_MARKETPLACE_BASE_SEPOLIA=0x...
NEXMINT_MARKETPLACE_BASE_SEPOLIA=0x...
```

Restart frontend and backend after changing env.
