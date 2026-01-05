# Environment Variables

QuickDapp is configured via environment variables.

## Required

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_ENCRYPTION_KEY=your_min_32_characters_key
WEB3_SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKey
API_URL=http://localhost:3000
WEB3_SUPPORTED_CHAINS=anvil
WEB3_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

Notes:
- SESSION_ENCRYPTION_KEY must be at least 32 characters (validated on startup).
- WEB3_SUPPORTED_CHAINS is a comma-separated list of chain names (first is primary).

## Per-chain RPC endpoints (server-only)

```bash
WEB3_ANVIL_RPC=http://localhost:8545
WEB3_MAINNET_RPC=https://eth.llamarpc.com
WEB3_SEPOLIA_RPC=https://rpc.sepolia.org
WEB3_BASE_RPC=https://mainnet.base.org
```

Notes:
- Set the RPC endpoint for each chain you want to support.
- Client-side uses viem's built-in public RPCs for each chain.
- Server-side uses these environment variables for blockchain operations.

## Common optional

```bash
# App/server
WEB_ENABLED=true
HOST=localhost
PORT=3000
WORKER_COUNT=1            # or "cpus" (applies at runtime)
STATIC_ASSETS_FOLDER=     # optional

# Logging
LOG_LEVEL=info            # trace|debug|info|warn|error
WORKER_LOG_LEVEL=info

# Smart contracts
WEB3_FACTORY_CONTRACT_ADDRESS=0x...

# External services
SENTRY_DSN=
SENTRY_WORKER_DSN=
SENTRY_AUTH_TOKEN=
MAILGUN_API_KEY=
MAILGUN_API_ENDPOINT=
MAILGUN_FROM_ADDRESS=
```

## Client-visible

Safe to expose:
- APP_NAME
- APP_VERSION
- NODE_ENV
- API_URL
- WEB3_SUPPORTED_CHAINS
- WEB3_WALLETCONNECT_PROJECT_ID
- WEB3_FACTORY_CONTRACT_ADDRESS
- SENTRY_DSN

Keep secrets server-side.
