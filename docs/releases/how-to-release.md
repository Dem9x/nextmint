# How to Release NEXMINT AI

Do not create a GitHub release until the release notes, screenshots, demo links, and testnet contract links have been reviewed.

## 1. Update version

If package versioning is used for the release, update the relevant `package.json` files before tagging.

## 2. Commit all changes

```bash
git status
git add .
git commit -m "Prepare v0.1.0-alpha release"
```

## 3. Create and push tag

```bash
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```

## 4. Create GitHub Release

Title:

```text
NEXMINT AI v0.1.0-alpha
```

Description:

Use the contents of [v0.1.0-alpha.md](v0.1.0-alpha.md).
