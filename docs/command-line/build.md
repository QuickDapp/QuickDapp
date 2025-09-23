# Build

The build command compiles QuickDapp for production, creating optimized bundles and self-contained binary executables. This command prepares your application for deployment across different environments.

## Production Build Process

### Building for Production

Create an optimized production build:

```shell
bun run build
```

The build process:
* Compiles TypeScript to JavaScript
* Optimizes and bundles frontend assets with Vite
* Generates production-ready server code
* Creates self-contained binary executables (always enabled)
* Bundles static assets into the server
* Optimizes for production performance

## Options

- --clean / --no-clean
  - Clean previous build outputs before building. Default: --clean (true).
- --bundle
  - Bundle the built client into the server’s static directory so the server serves the SPA directly.
  - Copies assets into dist/server/static and embeds static assets into the binary output.

Notes:
- Binaries are always built as part of the build.

### Build Artifacts

After building, you'll find these artifacts:

```
dist/
├── server/              # Compiled server code
│   ├── index.js        # Main server entry point
│   └── ...             # Server modules
├── client/             # Optimized frontend bundle
│   ├── index.html      # Main HTML file
│   ├── assets/         # CSS, JS, and other assets
│   └── favicon.ico     # App icon
└── binaries/          # Self-contained binaries
    ├── quickdapp-linux-x64
    ├── quickdapp-darwin-x64
    └── quickdapp-windows-x64.exe
```
Additional server binary support files:
- dist/server/binary.js
- dist/server/binary-assets.json


## Running Production Build

### Using the Production Command

After building, run the production server:

```shell
bun run prod
```

This command:
* Runs the built server and client preview
* Uses optimized production builds
* Enables production logging levels
* Serves static assets efficiently

For more details, see [Production Command Documentation](./prod.md).

### Using Binary Executables

Run the self-contained binary directly:

```shell
# Linux/macOS
./dist/binaries/quickdapp-linux-x64

# Windows
dist\binaries\quickdapp-windows-x64.exe
```

Binaries include all dependencies and assets for standalone deployment.

## Production Configuration

### Environment Setup

Production uses specific environment files:

```shell
# Load order for production
.env                    # Base configuration
.env.production         # Production-specific settings
.env.production.local   # Local production overrides (gitignored)
```

### Production Environment Variables

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
WORKER_LOG_LEVEL=info

# Production database
DATABASE_URL=postgresql://user:password@prod-host:5432/quickdapp

# Security
SESSION_ENCRYPTION_KEY=your_secure_32_character_key_here
SERVER_WALLET_PRIVATE_KEY=0xYourProductionWalletKey

# Blockchain network
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-api-key

# Contract addresses
FACTORY_CONTRACT_ADDRESS=0xYourProductionContractAddress

# External services
SENTRY_DSN=https://your-sentry-dsn
MAILGUN_API_KEY=your-mailgun-key

# Workers
WORKER_COUNT=cpus    # Auto-scale to CPU count

# Performance
DATABASE_POOL_SIZE=20
```

## Production Optimizations

### Server Optimizations

Production mode includes several optimizations:

**Performance Enhancements:**
* Gzip compression for responses
* Static asset caching with proper headers
* Database connection pooling
* Query optimization and caching
* Minified client bundles

**Security Hardening:**
* CORS configuration for production domains
* Content Security Policy headers
* Rate limiting for API endpoints
* Input validation and sanitization
* Error message sanitization

**Logging Optimizations:**
* Structured JSON logging
* Log rotation and archival
* Error aggregation
* Performance metrics collection

### Database Optimizations

Production database configuration:

```typescript
// Production database settings
const productionDbConfig = {
  max: parseInt(serverConfig.DATABASE_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
}
```

### Worker Optimizations

Production worker configuration:

```bash
# Scale workers based on CPU cores
WORKER_COUNT=cpus

# Optimize job processing
WORKER_BATCH_SIZE=10
WORKER_POLL_INTERVAL=1000
WORKER_MAX_RETRIES=3
```

## Binary Deployment

### Using Compiled Binaries

QuickDapp builds self-contained executables:

```shell
# Run the binary directly (Linux example)
./dist/binaries/quickdapp-linux-x64

# With environment variables
DATABASE_URL="..." \
CHAIN=sepolia \
./dist/binaries/quickdapp-linux-x64

# With environment file
NODE_ENV=production ./dist/binaries/quickdapp-linux-x64
```

### Cross-Platform Binaries

Build for multiple platforms:

```shell
# Build process creates binaries for:
# - Linux x64 (quickdapp-linux-x64)
# - macOS x64 (quickdapp-darwin-x64)  
# - Windows x64 (quickdapp-windows-x64.exe)
```

## Health Monitoring

### Health Check Endpoints

Production server includes health monitoring:

```shell
# Basic health check
curl http://localhost:3000/health
# Response: {"status":"ok","version":"1.0.0","timestamp":"..."}
```

### Production Logging

Structured logging for production monitoring:

```json
{
  "level": "info",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Server started",
  "metadata": {
    "port": 3000,
    "workers": 4,
    "database": "connected"
  }
}
```

## Performance Monitoring

### Metrics Collection

Built-in performance metrics:

```typescript
// Request metrics
{
  "metric": "http_request",
  "method": "POST",
  "path": "/graphql",
  "status": 200,
  "duration": 45,
  "timestamp": "..."
}

// Database metrics  
{
  "metric": "database_query",
  "query": "SELECT * FROM tokens",
  "duration": 12,
  "rows": 5
}

// Worker metrics
{
  "metric": "job_processed",
  "type": "deployToken", 
  "duration": 15000,
  "status": "completed"
}
```

### External Monitoring Integration

Sentry integration for error tracking:

```bash
# Enable Sentry in production
SENTRY_DSN=https://your-sentry-dsn.sentry.io/project-id

# Worker-specific Sentry DSN (optional)
SENTRY_WORKER_DSN=https://your-worker-dsn.sentry.io/project-id
```

## Production Testing

### Local Production Testing

Test production build locally:

```shell
# 1. Build for production
bun run build

# 2. Set up production environment
cp .env.production .env.production.local
# Edit .env.production.local with local production database

# 3. Run production server locally
NODE_ENV=production bun run prod

# 4. Test all functionality
# - Authentication flow
# - Token deployment
# - WebSocket connections
# - API endpoints
```

### Production Readiness Checklist

Before deploying to production:

**Configuration:**
- [ ] Production environment variables configured
- [ ] Database connection string updated
- [ ] Smart contract addresses set
- [ ] External service API keys configured
- [ ] SSL certificates ready (if self-hosting)

**Security:**
- [ ] Session encryption key generated (32 characters)
- [ ] Production wallet private key secured
- [ ] CORS settings configured for production domain
- [ ] Rate limiting configured
- [ ] Input validation tested

**Performance:**
- [ ] Database indexes optimized
- [ ] Worker count configured appropriately
- [ ] Static asset CDN configured (if using)
- [ ] Monitoring and alerting set up

**Testing:**
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Production build tested locally
- [ ] Database migrations tested

## Troubleshooting Production

### Common Production Issues

**Server Won't Start:**
```shell
# Check environment variables
NODE_ENV=production bun run prod --verbose

# Validate configuration
echo $DATABASE_URL
echo $SESSION_ENCRYPTION_KEY
```

**Database Connection Issues:**
```shell
# Test database connection directly
psql "$DATABASE_URL" -c "SELECT 1;"

# Check connection pool settings
DATABASE_POOL_SIZE=10 bun run prod
```

**Performance Issues:**
```shell
# Monitor resource usage
htop
df -h

# Check worker performance
WORKER_LOG_LEVEL=debug bun run prod
```

**Memory Leaks:**
```shell
# Monitor memory usage
NODE_OPTIONS="--max-old-space-size=2048" bun run prod

# Enable memory profiling
NODE_OPTIONS="--inspect" bun run prod
```

### Production Logs Analysis

Analyze production logs for issues:

```shell
# Filter error logs
grep '"level":"error"' production.log

# Monitor GraphQL performance
grep '"metric":"graphql_request"' production.log | \
  jq '.duration' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'

# Check database query performance
grep '"metric":"database_query"' production.log | \
  jq 'select(.duration > 100)'
```

The production command provides a robust, optimized environment for running QuickDapp in production with comprehensive monitoring, security, and performance features.
