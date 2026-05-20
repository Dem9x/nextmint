# Deployment Guide

## Frontend

- Deploy `apps/web` to Vercel.
- Set `NEXT_PUBLIC_API_URL`, WalletConnect project ID, and payment contract addresses.
- Enable image domains for Pinata/IPFS gateways.

## Backend

- Deploy `apps/api` on Ubuntu with Docker or PM2.
- Use MongoDB Atlas or a hardened MongoDB replica set.
- Use managed Redis with persistence for BullMQ.
- Configure RPC URLs for Base, Ethereum, Polygon, Arbitrum, and BNB Chain.

## PM2

```bash
pm2 start infra/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

## Nginx

Use `infra/nginx/nexmint.conf` as the reverse proxy template. Terminate TLS with Certbot or your load balancer.

## Contracts

```bash
npm --workspace @nexmint/contracts run compile
npm --workspace @nexmint/contracts run deploy:base
```

Verify contracts on each explorer before opening public minting.
