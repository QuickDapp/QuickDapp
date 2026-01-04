# Environment Variables

QuickDapp is configured via environment variables.

## Required

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_ENCRYPTION_KEY=your_min_32_characters_key
SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKey
BASE_URL=http://localhost:3000
SUPPORTED_CHAINS=anvil
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

Notes:
- SESSION_ENCRYPTION_KEY must be at least 32 characters (validated on startup).
- SUPPORTED_CHAINS is a comma-separated list of chain names (first is primary).

## Per-chain RPC endpoints (server-only)

```bash
SERVER_ANVIL_CHAIN_RPC=http://localhost:8545
SERVER_MAINNET_CHAIN_RPC=https://eth.llamarpc.com
SERVER_SEPOLIA_CHAIN_RPC=https://rpc.sepolia.org
SERVER_BASE_CHAIN_RPC=https://mainnet.base.org
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
FACTORY_CONTRACT_ADDRESS=0x...

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
- BASE_URL
- SUPPORTED_CHAINS
- WALLETCONNECT_PROJECT_ID
- FACTORY_CONTRACT_ADDRESS
- SENTRY_DSN

Keep secrets server-side.
