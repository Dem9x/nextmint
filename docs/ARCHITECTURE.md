# NEXMINT AI Architecture

## System Flow

1. User authenticates with email, Google, or wallet signature.
2. User buys credits or upgrades a subscription through the TreasuryPayments smart contract.
3. Backend verifies the transaction hash, event payload, token, chain, amount, and nonce.
4. User creates a collection generation request.
5. BullMQ workers generate images, build metadata, upload assets to IPFS, and optionally deploy contracts.
6. Launch pages expose minting, reveal, supply, revenue, and transaction status.

## Services

- **API Gateway:** Express REST API with JWT, rate limits, Helmet, sanitization, and upload controls.
- **AI Engine:** Provider abstraction for SDXL, FLUX, HuggingFace, ComfyUI, LoRA options, prompt enhancement, seeds, upscaling, and NSFW checks.
- **NFT Engine:** Weighted traits, rarity scoring, duplicate prevention, ERC721 metadata, ZIP export hooks.
- **Queue Layer:** BullMQ queues for image generation, metadata, IPFS, contract deploy, and transaction indexing.
- **Payment Layer:** Crypto-only create/verify/history/subscription APIs backed by payment contracts and receipt validation.
- **Contracts:** ERC721A collection contract plus TreasuryPayments contract for ETH/ERC20 payments and admin treasury withdrawal.

## Data Model Groups

- Identity: `User`, `WalletConnection`
- AI/NFT: `AIModel`, `Generation`, `NFTCollection`, `NFTItem`, `Trait`, `UploadedFile`
- Web3: `ContractDeployment`, `Mint`, `CryptoTransaction`, `TreasuryBalance`
- Commerce: `Subscription`, `CreditTransaction`, `Transaction`

## Security Baseline

- Wallet login uses SIWE-style signed messages with nonce replay protection.
- JWTs are short enough for SaaS sessions and signed with a strong secret.
- API applies Helmet, CORS allow-listing, rate limits, Mongo sanitization, upload type checks, and centralized errors.
- Payment verification checks chain ID, contract address, event signature, payer, token, amount, payment ID, and receipt status.
