# Crypto Payment System

## Supported Networks

- Base
- Ethereum
- Polygon
- Arbitrum
- BNB Chain

## Supported Tokens

- Native gas token through `payNative`
- USDC, USDT, and DAI through `payToken`

## Verification Rules

The backend confirms:

- transaction receipt status is successful
- receipt destination is the configured `TreasuryPayments` contract
- emitted `PaymentReceived` event matches the backend-created payment ID
- payer matches the authenticated wallet
- token and amount satisfy the requested package or subscription
- payment ID has not already been consumed by the contract

## Recurring Subscriptions

Crypto subscriptions are implemented as fixed prepaid periods. The app can remind users before expiry and feature-gate usage after `currentPeriodEnd`. Fully automatic recurring charges are not possible without delegated wallet permissions, so the production-safe flow is explicit wallet renewal.
