---
order: 50
icon: Settings
---

# Environment Variables

QuickDapp uses environment variables for configuration, loaded from `.env` files based on `NODE_ENV`. The base `.env` file is loaded first, then environment-specific overrides (`.env.development`, `.env.test`, `.env.production`), and finally `.env.local` for developer overrides.

## Required Variables

Every QuickDapp deployment needs these core variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string. See [Database](./backend/database.md) for schema and query patterns. |
| `SESSION_ENCRYPTION_KEY` | Secret key for JWT signing and OAuth state encryption. Must be at least 32 characters. |
| `BASE_URL` | Base URL for the server (e.g., `http://localhost:3000` or `https://api.yourdomain.com`). Server-only. |

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_ENCRYPTION_KEY=your_min_32_characters_key
BASE_URL=http://localhost:3000
```

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_ENABLED` | `true` | Enable the web server. Set to `false` for worker-only processes. |
| `HOST` | `localhost` | Server bind address. Use `0.0.0.0` in containers. |
| `PORT` | `3000` | Server port number. |
| `WORKER_COUNT` | `1` | Number of worker processes. Set to `"cpus"` to match CPU cores. |
| `STATIC_ASSETS_FOLDER` | — | Custom path for static assets (overrides default). |
| `LOG_LEVEL` | `info` | Logging verbosity: `trace`, `debug`, `info`, `warn`, `error`. |
| `WORKER_LOG_LEVEL` | `info` | Log level for worker processes. |

```bash
WEB_ENABLED=true
HOST=localhost
PORT=3000
WORKER_COUNT=1
LOG_LEVEL=info
WORKER_LOG_LEVEL=info
```

## OAuth Providers

Configure OAuth authentication by setting client credentials for each provider. Leave empty to disable a provider. See [Authentication](./backend/authentication.md) for implementation details.

| Variable | Description |
|----------|-------------|
| `OAUTH_CALLBACK_BASE_URL` | Base URL for OAuth callbacks (e.g., `http://localhost:3000`). |
| `OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID. |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |
| `OAUTH_FACEBOOK_CLIENT_ID` | Facebook OAuth app ID. |
| `OAUTH_FACEBOOK_CLIENT_SECRET` | Facebook OAuth app secret. |
| `OAUTH_GITHUB_CLIENT_ID` | GitHub OAuth app client ID. |
| `OAUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret. |
| `OAUTH_X_CLIENT_ID` | X (Twitter) OAuth client ID. |
| `OAUTH_X_CLIENT_SECRET` | X (Twitter) OAuth client secret. |
| `OAUTH_TIKTOK_CLIENT_KEY` | TikTok OAuth client key. |
| `OAUTH_TIKTOK_CLIENT_SECRET` | TikTok OAuth client secret. |
| `OAUTH_LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID. |
| `OAUTH_LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret. |

## Email (Mailgun)

Configure transactional email delivery via Mailgun. When not configured, emails are logged to the console instead of sent. See [Mailgun](./backend/mailgun.md) for usage.

| Variable | Description |
|----------|-------------|
| `MAILGUN_API_KEY` | Mailgun API key for sending emails. |
| `MAILGUN_API_ENDPOINT` | Mailgun API endpoint. Set for EU region: `https://api.eu.mailgun.net`. |
| `MAILGUN_FROM_ADDRESS` | Sender email address (e.g., `noreply@yourdomain.com`). Domain is extracted automatically. |

## Error Tracking (Sentry)

Configure Sentry for error tracking and performance monitoring. See [Sentry](./backend/sentry.md) for integration details.

| Variable | Default | Description |
|----------|---------|-------------|
| `SENTRY_DSN` | — | Sentry DSN for the main server process. |
| `SENTRY_WORKER_DSN` | — | Sentry DSN for worker processes (can be same or different project). |
| `SENTRY_TRACES_SAMPLE_RATE` | `1.0` | Fraction of requests to trace (0.0 to 1.0). |
| `SENTRY_PROFILE_SESSION_SAMPLE_RATE` | `1.0` | Fraction of sessions to profile (0.0 to 1.0). |

## WebSocket Configuration

Control real-time connection limits. See [WebSockets](./backend/websockets.md) for the connection lifecycle and message types.

| Variable | Default | Description |
|----------|---------|-------------|
| `SOCKET_MAX_CONNECTIONS_PER_USER` | `5` | Maximum concurrent WebSocket connections per user. |
| `SOCKET_MAX_TOTAL_CONNECTIONS` | `10000` | Global limit for all WebSocket connections. |

## Client-Visible Variables

These variables are safe to expose in the frontend bundle:

- `APP_NAME`, `APP_VERSION`, `NODE_ENV`
- `CLIENT_API_BASE_URL` (optional — overrides the API base URL on the client; falls back to `window.location.origin`)
- `SENTRY_DSN`

Server-side secrets like database credentials, private keys, and OAuth secrets remain server-only. See [`src/shared/config/client.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/config/client.ts) for the client configuration and [`src/shared/config/server.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/config/server.ts) for the full server configuration.

---

## Web3 Variant Variables

!!!
The following variables are only relevant when using the [Web3 variant](./variants/web3/index.md). They are not present in the base package.
!!!

| Variable | Description |
|----------|-------------|
| `WEB3_ENABLED` | Enable Web3 features (always `true` in the Web3 variant). |
| `WEB3_SERVER_WALLET_PRIVATE_KEY` | Private key for server-side blockchain transactions. Use a dedicated wallet. |
| `WEB3_SUPPORTED_CHAINS` | Comma-separated chain names (e.g., `anvil`, `mainnet`, `sepolia`, `base`). |
| `WEB3_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID for wallet connections. |
| `WEB3_ALLOWED_SIWE_ORIGINS` | Comma-separated origins allowed for SIWE authentication. |
| `WEB3_FACTORY_CONTRACT_ADDRESS` | Deployed factory contract address. |

```bash
WEB3_ENABLED=true
WEB3_SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKey
WEB3_SUPPORTED_CHAINS=anvil
WEB3_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
WEB3_ALLOWED_SIWE_ORIGINS=http://localhost:3000
WEB3_FACTORY_CONTRACT_ADDRESS=0xYourContractAddress
```

### Per-Chain RPC Endpoints

Server-side blockchain operations use chain-specific RPC variables:

| Variable | Description |
|----------|-------------|
| `WEB3_ANVIL_RPC` | RPC URL for local Anvil/Foundry development network. |
| `WEB3_MAINNET_RPC` | RPC URL for Ethereum mainnet. |
| `WEB3_SEPOLIA_RPC` | RPC URL for Sepolia testnet. |
| `WEB3_BASE_RPC` | RPC URL for Base network. |

```bash
WEB3_ANVIL_RPC=http://localhost:8545
WEB3_MAINNET_RPC=https://eth.llamarpc.com
WEB3_SEPOLIA_RPC=https://rpc.sepolia.org
WEB3_BASE_RPC=https://mainnet.base.org
```

Client-side uses viem's built-in public RPCs for each chain.

### Web3 Client-Visible Variables

These Web3 variables are also exposed to the frontend bundle:

- `WEB3_ENABLED`, `WEB3_SUPPORTED_CHAINS`, `WEB3_WALLETCONNECT_PROJECT_ID`, `WEB3_FACTORY_CONTRACT_ADDRESS`
