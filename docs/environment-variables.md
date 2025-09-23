# Environment Variables

QuickDapp uses environment variables for configuration. Variables are loaded in this order (later files override earlier ones):

1. `.env` - Base configuration (committed to repository)
2. `.env.{NODE_ENV}` - Environment-specific overrides
3. `.env.{NODE_ENV}.local` - Environment-specific local overrides  
4. `.env.local` - Local developer overrides (gitignored)

## Required Variables

These variables must be set for the application to function:

### Database
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Security
```bash
SESSION_ENCRYPTION_KEY=your_32_character_encryption_key_here
SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKeyHere
```

### Blockchain
```bash
BASE_URL=http://localhost:3000
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
FACTORY_CONTRACT_ADDRESS=0xYourContractAddress
```

## Optional Variables

### Application Settings
```bash
APP_NAME=QuickDapp                    # Default: QuickDapp
NODE_ENV=development                  # Default: development
```

### Server Configuration
```bash
WEB_ENABLED=true                     # Default: true
HOST=localhost                       # Default: localhost
PORT=3000                           # Default: 3000
WORKER_COUNT=1                      # Default: 1 (or "cpus" for auto-scaling)
STATIC_ASSETS_FOLDER=/path/to/assets # Optional
```

### Logging
```bash
LOG_LEVEL=info                      # Options: trace, debug, info, warn, error
WORKER_LOG_LEVEL=info              # Options: trace, debug, info, warn, error
```

### Blockchain Settings
```bash
TX_BLOCK_CONFIRMATIONS_REQUIRED=1   # Default: 1
```

### External Services
```bash
SENTRY_DSN=https://your-sentry-dsn    # Optional error tracking
SENTRY_WORKER_DSN=https://worker-dsn  # Optional worker error tracking
SENTRY_AUTH_TOKEN=your_token          # Optional
MAILGUN_API_KEY=your_key             # Optional email service
MAILGUN_API_ENDPOINT=https://api.mailgun.net  # Optional
MAILGUN_FROM_ADDRESS=noreply@example.com      # Optional
```

## Environment-Specific Examples

### Development (.env.development)
```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_dev
SESSION_ENCRYPTION_KEY=development_key_32_chars_long_replace_in_production
SERVER_WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BASE_URL=http://localhost:3000
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545
WALLETCONNECT_PROJECT_ID=placeholder_get_from_walletconnect
FACTORY_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
LOG_LEVEL=debug
```

### Production (.env.production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_secure_32_character_production_key
SERVER_WALLET_PRIVATE_KEY=0xYourSecureProductionWalletKey
BASE_URL=https://your-domain.com
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-api-key
WALLETCONNECT_PROJECT_ID=your_actual_walletconnect_project_id
FACTORY_CONTRACT_ADDRESS=0xYourSepoliaContractAddress
WORKER_COUNT=cpus
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn
```

### Test (.env.test)
```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_test
SESSION_ENCRYPTION_KEY=test_key_32_characters_long_for_testing
SERVER_WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BASE_URL=http://localhost:3000
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545
WALLETCONNECT_PROJECT_ID=test_project_id
FACTORY_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
LOG_LEVEL=warn
WORKER_COUNT=1
```

## Security Notes

**SESSION_ENCRYPTION_KEY**: Must be exactly 32 characters. Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**SERVER_WALLET_PRIVATE_KEY**: Keep this secure and never expose to client-side code. Use a dedicated wallet for server operations.

**DATABASE_URL**: Contains sensitive credentials. Never expose in logs or client code.

## Client-Visible Variables

These variables are exposed to the frontend and must not contain sensitive information:
- `APP_NAME`
- `APP_VERSION` 
- `NODE_ENV`
- `BASE_URL`
- `CHAIN`
- `CHAIN_RPC_ENDPOINT`
- `WALLETCONNECT_PROJECT_ID`
- `FACTORY_CONTRACT_ADDRESS`
- `SENTRY_DSN`

All other variables remain server-only for security.