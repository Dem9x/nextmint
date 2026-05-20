# Folder Structure

```text
nexmint-ai/
  apps/
    api/
      src/
        config/          environment, MongoDB, Redis, logger
        middleware/      auth, errors, rate limiting
        models/          Mongoose schemas and indexes
        queues/          BullMQ queues
        routes/          REST API modules
        services/        AI, NFT, IPFS, crypto, subscription services
        workers/         queue processors and indexer sweeps
    web/
      src/
        app/             Next.js App Router pages
        components/      shadcn-style UI, wallet/payment components
        lib/             API and Wagmi utilities
  packages/
    contracts/
      contracts/         Solidity ERC721A and TreasuryPayments
      scripts/           Hardhat deployment scripts
    shared/
      src/               shared plans, tokens, and types
  infra/
    nginx/
    pm2/
  docs/
```
