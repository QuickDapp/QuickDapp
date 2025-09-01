# Binary

QuickDapp supports building self-contained binary executables that include all dependencies and assets, making deployment simple and reliable. This approach eliminates the need for runtime installations and provides consistent execution across different environments.

## Binary Build Process

### Creating Binaries

Build self-contained executables:

```shell
# Build binaries for all supported platforms
bun run build --binary

# Binaries are created in dist/binaries/
ls dist/binaries/
# quickdapp-linux-x64
# quickdapp-darwin-x64  
# quickdapp-windows-x64.exe
```

The build process creates:
* **Linux x64** - For most cloud deployments and servers
* **macOS x64** - For local development and macOS servers
* **Windows x64** - For Windows servers and development

### What's Included in Binaries

Each binary contains:
* **Compiled server code** - All backend functionality
* **Frontend assets** - Optimized HTML, CSS, JavaScript bundles
* **Static assets** - Images, fonts, and other resources
* **Node.js runtime** - Embedded runtime environment
* **Dependencies** - All required Bun packages and dependencies

## Running Binaries

### Basic Execution

Run the binary directly:

```shell
# Linux/macOS
./dist/binaries/quickdapp-linux-x64

# Windows
dist\binaries\quickdapp-windows-x64.exe

# Make executable (Linux/macOS)
chmod +x dist/binaries/quickdapp-linux-x64
./dist/binaries/quickdapp-linux-x64
```

### Environment Configuration

Binaries read configuration from environment variables:

```shell
# Run with environment variables
DATABASE_URL="postgresql://user:pass@host:5432/db" \
CHAIN=sepolia \
FACTORY_CONTRACT_ADDRESS="0x..." \
./dist/binaries/quickdapp-linux-x64

# Or use environment file
NODE_ENV=production ./dist/binaries/quickdapp-linux-x64
```

### Environment File Support

Create environment files for different environments:

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_secure_32_character_key
SERVER_WALLET_PRIVATE_KEY=0xYourProductionWallet
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-key
FACTORY_CONTRACT_ADDRESS=0xYourContractAddress
WORKER_COUNT=cpus
LOG_LEVEL=info
```

## Deployment Strategies

### Simple Server Deployment

Deploy to a single server:

```shell
# 1. Upload binary to server
scp dist/binaries/quickdapp-linux-x64 user@server:/opt/quickdapp/

# 2. Upload environment file
scp .env.production user@server:/opt/quickdapp/.env

# 3. SSH to server and run
ssh user@server
cd /opt/quickdapp
chmod +x quickdapp-linux-x64
NODE_ENV=production ./quickdapp-linux-x64
```

### Systemd Service

Create a systemd service for Linux servers:

```ini
# /etc/systemd/system/quickdapp.service
[Unit]
Description=QuickDapp Web3 Application
After=network.target
Wants=network.target

[Service]
Type=simple
User=quickdapp
Group=quickdapp
WorkingDirectory=/opt/quickdapp
ExecStart=/opt/quickdapp/quickdapp-linux-x64
Environment=NODE_ENV=production
EnvironmentFile=/opt/quickdapp/.env
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=quickdapp

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/quickdapp

[Install]
WantedBy=multi-user.target
```

```shell
# Install and start service
sudo systemctl daemon-reload
sudo systemctl enable quickdapp
sudo systemctl start quickdapp

# Check status
sudo systemctl status quickdapp

# View logs
sudo journalctl -u quickdapp -f
```

### PM2 Process Manager

Use PM2 for process management:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'quickdapp',
    script: './dist/binaries/quickdapp-linux-x64',
    instances: 1,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

```shell
# Install PM2 globally
bun add -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs
pm2 monit
```

## Cross-Platform Considerations

### Linux Deployment

Most common for production servers:

```shell
# Ubuntu/Debian
sudo apt update && sudo apt install -y curl

# CentOS/RHEL
sudo yum install -y curl

# Alpine Linux (minimal)
apk add --no-cache curl

# Run binary
./quickdapp-linux-x64
```

### macOS Deployment

For macOS servers or development:

```shell
# Make executable
chmod +x quickdapp-darwin-x64

# Run (may require security permissions)
./quickdapp-darwin-x64

# If blocked by macOS security:
xattr -d com.apple.quarantine quickdapp-darwin-x64
```

### Windows Deployment

For Windows servers:

```cmd
REM Run directly
quickdapp-windows-x64.exe

REM With environment file
set NODE_ENV=production
quickdapp-windows-x64.exe

REM As Windows service (requires additional tools)
nssm install QuickDapp "C:\path\to\quickdapp-windows-x64.exe"
nssm set QuickDapp AppDirectory "C:\path\to"
nssm set QuickDapp AppEnvironmentExtra NODE_ENV=production
nssm start QuickDapp
```

## Performance Optimization

### Binary Optimization

Binaries are optimized during build:

```typescript
// Build optimization includes:
// - Code minification
// - Asset compression
// - Tree shaking unused code
// - Bundle splitting for optimal loading
// - Gzip compression for static assets
```

### Runtime Performance

Optimize binary runtime performance:

```bash
# Environment variables for performance
NODE_OPTIONS="--max-old-space-size=1024"  # Limit memory
WORKER_COUNT=cpus                          # Scale workers to CPU count
DATABASE_POOL_SIZE=20                      # Optimize database connections
```

### Resource Monitoring

Monitor binary resource usage:

```shell
# Monitor with htop
htop -p $(pgrep quickdapp)

# Monitor with ps
ps aux | grep quickdapp

# Memory usage
ps -o pid,vsz,rss,comm -p $(pgrep quickdapp)

# Network connections
netstat -tulpn | grep quickdapp
```

## Health Monitoring

### Health Check Endpoints

Binaries include built-in health monitoring:

```shell
# Basic health check
curl http://localhost:3000/health
# {"status":"ok","version":"1.0.0","timestamp":"..."}

# Detailed status
curl http://localhost:3000/status
# {
#   "status": "ok",
#   "database": "connected", 
#   "workers": 4,
#   "uptime": 3600,
#   "memory": {...}
# }
```

### External Monitoring

Integrate with monitoring systems:

```shell
# Prometheus metrics endpoint
curl http://localhost:3000/metrics

# Custom health check script
#!/bin/bash
if curl -f -s http://localhost:3000/health > /dev/null; then
  echo "QuickDapp is healthy"
  exit 0
else
  echo "QuickDapp is unhealthy"
  exit 1
fi
```

## Backup and Recovery

### Binary Backup Strategy

```shell
# Backup binary and configuration
tar -czf quickdapp-backup-$(date +%Y%m%d).tar.gz \
  quickdapp-linux-x64 \
  .env \
  ecosystem.config.js

# Database backup (separate)
pg_dump $DATABASE_URL > quickdapp-db-$(date +%Y%m%d).sql
```

### Disaster Recovery

```shell
# Recovery process
# 1. Restore binary and config
tar -xzf quickdapp-backup-20240101.tar.gz

# 2. Restore database
psql $DATABASE_URL < quickdapp-db-20240101.sql

# 3. Start application
./quickdapp-linux-x64
```

## Security Considerations

### Binary Security

Security practices for binary deployment:

**File Permissions:**
```shell
# Secure file permissions
chmod 750 quickdapp-linux-x64  # Owner read/write/execute, group read/execute
chmod 640 .env                 # Owner read/write, group read
```

**User Isolation:**
```shell
# Create dedicated user
sudo useradd -r -s /bin/false -d /opt/quickdapp quickdapp

# Set ownership
sudo chown -R quickdapp:quickdapp /opt/quickdapp

# Run as dedicated user
sudo -u quickdapp ./quickdapp-linux-x64
```

**Network Security:**
```shell
# Firewall configuration (ufw example)
sudo ufw allow 3000/tcp     # QuickDapp port
sudo ufw enable

# Or specific source IPs
sudo ufw allow from 10.0.0.0/8 to any port 3000
```

## Troubleshooting

### Common Issues

**Binary Won't Start:**
```shell
# Check file permissions
ls -la quickdapp-linux-x64

# Make executable
chmod +x quickdapp-linux-x64

# Check dependencies (rare with binaries)
ldd quickdapp-linux-x64
```

**Environment Issues:**
```shell
# Verify environment variables
env | grep NODE_ENV
env | grep DATABASE_URL

# Test with minimal environment
NODE_ENV=production \
DATABASE_URL="postgresql://..." \
./quickdapp-linux-x64
```

**Port Issues:**
```shell
# Check if port is in use
lsof -i :3000

# Use different port
PORT=3001 ./quickdapp-linux-x64
```

**Memory Issues:**
```shell
# Monitor memory usage
watch 'ps -o pid,vsz,rss,comm -p $(pgrep quickdapp)'

# Increase memory limit
NODE_OPTIONS="--max-old-space-size=2048" ./quickdapp-linux-x64
```

### Debugging Binary Issues

```shell
# Run with debug output
DEBUG=* ./quickdapp-linux-x64

# Verbose logging
LOG_LEVEL=debug ./quickdapp-linux-x64

# System calls trace (Linux)
strace -e trace=network ./quickdapp-linux-x64

# macOS equivalent
dtruss -fn quickdapp-darwin-x64
```

Binary deployment provides the simplest and most reliable way to deploy QuickDapp applications with minimal dependencies and maximum portability across different server environments.