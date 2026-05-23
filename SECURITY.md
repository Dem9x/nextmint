# Security Policy

## Supported Status

NEXMINT AI is currently an early-stage prototype and testnet-oriented project. Smart contracts are not audited yet. Do not use mainnet funds unless you understand the risk and have completed your own review.

## Reporting Vulnerabilities

Please report security issues responsibly. Use one of these channels:

- Email: security@example.com
- Open a private security advisory on GitHub if enabled.

Avoid posting exploitable details publicly before the issue has been reviewed.

## Sensitive Data

Never commit real secrets or private infrastructure values, including:

- private keys
- deployer wallets
- API keys
- JWT secrets
- RPC private endpoints
- Filebase or Pinata secrets
- database URLs

Use testnet keys first. Mainnet deployment should use secure key management, restricted RPC credentials, and separated deployer/treasury operations.

## Smart Contract Risk

- ERC721A contracts should be audited before mainnet use.
- Testnet deployment is recommended before any production launch.
- Verify contract source code on block explorers.
- Carefully validate collection `baseURI` before deployment.
- Confirm mint price, max supply, max mint per wallet, payout wallet, platform fee, and royalty settings before publishing.

## Metadata and IPFS Risk

- Temporary AI provider URLs should not be used as permanent NFT metadata.
- NFT metadata should use `ipfs://` image URIs.
- Collection `baseURI` must end with `/`.
- `tokenURI` should resolve correctly before publishing.
- For launchpad collections, `tokenURI(1)` should resolve to `ipfs://METADATA_FOLDER_CID/1.json`.

## Responsible Disclosure

When reporting an issue, please include:

- affected component
- steps to reproduce
- expected and actual behavior
- security impact
- suggested fix, if any

## Repository Hardening Recommendations

- Enable GitHub secret scanning if available.
- Enable private vulnerability reporting if available.
- Use environment variables in deployment platforms.
- Rotate all keys used during local testing before mainnet.
- Keep production business-sensitive modules in private repositories when appropriate.
