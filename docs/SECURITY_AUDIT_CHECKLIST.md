# Security Audit Checklist

Before making the repository public, verify that the repo does not include:

- `.env` files
- private keys
- mnemonic phrases
- deployer wallets
- RPC URLs with private tokens
- API keys
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
- Stripe or payment secrets
- admin credentials
- production webhook secrets

Run a local grep check before pushing:

```bash
git grep -i "private_key\|api_key\|secret\|jwt\|mongodb\|redis\|pinata\|filebase\|replicate\|openrouter\|huggingface\|walletconnect\|mnemonic"
```

Check tracked filenames for sensitive patterns:

```bash
git ls-files | grep -E "\.env|\.pem|\.key|secret|credentials"
```

Review matches manually. Some matches are expected in `.env.example`, docs, and variable names, but real values must not be committed.

If a secret was ever committed, deleting it is not enough. Rotate the key immediately.

## GitHub Recommendations

- Enable GitHub secret scanning if available.
- Enable private vulnerability reporting if available.
- Use environment variables in deployment platforms.
- Rotate all keys used during local testing before mainnet.
- Add public/private boundary comments where appropriate.
