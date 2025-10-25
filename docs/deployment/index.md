# Deployment

QuickDapp supports two main deployment strategies: self-contained binaries and Docker containers. Both approaches are designed for simplicity and minimal server setup requirements.

## Deployment Options

### Binary Deployment (Recommended)

Self-contained executables with embedded assets:

**Advantages:**
- Minimal dependencies (no Node.js or Docker required)
- Single file deployment
- Fast startup times
- Easy to manage and backup

**Best for:**
- Simple server deployments
- VPS hosting
- Testing and staging environments

[Learn more about Binary Deployment →](./binary.md)

### Docker Deployment

Containerized deployment using pre-built binaries:

**Advantages:**
- Consistent environment across deployments
- Container orchestration support
- Easy scaling and management
- Isolated runtime environment

**Best for:**
- Cloud deployments
- Teams using containerized infrastructure
- Multi-environment setups

[Learn more about Docker Deployment →](./docker.md)

## Quick Start

### 1. Build for Production

```shell
# Build self-contained binaries (default behavior)
bun run build

# For Docker deployment
bun run build
docker build -t quickdapp:latest .
```

### 2. Setup Environment

Create production environment configuration:

```bash
# .env.production
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_ENCRYPTION_KEY=your_32_character_encryption_key
SERVER_WALLET_PRIVATE_KEY=0xYourWalletPrivateKey
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-api-key
FACTORY_CONTRACT_ADDRESS=0xYourContractAddress
```

### 3. Deploy Database

Setup your production database and run migrations:

```shell
# Run database migrations
NODE_ENV=production bun run db push
```

### 4. Deploy Application

**Binary Deployment:**
```shell
# Upload and run binary
scp dist/binaries/quickdapp-linux-x64 user@server:/opt/quickdapp/
ssh user@server
chmod +x /opt/quickdapp/quickdapp-linux-x64
NODE_ENV=production /opt/quickdapp/quickdapp-linux-x64
```

**Docker Deployment:**
```shell
# Run container
docker run -d \
  --name quickdapp \
  -p 3000:3000 \
  --env-file .env.production \
  quickdapp:latest
```

## Infrastructure Requirements

### Minimum Server Specs

**Development/Testing:**
- 1 CPU core
- 512 MB RAM
- 1 GB disk space

**Production:**
- 2 CPU cores
- 1 GB RAM
- 5 GB disk space (for logs and backups)

### Database Requirements

**PostgreSQL:**
- Version 11 or higher
- Dedicated database for the application
- Regular backups recommended

### Network Requirements

- Inbound port 3000 (or your configured port)
- Outbound HTTPS access for blockchain RPC
- Outbound access for external services (email, monitoring)

## Environment Setup

### Production Database

Use a managed PostgreSQL service for production:

**Recommended Providers:**
- DigitalOcean Managed Databases
- AWS RDS PostgreSQL  
- Railway Database
- Supabase

### SSL/TLS Termination

Use a reverse proxy for HTTPS:

**Nginx Example:**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Monitoring and Maintenance

### Health Checks

QuickDapp provides built-in health endpoints:

```shell
# Basic health check
curl http://localhost:3000/health
```

### Log Management

Configure log rotation for production:

```shell
# Using logrotate (Linux)
/opt/quickdapp/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    create 644 quickdapp quickdapp
}
```

### Backup Strategy

**Database Backups:**
```shell
# Automated database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

**Application Backups:**
```shell
# Backup binary and configuration
tar -czf quickdapp-backup-$(date +%Y%m%d).tar.gz \
  quickdapp-linux-x64 \
  .env.production
```

## Security Considerations

### Firewall Configuration

```shell
# Basic firewall setup (ufw)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp  
sudo ufw enable
```

### File Permissions

```shell
# Secure file permissions
chmod 750 quickdapp-linux-x64
chmod 640 .env.production
```

### Updates

Keep the system and application updated:

```shell
# Update server packages
sudo apt update && sudo apt upgrade -y

# Deploy new application version
# 1. Stop application
# 2. Replace binary
# 3. Run database migrations if needed
# 4. Start application
```

## Troubleshooting

### Common Issues

**Application won't start:**
- Check environment variables are set correctly
- Verify database connectivity
- Check port availability

**Database connection errors:**
- Verify DATABASE_URL format
- Check database server is running
- Test connectivity from server

**Performance issues:**
- Monitor resource usage with `htop`
- Check database query performance
- Review application logs

### Getting Help

Check logs for error details:

```shell
# Binary deployment
tail -f quickdapp.log

# Docker deployment  
docker logs quickdapp
```

QuickDapp's deployment options provide flexibility while maintaining simplicity for most use cases.
