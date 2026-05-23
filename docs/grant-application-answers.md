# NEXMINT AI Grant Application Answers

## 1. What are you building?

NEXMINT AI is AI-powered NFT launch infrastructure for creators. It helps creators generate NFT assets, upload images and metadata to IPFS, deploy ERC721A collections, and publish mint-ready launchpad pages without writing code.

## 2. What problem does it solve?

NFT launches are still fragmented and technical. Creators often need separate tools for AI image generation, metadata formatting, IPFS uploads, contract deployment, launch pages, wallet payments, and transaction verification. This can lead to temporary image URLs, broken metadata, invalid `baseURI` configurations, and expensive developer dependency. NEXMINT AI gives creators a safer end-to-end workflow.

## 3. Who are the users?

The primary users are AI-native creators, digital artists, small NFT teams, indie game communities, and Web3 builders who want to launch NFT collections without building custom mint infrastructure from scratch.

## 4. Why is this useful for the ecosystem?

NEXMINT AI can bring more creators into onchain ecosystems such as Base by lowering the technical barrier to launching NFT collections. It also increases responsible IPFS usage by making durable image and metadata storage part of the default workflow. The project provides open-source examples for combining AI generation, IPFS storage, smart contracts, and launchpad UX.

## 5. What have you built so far?

NEXMINT AI is already an active prototype, not just a concept. The project includes a Next.js web app, Express API backend, MongoDB database, Redis/BullMQ workers, AI provider routing, single NFT generation, collection generation, IPFS metadata pipeline, ERC721A contracts and factory, Base Sepolia/testnet support, launchpad concept, and creator management UI.

## 6. What milestones will the grant fund?

Grant funding will support four milestones:

1. **Production IPFS Pipeline:** Replace temporary AI image URLs with IPFS/Filebase URLs, validate metadata folder CIDs, and ensure `baseURI` correctness.
2. **Smart Contract Launch Flow:** Deploy and verify ERC721A factory/collection contracts on Base Sepolia, add deploy guards, and configure default single NFT minter contracts per chain.
3. **Creator Launchpad UX:** Improve the collection dashboard, pre-deploy checklist, publish flow, public launchpad pages, and failed generation retry/pause flow.
4. **Mainnet Readiness:** Add CI/typecheck/tests, documentation, security notes, demo collections, and a public walkthrough.

## 7. How will you measure success?

Success will be measured by:

- Number of generated NFT assets successfully persisted to IPFS
- Number of metadata folders validated with working `baseURI`
- Number of ERC721A collections deployed on Base Sepolia
- Number of public mint campaigns published
- Number of verified public mint transactions
- Creator completion rate from generation to publish
- Reduction in failed/broken metadata launches
- Documentation and demo readiness for new builders

## 8. Why are you the right person/team to build this?

The project is already being built as a full-stack Web3 SaaS prototype, not just a proposal. The current implementation includes frontend, backend, workers, smart contracts, wallet flows, crypto payment verification, IPFS pipeline work, and launchpad UX. This gives the project a practical foundation for grant-funded acceleration.

## 9. What is your funding request?

We are seeking **$10,000-$15,000** in grant funding to complete the production-grade IPFS pipeline, Base testnet/mainnet launch flow, smart contract validation, and creator onboarding experience.

## 10. Links and contact

- GitHub: https://github.com/Dem9x/nextmint
- Demo: [add demo link]
- Testnet contracts: [add contract links]
- Contact: [add email / X / Telegram]
