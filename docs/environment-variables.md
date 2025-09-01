# Environment Variables

QuickDapp uses a layered environment configuration system that allows for flexible setup across different environments while maintaining security and ease of use.

## Configuration File Loading Order

Environment variables are loaded in the following order (later files override earlier ones):

1. `.env` - Base configuration (committed to repository)
2. `.env.{NODE_ENV}` - Environment-specific overrides (e.g., `.env.development`, `.env.production`)
3. `.env.{NODE_ENV}.local` - Environment-specific local overrides
4. `.env.local` - Local developer overrides (gitignored)

!!!
In `test` and `production` environments, `.env.local` is skipped to prevent local development settings from interfering with these critical environments.
!!!

## Application Settings

### APP_NAME
* **Default**: `QuickDapp`
* **Description**: Name of your application, used in UI and logging

## Server Configuration

### WEB_ENABLED
* **Default**: `true`
* **Description**: Enable/disable the web server component

### HOST
* **Default**: `0.0.0.0`
* **Description**: Host address to bind the server to

### PORT
* **Default**: `3000`
* **Description**: Port number for the web server

### BASE_URL
* **Default**: `http://localhost:3000`
* **Description**: Base URL for the application, used for SIWE message generation and redirects

### WORKER_COUNT
* **Default**: `1`
* **Description**: Number of worker processes to spawn. Use `cpus` for auto-scaling based on CPU count

### LOG_LEVEL
* **Default**: `info`
* **Options**: `trace`, `debug`, `info`, `warn`, `error`
* **Description**: Logging level for the main server

### WORKER_LOG_LEVEL
* **Default**: `info`
* **Options**: `trace`, `debug`, `info`, `warn`, `error`
* **Description**: Logging level for worker processes

## Database Configuration

### DATABASE_URL
* **Required**: Yes
* **Default**: `postgresql://postgres:@localhost:5432/quickdapp_dev`
* **Description**: PostgreSQL connection string
* **Format**: `postgresql://user:password@host:port/database`

!!!
The database URL is sensitive information. In production, ensure this is properly secured and not exposed to the client side.
!!!

## Authentication & Security

### SESSION_ENCRYPTION_KEY
* **Required**: Yes
* **Default**: `development_key_32_chars_long_replace_in_production`
* **Description**: 32-character key for encrypting session data
* **Security**: Must be exactly 32 characters. Generate a secure random key for production

```shell
# Generate a secure key for production
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### SERVER_WALLET_PRIVATE_KEY
* **Required**: Yes
* **Default**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
* **Description**: Private key for server-side blockchain operations
* **Security**: Use a dedicated wallet for server operations, never share this key

## Blockchain Configuration

### CHAIN
* **Default**: `anvil`
* **Options**: `anvil`, `sepolia`, `mainnet`
* **Description**: Blockchain network to connect to
* **Client-visible**: Yes

### CHAIN_RPC_ENDPOINT
* **Default**: `http://localhost:8545`
* **Description**: RPC endpoint for blockchain connection
* **Client-visible**: Yes

### WALLETCONNECT_PROJECT_ID
* **Required**: For Web3 functionality
* **Description**: WalletConnect project ID for wallet connections
* **Client-visible**: Yes

You can get a WalletConnect project ID by:
1. Visiting [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Creating a new project
3. Copying the project ID

### FACTORY_CONTRACT_ADDRESS
* **Default**: `0x0000000000000000000000000000000000000000`
* **Description**: Address of the deployed factory contract
* **Client-visible**: Yes

### TX_BLOCK_CONFIRMATIONS_REQUIRED
* **Default**: `1`
* **Description**: Number of block confirmations required for transaction finality

## External Services (Optional)

### Email Service (Mailgun)

#### MAILGUN_API_KEY
* **Description**: Mailgun API key for sending emails
* **Required**: Only if using email functionality

#### MAILGUN_API_ENDPOINT
* **Description**: Mailgun API endpoint (usually https://api.mailgun.net/v3)
* **Required**: Only if using email functionality

#### MAILGUN_FROM_ADDRESS
* **Description**: Default sender address for emails
* **Required**: Only if using email functionality

### Error Tracking (Sentry)

#### SENTRY_DSN
* **Description**: Sentry DSN for error tracking in the main application
* **Optional**: Leave empty to disable error tracking

#### SENTRY_WORKER_DSN
* **Description**: Sentry DSN for error tracking in worker processes
* **Optional**: Can be the same as SENTRY_DSN or different for separation

#### SENTRY_AUTH_TOKEN
* **Description**: Sentry authentication token for deployments
* **Optional**: Only needed for automated releases

### Cloud Deployment (DigitalOcean)

#### DIGITALOCEAN_ACCESS_TOKEN
* **Description**: DigitalOcean access token for deployment automation
* **Required**: Only if using DigitalOcean deployment scripts

## Environment-Specific Examples

### Development (.env.development)

```ini
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_dev
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545
```

### Test (.env.test)

```ini
LOG_LEVEL=warn
WORKER_LOG_LEVEL=warn
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_test
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545
WORKER_COUNT=1
```

### Production (.env.production)

```ini
LOG_LEVEL=info
WORKER_LOG_LEVEL=info
DATABASE_URL=postgresql://user:securepassword@prod-host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_secure_32_character_key_here
SERVER_WALLET_PRIVATE_KEY=0xYourSecurePrivateKeyHere
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-key
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
FACTORY_CONTRACT_ADDRESS=0xYourDeployedContractAddress
SENTRY_DSN=https://your-sentry-dsn.sentry.io/
```

## Local Development Overrides (.env.local)

Use `.env.local` for personal development settings that shouldn't be committed:

```ini
# Personal development database
DATABASE_URL=postgresql://myuser:mypass@localhost:5432/my_quickdapp_dev

# Personal WalletConnect project
WALLETCONNECT_PROJECT_ID=my_personal_project_id

# Enable debug logging
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug
```

## Accessing Configuration in Code

### Server-side
```typescript
import { serverConfig } from '@shared/config/server'

// All environment variables available
console.log(serverConfig.DATABASE_URL)
console.log(serverConfig.PORT)
```

### Client-side
```typescript
import { clientConfig } from '@shared/config/client'

// Only client-safe variables available
console.log(clientConfig.CHAIN)
console.log(clientConfig.FACTORY_CONTRACT_ADDRESS)
// clientConfig.DATABASE_URL // ❌ Not available on client
```

!!!
Never access `process.env` directly in your code. Always use `serverConfig` or `clientConfig` for type safety and proper client/server separation.
!!!