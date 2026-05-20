# Cloud MongoDB + Redis Setup

Use this when you do not want Docker locally.

## MongoDB Atlas

1. Create a free Atlas cluster.
2. Add your current IP address in **Network Access**.
3. Create a database user in **Database Access**.
4. Copy the Node.js connection string.
5. Put it in `.env`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster-name.xxxxx.mongodb.net/nexmint?retryWrites=true&w=majority
```

If your password contains special characters such as `@`, `#`, `/`, `?`, `:` or `%`, URL-encode it first.

Example:

```text
p@ss#word -> p%40ss%23word
```

If you get `querySrv ECONNREFUSED _mongodb._tcp...`, your DNS resolver is blocking SRV lookups. Try:

- switch DNS to `1.1.1.1` or `8.8.8.8`
- disable VPN/proxy temporarily
- use Atlas “standard connection string” instead of SRV if available
- verify your IP is allowlisted in Atlas

## Redis Cloud / Upstash

Use a full Redis URL, not only the password or hostname.

TLS cloud Redis usually needs:

```env
REDIS_URL=rediss://default:PASSWORD@HOST:PORT
```

Non-TLS local Redis uses:

```env
REDIS_URL=redis://localhost:6379
```

If your Redis password contains special characters, URL-encode it.

Example:

```text
abc@123 -> abc%40123
```

BullMQ expects Redis eviction policy to be `noeviction`. If your provider uses `volatile-lru`, the API and workers can still start, but background jobs may be unsafe if Redis evicts queue keys. In your Redis cloud dashboard, set:

```text
maxmemory-policy noeviction
```

If the free plan does not allow changing this setting, it is acceptable for early UI/API development, but use a Redis plan/provider with `noeviction` before production queues.

## Run Without Docker

After `.env` is configured:

```bash
npm --workspace @nexmint/api run dev
npm --workspace @nexmint/api run worker
npm --workspace @nexmint/web run dev
```
