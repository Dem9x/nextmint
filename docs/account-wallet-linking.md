# Account Wallet Linking

Email accounts can link a wallet from the dashboard without replacing the existing email login flow.

## How It Works

1. The user logs in with email.
2. The user connects a wallet in the dashboard.
3. NEXMINT creates a short-lived wallet-link challenge.
4. The user signs the challenge message with their wallet.
5. The backend verifies the signature and links the wallet to the logged-in account.

The signature is gasless. It does not authorize a transaction, approve a contract, or spend funds.

## What The Linked Wallet Is Used For

- minting single NFTs
- minting launchpad NFTs
- marketplace listing, buying, and cancelling
- liking collections and NFTs
- creator collection management
- creator payout wallet defaults
- wallet ownership verification

## Security Notes

- The backend never trusts a frontend-submitted wallet address without verifying a signed message.
- Wallet link challenges expire after 10 minutes and can only be used once.
- A wallet cannot be the primary wallet of multiple NEXMINT accounts.
- Users should never share private keys or seed phrases.

## API

- `POST /api/users/wallet-link/challenge`
- `POST /api/users/wallet-link/verify`
- `DELETE /api/users/wallet-link`
- `GET /api/users/me/wallet`
