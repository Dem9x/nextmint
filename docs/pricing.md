# NEXMINT AI Pricing and Credits

NEXMINT uses credits to keep AI generation, IPFS storage, and launch infrastructure sustainable. Large collections cost more because each item requires a real image generation and IPFS persistence step.

## Plans

| Plan | Price | Credits | Max image | Max collection | Launchpad | Marketplace |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Free / Testnet | $0 | 5/month | 512px | 5 NFTs | Not included | External links only |
| Starter | $9/month | 120/month | 768px | 50 NFTs | Not included / add-on later | External links only |
| Creator | $29/month | 600/month | 768px | 300 NFTs | 1 publish/month | Internal listing enabled |
| Pro | $99/month | 2500/month | 1024px | 1000 NFTs | 5 publishes/month | Internal listing enabled |
| Enterprise | Custom | Custom | Custom | Custom | Custom | Custom |

## Credit Costs

- Prompt enhancement: `0.25` credit
- 512px image generation: `1` credit
- 768px image generation: `2` credits
- 1024px image generation: `4` credits
- IPFS image upload: `0.25` credit
- Metadata generation/upload: included

Collection estimates are calculated per item. For example, a 100 item collection at 768px with IPFS image upload costs:

`100 * (2 + 0.25) = 225 credits`

## Extra Credits

- $5 = 100 credits
- $20 = 500 credits
- $75 = 2500 credits

## Server-Side Guards

The backend enforces plan limits before generation, collection jobs, launchpad publishing, and marketplace listing. Frontend UI hints are helpful, but they are not trusted for billing decisions.

Blocked actions return clear errors such as:

- `Your plan supports collections up to 50 NFTs.`
- `Your plan supports image size up to 768px.`
- `Insufficient credits. Required: X, available: Y.`
- `Launchpad publish requires Creator or Pro.`
- `Marketplace listing requires Creator or Pro.`
- `Free plan is testnet only.`
