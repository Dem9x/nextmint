# NEXMINT AI Open-Core Split Plan

## Current Repository Status

The current `nextmint` repository contains the product prototype, frontend, API, worker logic, smart contracts, documentation, release notes, grant materials, and testnet/demo flows. It is useful for technical review and grant evaluation, but it also contains business-sensitive modules that should be reviewed before the repository is promoted as a long-term public codebase.

Current remotes should be:

- `origin`: `https://github.com/Dem9x/nextmint.git`
- `private-origin`: `https://github.com/Dem9x/nextmint-platform.git`

If `private-origin` is missing, add it with:

```bash
git remote add private-origin https://github.com/Dem9x/nextmint-platform.git
```

## Public Repo Purpose

The public repository should act as a grant-ready, investor-review-ready, and developer-friendly showcase. It should demonstrate the product direction, architecture, testnet workflows, smart contract templates, and creator UX without exposing production business logic or operational secrets.

## Private Repo Purpose

The private repository should contain production-specific logic, operational controls, sensitive infrastructure, and commercial SaaS modules. It should be the place where production keys, deployment strategy, anti-abuse logic, billing logic, treasury workflows, and provider fallback strategy are developed and reviewed.

## Files/Modules Safe To Keep Public

- README
- docs
- grant proposals
- screenshots
- smart contract templates
- demo architecture
- `.env.example` without secrets
- basic frontend UI prototype
- basic API skeleton
- testnet/demo flows
- non-production examples
- public release notes
- security policy and audit checklist

## Files/Modules Recommended For Private Repo

- AI provider routing logic
- payment verification production logic
- deployer/private-key flow
- admin dashboard
- revenue/treasury production logic
- premium plan and credit system
- anti-abuse/rate-limit logic
- provider fallback strategy
- production IPFS/Filebase implementation
- billing/subscription logic
- monitoring and operational tooling
- production deployment configuration

## Sensitive Logic To Protect

- provider API key usage and fallback order
- free-tier and paid-tier abuse prevention
- payment receipt validation edge cases
- treasury withdrawal/admin operations
- deployer private-key handling
- credit accounting and subscription activation
- payout and revenue split operations
- production IPFS gateway and metadata policy
- internal analytics and business metrics

## Secrets That Must Never Be Committed

- `.env` files
- private keys
- mnemonic phrases
- deployer wallets used with private keys
- RPC URLs with private tokens
- AI provider API keys
- JWT secrets
- session secrets
- database URLs
- Redis URLs
- Filebase access keys
- Filebase secret keys
- Pinata JWT
- OpenRouter API keys
- Replicate tokens
- HuggingFace keys
- payment provider secrets
- admin credentials
- webhook secrets

## Step-By-Step Migration Plan

1. Keep the current code in place until the public/private boundary is reviewed.
2. Add and verify `private-origin`.
3. Push the full current version to `private-origin` as the protected working copy.
4. Create a new public-safe branch for `origin`.
5. Replace sensitive production modules in the public branch with documented demo/testnet-safe skeletons.
6. Keep smart contract templates, docs, grant proposals, screenshots, and testnet examples public.
7. Move production provider routing, payment verification, admin, treasury, credit, subscription, monitoring, and deployer flows to `nextmint-platform`.
8. Keep shared types and public interfaces aligned between public and private repos.
9. Run the security audit checklist before every public push.
10. Rotate any key that was ever committed, even if it was later deleted.

## Risks If Everything Remains Public

- competitors can copy the SaaS implementation
- production payment and revenue logic can be studied and cloned
- anti-abuse behavior can be bypassed more easily
- deployer and treasury operational assumptions may be exposed
- provider fallback strategy and cost controls may leak
- future commercial licensing becomes harder to enforce
- grant reviewers may see production secrets accidentally if hygiene slips

## Recommended Next Steps

1. Add `private-origin` if missing.
2. Push a full private backup branch to `nextmint-platform`.
3. Decide which modules become public skeletons.
4. Create a public-safe branch for `origin`.
5. Run the security audit checklist.
6. Replace `[ADD CONTACT EMAIL]` in `LICENSE`, `NOTICE.md`, and `README.md`.
7. Add real screenshots and demo links for grant review.
8. Keep mainnet production logic private until audit and legal review.
