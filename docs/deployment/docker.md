# Docker

Docker deployment provides containerized, scalable deployment options for QuickDapp applications. This approach ensures consistent environments across development, staging, and production while supporting horizontal scaling and orchestration.

## Production Docker Setup

### Dockerfile Optimization

QuickDapp includes a production-optimized multi-stage Dockerfile:

```dockerfile
# Production Dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Dependencies stage (cached for faster rebuilds)
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production=false

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Security: Create non-root user
RUN groupadd -r quickdapp && useradd -r -g quickdapp quickdapp

# Copy production files
COPY --from=builder --chown=quickdapp:quickdapp /app/dist ./dist
COPY --from=deps --chown=quickdapp:quickdapp /app/node_modules ./node_modules
COPY --chown=quickdapp:quickdapp package.json ./

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER quickdapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["bun", "run", "prod"]
```

### Docker Compose Production

Complete production setup with database and monitoring:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://quickdapp:${DB_PASSWORD}@db:5432/quickdapp
      - SESSION_ENCRYPTION_KEY=${SESSION_ENCRYPTION_KEY}
      - SERVER_WALLET_PRIVATE_KEY=${SERVER_WALLET_PRIVATE_KEY}
      - CHAIN=${CHAIN:-sepolia}
      - CHAIN_RPC_ENDPOINT=${CHAIN_RPC_ENDPOINT}
      - FACTORY_CONTRACT_ADDRESS=${FACTORY_CONTRACT_ADDRESS}
      - WORKER_COUNT=2
      - SENTRY_DSN=${SENTRY_DSN}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - quickdapp-network
    volumes:
      - app-logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=quickdapp
      - POSTGRES_USER=quickdapp
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    networks:
      - quickdapp-network
    command: postgres -c 'max_connections=200'

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - quickdapp-network

  # Reverse proxy with SSL
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - quickdapp-network

volumes:
  postgres_data:
  redis_data:
  app-logs:
  nginx-logs:

networks:
  quickdapp-network:
    driver: bridge
```

## Deployment Process

### Building Images

Build optimized production images:

```shell
# Build production image
docker build -t quickdapp:latest .

# Build with version tag
docker build -t quickdapp:v1.0.0 .

# Multi-platform build (for deployment to different architectures)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t quickdapp:latest \
  --push .

# Build with specific target stage
docker build --target production -t quickdapp:prod .
```

### Container Registry

Push to container registry:

```shell
# Tag for registry
docker tag quickdapp:latest registry.example.com/quickdapp:latest

# Push to registry
docker push registry.example.com/quickdapp:latest

# Pull on production server
docker pull registry.example.com/quickdapp:latest
```

### Environment Configuration

Create environment file for production:

```bash
# .env.prod
# Database
DB_PASSWORD=secure_random_password

# Application
SESSION_ENCRYPTION_KEY=your_secure_32_character_encryption_key
SERVER_WALLET_PRIVATE_KEY=0xYourProductionWalletPrivateKey

# Blockchain
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your_api_key
FACTORY_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# External Services
SENTRY_DSN=https://your_sentry_dsn.sentry.io/
```

### Deployment Commands

Deploy to production:

```shell
# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Update deployment (zero-downtime)
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Load Balancing & Scaling

### Nginx Configuration

Load balancer configuration:

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream quickdapp_backend {
        server app:3000;
        # Add more servers for scaling:
        # server app2:3000;
        # server app3:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://quickdapp_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket support
        location /ws {
            proxy_pass http://quickdapp_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://quickdapp_backend;
        }
    }
}
```

### Horizontal Scaling

Scale application containers:

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    build: .
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - NODE_ENV=production
      - WORKER_COUNT=1  # Reduce per container since we have multiple
    networks:
      - quickdapp-network
```

## Monitoring & Observability

### Container Monitoring

Monitor container health and performance:

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  app:
    # ... existing configuration
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=3000"
      - "prometheus.io/path=/metrics"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - quickdapp-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - quickdapp-network

volumes:
  prometheus_data:
  grafana_data:
```

### Logging Configuration

Centralized logging setup:

```yaml
# Add to docker-compose.prod.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=quickdapp"

  # Log aggregation
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    networks:
      - quickdapp-network

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    networks:
      - quickdapp-network
```

## Database Management

### Database Migrations

Handle database migrations in Docker:

```yaml
# docker-compose.migrate.yml
version: '3.8'

services:
  migrate:
    build: .
    command: bun run db migrate
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://quickdapp:${DB_PASSWORD}@db:5432/quickdapp
    depends_on:
      - db
    networks:
      - quickdapp-network

  db:
    # ... database configuration
```

```shell
# Run migrations
docker-compose -f docker-compose.migrate.yml --env-file .env.prod run migrate
```

### Database Backups

Automated backup solution:

```yaml
# Add to docker-compose.prod.yml
services:
  db-backup:
    image: postgres:15-alpine
    environment:
      - PGPASSWORD=${DB_PASSWORD}
    volumes:
      - ./backups:/backups
      - ./backup-script.sh:/backup-script.sh:ro
    command: |
      sh -c "
        while true; do
          sleep 86400  # 24 hours
          /backup-script.sh
        done
      "
    depends_on:
      - db
    networks:
      - quickdapp-network
```

```bash
#!/bin/bash
# backup-script.sh
BACKUP_FILE="/backups/quickdapp-$(date +%Y%m%d-%H%M%S).sql"
pg_dump -h db -U quickdapp quickdapp > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find /backups -name "quickdapp-*.sql.gz" -mtime +7 -delete
```

## Security Hardening

### Container Security

Security-focused Docker configuration:

```dockerfile
# Security-hardened Dockerfile
FROM oven/bun:1-slim

# Install security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends curl dumb-init && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user with specific UID
RUN groupadd -r -g 1001 quickdapp && \
    useradd -r -g quickdapp -u 1001 -s /sbin/nologin quickdapp

WORKDIR /app

# Copy with proper ownership
COPY --chown=quickdapp:quickdapp . .

# Set secure permissions
RUN chmod -R 755 /app && \
    chmod -R 644 /app/dist

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Switch to non-root user
USER quickdapp

EXPOSE 3000
CMD ["bun", "run", "prod"]
```

### Network Security

Secure network configuration:

```yaml
# docker-compose.secure.yml
version: '3.8'

services:
  app:
    networks:
      - frontend
      - backend
    # Only expose necessary ports
    expose:
      - "3000"

  nginx:
    networks:
      - frontend
    ports:
      - "443:443"  # Only HTTPS

  db:
    networks:
      - backend
    # No external ports exposed

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

## Troubleshooting

### Common Issues

**Container Won't Start:**
```shell
# Check container logs
docker logs quickdapp_app_1

# Run container interactively
docker run -it quickdapp:latest /bin/bash

# Check container health
docker inspect quickdapp_app_1 | grep -A 10 Health
```

**Database Connection Issues:**
```shell
# Test database connectivity
docker exec quickdapp_app_1 pg_isready -h db -p 5432

# Check network connectivity
docker exec quickdapp_app_1 ping db
```

**Performance Issues:**
```shell
# Monitor container resources
docker stats

# Check container limits
docker inspect quickdapp_app_1 | grep -A 10 Resources

# View detailed container info
docker exec quickdapp_app_1 cat /proc/meminfo
```

### Debugging Commands

```shell
# Access container shell
docker exec -it quickdapp_app_1 /bin/bash

# View container processes
docker exec quickdapp_app_1 ps aux

# Monitor container logs in real-time
docker logs -f quickdapp_app_1

# Inspect container configuration
docker inspect quickdapp_app_1

# Check container networking
docker network ls
docker network inspect quickdapp_quickdapp-network
```

Docker deployment provides a robust, scalable solution for QuickDapp applications with comprehensive monitoring, security, and management capabilities suitable for production environments.