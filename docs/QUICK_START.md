# NEXMINT AI Quick Start

This guide gets the local monorepo running for development.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop
- A wallet for Web3 testing
- Optional: Replicate API token, OpenRouter API key, Pinata JWT, RPC URLs

## 1. Install Dependencies

```bash
npm install
```

On Windows PowerShell, use `npm.cmd install` if script execution policy blocks `npm`.

## 2. Configure Environment

Copy the sample environment file:

```bash
cp .env.example .env
```

The API loader checks both the repo root `.env` and `apps/api/.env`. Prefer the repo root `.env` for local monorepo development.

Minimum local values:

```env
MONGODB_URI=mongodb://localhost:27017/nexmint
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-at-least-32-characters
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`REDIS_URL` should include `redis://`. If you accidentally use `localhost:6379`, the API now normalizes it for local development.

If your `.env` uses Docker service names such as `mongodb://mongo:27017/nexmint` and `redis://redis:6379`, the API maps them to `localhost` when you run `npm --workspace @nexmint/api run dev` from your host terminal. Inside Docker, the service names are preserved.

For AI generation:

```env
REPLICATE_API_TOKEN=
OPENROUTER_API_KEY=
AI_FREE_TIER_MODE=true
AI_DEFAULT_IMAGE_PROVIDER=replicate
AI_DEFAULT_TEXT_PROVIDER=openrouter
```

## 3. Start Databases

```bash
docker compose up mongo redis
```

## 4. Start Backend API

```bash
npm --workspace @nexmint/api run dev
```

API health check:

```bash
curl http://localhost:4000/health
```

## 5. Start Workers

In a second terminal:

```bash
npm --workspace @nexmint/api run worker
```

Workers process prompt enhancement, image generation, transaction indexing, and background jobs.

## 6. Start Frontend

In a third terminal:

```bash
npm --workspace @nexmint/web run dev
```

Open:

```text
http://localhost:3000
```

## 7. Compile Contracts

```bash
npm --workspace @nexmint/contracts run compile
```

To deploy, configure RPC URLs and `DEPLOYER_PRIVATE_KEY` in `.env`, then run:

```bash
npm --workspace @nexmint/contracts run deploy:base
```

## Useful URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- Studio UI: `http://localhost:3000/studio`
- Dashboard: `http://localhost:3000/dashboard`

## Common Issues

- `npm.ps1 cannot be loaded`: use `npm.cmd` or update PowerShell execution policy.
- OpenRouter `401`: check `OPENROUTER_API_KEY`.
- OpenRouter `429`: free-tier limit reached; prompt enhancement falls back locally.
- Replicate timeout: use a faster model or increase `AI_IMAGE_GENERATION_TIMEOUT_MS`.
- No image output: verify the Replicate model supports URL output and the selected adapter.
- Mongo/Redis connection refused: make sure `docker compose up mongo redis` is running.
- Mongo `exec format error`: run `docker compose down`, then `docker compose pull mongo redis`, then start again. The compose file pins Linux image platform via `DOCKER_DEFAULT_PLATFORM`.
