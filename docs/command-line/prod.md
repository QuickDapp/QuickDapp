# Production Server

The production command runs QuickDapp in production mode using the built application files. This command provides options for running just the server, just the client preview, or both together.

## Overview

```shell
bun run prod [subcommand]
```

The production command requires that you've already built the application with `bun run build`. It runs the optimized production code without file watching or development features.

## Subcommands

### `bun run prod` (Default)

Runs both the production server and client preview:

```shell
bun run prod
```

This starts:
- **Production server** on http://localhost:3000 (serves API and static files)
- **Client preview server** on http://localhost:4173 (serves frontend independently)

### `bun run prod server`

Runs only the production server:

```shell
bun run prod server
```

This command:
- Runs the built server from `dist/server/index.js`
- Serves both API endpoints and static files on port 3000
- Uses production environment variables
- No file watching or hot reload

### `bun run prod client`

Runs only the client preview server:

```shell
bun run prod client
```

This command:
- Serves the built frontend from `dist/client/`
- Runs on http://localhost:4173
- Useful for testing frontend builds independently
- Uses Vite's preview server for optimal static file serving

## Prerequisites

Before running production mode, you must build the application:

```shell
# Build for production (creates binaries by default)
bun run build

# Then run in production mode
bun run prod
```

## Environment Configuration

Production mode uses the `production` environment:

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_32_character_production_key
SERVER_WALLET_PRIVATE_KEY=0xYourProductionWalletKey
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-api-key
FACTORY_CONTRACT_ADDRESS=0xYourProductionContractAddress
```

## Use Cases

### Local Production Testing

Test your production build locally before deployment:

```shell
# 1. Build the application
bun run build

# 2. Test production server
bun run prod server

# 3. In another terminal, test client preview
bun run prod client
```

### Development Preview

Preview how your application will work in production:

```shell
# Run both server and client
bun run prod

# Access:
# - Full application: http://localhost:3000
# - Client preview: http://localhost:4173
```

### Deployment Testing

Verify deployment readiness:

```shell
# Test with production environment
NODE_ENV=production bun run prod
```

## Comparison with Binary Deployment

The `prod` command differs from binary deployment:

**Production Command (`bun run prod`)**:
- Runs built JavaScript files
- Requires Bun runtime on the server
- Separate server and client processes
- Good for development/staging environments

**Binary Deployment**:
- Self-contained executable
- No runtime dependencies
- Single process with embedded assets
- Ideal for production deployment

```shell
# Production command
bun run prod

# Binary deployment (after build)
./dist/binaries/quickdapp-linux-x64
```

## Monitoring and Logs

Production mode provides structured logging:

```shell
# Run with verbose logging
NODE_ENV=production LOG_LEVEL=debug bun run prod

# Monitor both processes
bun run prod  # Server on :3000, client preview on :4173
```

## Troubleshooting

### Build Not Found

```shell
❌ Production server not found. Run 'bun run build' first.
```

**Solution**: Build the application first:
```shell
bun run build
bun run prod
```

### Port Conflicts

If ports are in use:

```shell
# Check what's using the ports
lsof -i :3000
lsof -i :4173

# Kill existing processes
pkill -f "dist/server/index.js"
```

### Environment Issues

```shell
# Verify production environment
NODE_ENV=production bun run prod server

# Check environment variables
env | grep NODE_ENV
```

The production command provides a convenient way to run and test your built QuickDapp application in production mode while maintaining the flexibility to run components separately.