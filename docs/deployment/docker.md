# Docker Deployment

QuickDapp supports Docker deployment using pre-built binaries. This provides containerized deployment with minimal dependencies and configuration.

## Building Docker Image

Build a Docker image from your application:

```shell
# First build the binaries
bun run build

# Then build the Docker image
docker build -t quickdapp:latest .
```

## Running with Docker

### Basic Usage

Run the container with basic configuration:

```shell
docker run -d \
  --name quickdapp \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e SESSION_ENCRYPTION_KEY="your_32_character_encryption_key" \
  -e WEB3_SERVER_WALLET_PRIVATE_KEY="0xYourWalletKey" \
  quickdapp:latest
```

### Environment Configuration

Create an environment file for easier management:

```bash
# .env.docker
DATABASE_URL=postgresql://user:password@host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_secure_32_character_key
WEB3_SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKey
CHAIN=sepolia
WEB3_SEPOLIA_RPC=https://sepolia.infura.io/v3/your-api-key
WEB3_FACTORY_CONTRACT_ADDRESS=0xYourContractAddress
```

Run with environment file:

```shell
docker run -d \
  --name quickdapp \
  -p 3000:3000 \
  --env-file .env.docker \
  quickdapp:latest
```

## Multi-Platform Support

Build for different architectures:

```shell
# Build for AMD64 and ARM64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t quickdapp:latest \
  --push .
```

## Container Registry

Push to a container registry:

```shell
# Tag for registry
docker tag quickdapp:latest your-registry.com/quickdapp:latest

# Push to registry
docker push your-registry.com/quickdapp:latest

# Pull and run on production server
docker pull your-registry.com/quickdapp:latest
docker run -d --name quickdapp -p 3000:3000 --env-file .env.docker your-registry.com/quickdapp:latest
```

## Health Monitoring

The container includes health check endpoints:

```shell
# Check container health
curl http://localhost:3000/health

# Check container logs
docker logs quickdapp

# Monitor container stats
docker stats quickdapp
```

## Troubleshooting

### Common Issues

**Container won't start:**
```shell
# Check container logs
docker logs quickdapp

# Run interactively for debugging
docker run -it --rm quickdapp:latest /bin/bash
```

**Port already in use:**
```shell
# Use different port
docker run -d -p 3001:3000 --env-file .env.docker quickdapp:latest
```

**Environment variable issues:**
```shell
# Check environment variables inside container
docker exec quickdapp env | grep DATABASE_URL
```

**Database connection problems:**
```shell
# Test database connectivity from container
docker exec quickdapp ping your-db-host
```

Docker deployment provides a simple, consistent way to run QuickDapp across different environments with minimal setup requirements.