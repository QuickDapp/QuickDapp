# Environment Variables

QuickDapp is configured via environment variables.

## Required

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_ENCRYPTION_KEY=your_min_32_characters_key
SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKey
BASE_URL=http://localhost:3000
CHAIN_RPC_ENDPOINT=http://localhost:8545
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

Notes:
- SESSION_ENCRYPTION_KEY must be at least 32 characters (validated on startup).

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

# Blockchain
CHAIN=anvil
FACTORY_CONTRACT_ADDRESS=0x...

# Confirmations
TX_BLOCK_CONFIRMATIONS_REQUIRED=1

# External services
SENTRY_DSN=
SENTRY_WORKER_DSN=
SENTRY_AUTH_TOKEN=
MAILGUN_API_KEY=
MAILGUN_API_ENDPOINT=
MAILGUN_FROM_ADDRESS=
DIGITALOCEAN_ACCESS_TOKEN=
```

## Client-visible

Safe to expose:
- APP_NAME
- APP_VERSION
- NODE_ENV
- BASE_URL
- CHAIN
- CHAIN_RPC_ENDPOINT
- WALLETCONNECT_PROJECT_ID
- FACTORY_CONTRACT_ADDRESS
- SENTRY_DSN

Keep secrets server-side.
