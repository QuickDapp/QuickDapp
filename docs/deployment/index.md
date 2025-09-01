# Deployment

QuickDapp supports multiple deployment strategies to fit different infrastructure needs. Whether you prefer self-contained binaries, Docker containers, or traditional cloud deployments, QuickDapp provides the tools and flexibility you need.

## Deployment Options

### Binary Deployment
Self-contained executables with embedded assets for simple deployment:
* **Single File** - Everything bundled into one executable
* **Cross-Platform** - Build for Linux, Windows, macOS
* **No Dependencies** - No need for Node.js or runtime installation
* **Fast Startup** - Optimized for quick boot times

### Docker Deployment
Container-based deployment for scalable cloud environments:
* **Consistent Environment** - Same runtime across development and production
* **Horizontal Scaling** - Easy to scale with container orchestration
* **Resource Isolation** - Controlled resource allocation
* **Cloud Native** - Works with Kubernetes, Docker Swarm, etc.

### Traditional Deployment
Standard deployment to VPS, bare metal, or cloud instances:
* **Direct Installation** - Install dependencies and run directly
* **Process Management** - Use PM2, systemd, or other process managers
* **Flexible Configuration** - Full control over the environment

## Prerequisites

Before deploying, ensure you have:

1. **Production Database** - PostgreSQL instance accessible from your deployment environment
2. **Environment Configuration** - Production environment variables configured
3. **Smart Contracts** - Contracts deployed to target blockchain network
4. **SSL Certificate** - For HTTPS in production (recommended)

## Binary Deployment

### Building the Binary

Create a production-ready binary:

```shell
# Build the application with binary support
bun run build --binary

# Binary is created in dist/binaries/
ls dist/binaries/
# quickdapp-linux-x64
# quickdapp-windows-x64.exe
# quickdapp-darwin-x64
```

### Binary Configuration

The binary reads configuration from environment variables or `.env` files:

```shell
# Create production environment file
cat > .env.production << EOF
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
HOST=0.0.0.0
PORT=3000
BASE_URL=https://yourdomain.com

# Security
SESSION_ENCRYPTION_KEY=your_32_character_encryption_key
SERVER_WALLET_PRIVATE_KEY=0x...

# Blockchain
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-key
FACTORY_CONTRACT_ADDRESS=0x...

# Workers
WORKER_COUNT=cpus

# Logging
LOG_LEVEL=info
WORKER_LOG_LEVEL=info
EOF
```

### Running the Binary

```shell
# Run with environment file
NODE_ENV=production ./dist/binaries/quickdapp-linux-x64

# Or with environment variables
DATABASE_URL="postgresql://..." \
CHAIN=sepolia \
./dist/binaries/quickdapp-linux-x64
```

### Process Management

Use a process manager for production reliability:

```shell
# Using PM2
bun add -g pm2

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'quickdapp',
    script: './dist/binaries/quickdapp-linux-x64',
    instances: 1,
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Docker Deployment

### Dockerfile

QuickDapp includes a production-optimized Dockerfile:

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# Production image
FROM oven/bun:1-slim
WORKDIR /app

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run application
CMD ["bun", "run", "prod"]
```

### Building Docker Image

```shell
# Build image
docker build -t quickdapp:latest .

# Build for specific platform
docker build --platform linux/amd64 -t quickdapp:latest .

# Tag for registry
docker tag quickdapp:latest your-registry/quickdapp:v1.0.0
```

### Docker Compose

For development and simple production setups:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/quickdapp
      - SESSION_ENCRYPTION_KEY=your_32_character_key
      - CHAIN=sepolia
      - FACTORY_CONTRACT_ADDRESS=0x...
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=quickdapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Running with Docker

```shell
# Using Docker Compose
docker-compose up -d

# Or run directly
docker run -d \
  --name quickdapp \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e CHAIN=sepolia \
  quickdapp:latest
```

## Cloud Platform Deployment

### DigitalOcean App Platform

Deploy to DigitalOcean's managed platform:

```yaml
# .do/app.yaml
name: quickdapp
services:
- name: web
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: bun run prod
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: SESSION_ENCRYPTION_KEY
    value: your_encryption_key
    type: SECRET
  - key: CHAIN
    value: sepolia

databases:
- name: db
  engine: PG
  version: "15"
```

### Railway

Deploy to Railway platform:

```shell
# Install Railway CLI
bun add -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Vercel (Frontend Only)

Deploy frontend separately to Vercel:

```json
{
  "name": "quickdapp-frontend",
  "version": 2,
  "builds": [
    {
      "src": "src/client/**",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/client"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-api.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## Environment-Specific Configuration

### Production Environment

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
WORKER_LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
HOST=0.0.0.0
PORT=3000
BASE_URL=https://yourdomain.com

# Security
SESSION_ENCRYPTION_KEY=generate_secure_32_char_key
SERVER_WALLET_PRIVATE_KEY=0xproduction_wallet_key

# Blockchain
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-api-key
FACTORY_CONTRACT_ADDRESS=0xdeployed_contract_address

# External services
SENTRY_DSN=https://your-sentry-dsn
MAILGUN_API_KEY=your-mailgun-key

# Workers
WORKER_COUNT=cpus
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=production
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug

# Use staging database and contracts
DATABASE_URL=postgresql://staging_db_url
FACTORY_CONTRACT_ADDRESS=0xstaging_contract_address
```

## Security Considerations

### Environment Variables
* Store sensitive values in environment variables, not in code
* Use different keys/secrets for each environment
* Rotate keys regularly

### Network Security
* Use HTTPS in production (SSL/TLS certificates)
* Configure firewall rules to restrict access
* Use VPC/private networks for database connections

### Database Security
* Use connection pooling and SSL for database connections
* Regular backups with encryption
* Restrict database access to application servers only

### Container Security
* Use official base images
* Keep dependencies updated
* Scan images for vulnerabilities
* Run containers with non-root users

## Monitoring and Health Checks

### Health Endpoints

QuickDapp provides built-in health check endpoints:

```typescript
// Health check endpoint
GET /health
Response: { status: 'ok', version: '1.0.0', timestamp: '2024-01-01T00:00:00Z' }

// Detailed status
GET /status
Response: {
  status: 'ok',
  version: '1.0.0',
  database: 'connected',
  workers: 2,
  uptime: 3600
}
```

### Monitoring Setup

```yaml
# docker-compose.yml with monitoring
version: '3.8'

services:
  app:
    # ... app configuration ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`yourdomain.com`)"
  
  traefik:
    image: traefik:v2.9
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## Documentation Sections

* [Binary](./binary.md) - Self-contained executable deployment
* [Docker](./docker.md) - Container-based deployment
* [Cloud Platforms](./cloud-platforms.md) - Cloud deployment guides

Choose the deployment strategy that best fits your infrastructure requirements and operational preferences.