# Private Production Modules

This document describes which parts of NEXMINT AI should remain private in production and eventually move to `nextmint-platform`.

## Safe to keep public

- README
- basic UI prototype
- public smart contract templates
- docs
- grant proposals
- screenshots
- demo architecture
- `.env.example` without secrets
- basic API route skeletons
- non-production examples

## Recommended private modules

- AI provider routing logic
- payment verification production logic
- deployer/private-key flow
- admin dashboard
- revenue/treasury logic
- premium plan and credit system
- anti-abuse and rate-limit logic
- provider fallback strategy
- production Filebase/IPFS implementation
- billing/subscription logic
- monitoring and error tracking
- production deployment configuration

## Recommended repository structure

Public:

- `nextmint`

Private:

- `nextmint-platform`
- `nextmint-api-private`
- `nextmint-production`

The public repository should demonstrate the architecture and product direction. The private repositories should contain production-specific logic and operational secrets.
