# NEXMINT AI Marketplace Roadmap

NEXMINT AI already helps creators generate assets, pin NFT metadata, deploy ERC721A collections, and run launchpad mints. The next natural step is helping collectors trade NFTs after minting without leaving the NEXMINT experience.

This roadmap intentionally starts small. The first internal marketplace should be a simple fixed-price testnet marketplace, not a full OpenSea clone.

## Why Marketplace Is Needed

- Collectors need a way to resell NFTs minted from NEXMINT campaigns.
- Creators benefit when collections have visible activity after mint.
- Dashboards can show owned NFTs, listings, sales, and collection activity in one place.
- Marketplace data helps NEXMINT measure real post-mint traction without fake volume or mock analytics.

## Supported Asset Types

- Single NFTs minted with the NEXMINT default single NFT contract.
- Collection NFTs minted from NEXMINT launchpad ERC721A contracts.

## Phase 1: External Marketplace Links

- Show explorer links for every minted NFT.
- Add placeholder OpenSea links where chain support is known.
- Add "List for Sale, Coming Soon" buttons in NFT cards and dashboards.
- Keep all trading outside NEXMINT until the internal marketplace contract is deployed and tested.

## Phase 2: Internal Fixed-Price Marketplace

- Deploy `NexmintMarketplace.sol`.
- Users approve the marketplace contract for a specific NFT or collection.
- Sellers create fixed-price listings on-chain.
- Buyers purchase through the marketplace contract.
- The contract transfers NFT ownership and splits platform fees.
- Backend indexes `ItemListed`, `ItemSold`, and `ListingCancelled` events.
- Frontend adds `/marketplace`, asset pages, seller cancel flow, and buyer "Buy Now" flow.

## Phase 3: Offers

- Add buyer offers after fixed-price trading is stable.
- Support offer creation, cancellation, acceptance, and expiry.
- Prefer signed orders or escrow only after the security model is reviewed.

## Phase 4: Auctions

- Add timed auctions after offers.
- Support reserve price, bid increments, cancellation rules, and settlement.
- Auctions require stricter edge-case handling and should not ship before tests and review.

## Phase 5: Analytics And Activity Feed

- Collection-level sales volume, floor price, listed count, owners, and recent trades.
- User trading history and portfolio value.
- Creator analytics for post-mint activity.
- Admin marketplace revenue and failed transaction monitoring.

## Safety Rules

- Do not custody user NFTs in the backend.
- Do not mark trades successful without verified receipts and marketplace events.
- Do not implement auctions or offers until the fixed-price flow is stable.
- Do not trust frontend-only listing or sale status.
- Keep marketplace launch testnet-first until contracts are reviewed.
