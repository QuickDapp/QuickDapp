# Binary Deployment

QuickDapp builds self-contained binary executables that include all dependencies and assets. This simplifies deployment by eliminating runtime dependencies.

## Building Binaries

Create self-contained executables:

```shell
# Build binaries for all supported platforms (default behavior)
bun run build

# Binaries are created in dist/binaries/
ls dist/binaries/
# quickdapp-linux-x64
# quickdapp-darwin-x64  
# quickdapp-windows-x64.exe
```

Each binary contains:
- Compiled server code with embedded frontend assets
- All required dependencies and runtime
- Static files (images, CSS, JavaScript)

## Running Binaries

### Basic Execution

```shell
# Linux/macOS
chmod +x dist/binaries/quickdapp-linux-x64
./dist/binaries/quickdapp-linux-x64

# Windows
dist\binaries\quickdapp-windows-x64.exe
```

### Environment Configuration

Set environment variables before running:

```shell
# Linux/macOS - inline environment variables
DATABASE_URL="postgresql://user:pass@host:5432/db" \
CHAIN=sepolia \
FACTORY_CONTRACT_ADDRESS="0x..." \
./dist/binaries/quickdapp-linux-x64
```

Or use environment files:

```bash
# .env.production
DATABASE_URL=postgresql://user:password@host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_secure_32_character_key
SERVER_WALLET_PRIVATE_KEY=0xYourWalletKey
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/your-key
FACTORY_CONTRACT_ADDRESS=0xYourContractAddress
```

```shell
# Run with environment file
NODE_ENV=production ./dist/binaries/quickdapp-linux-x64
```

## Server Deployment

### Simple Upload and Run

```shell
# 1. Upload binary to server
scp dist/binaries/quickdapp-linux-x64 user@server:/opt/quickdapp/

# 2. Upload environment configuration
scp .env.production user@server:/opt/quickdapp/.env

# 3. SSH to server and run
ssh user@server
cd /opt/quickdapp
chmod +x quickdapp-linux-x64
NODE_ENV=production ./quickdapp-linux-x64
```

### Background Process

Run as a background service:

```shell
# Using nohup
nohup NODE_ENV=production ./quickdapp-linux-x64 > quickdapp.log 2>&1 &

# Check if running
ps aux | grep quickdapp

# Stop the process
pkill quickdapp-linux-x64
```

## Platform-Specific Notes

### Linux Deployment

Most common for production servers:

```shell
# Make executable
chmod +x quickdapp-linux-x64

# Run directly
./quickdapp-linux-x64
```

### macOS Deployment

For macOS servers or development:

```shell
# Make executable
chmod +x quickdapp-darwin-x64

# Run (may require security approval on first run)
./quickdapp-darwin-x64

# If blocked by security
xattr -d com.apple.quarantine quickdapp-darwin-x64
```

### Windows Deployment

For Windows servers:

```cmd
REM Run directly
quickdapp-windows-x64.exe

REM With environment variables
set DATABASE_URL=postgresql://...
set NODE_ENV=production
quickdapp-windows-x64.exe
```

## Performance Optimization

### Environment Settings

Optimize binary performance with environment variables:

```bash
# Limit memory usage
NODE_OPTIONS="--max-old-space-size=1024"

# Scale workers to CPU count
WORKER_COUNT=cpus

# Optimize database connections
DATABASE_POOL_SIZE=20
```

## Health Monitoring

Binaries include built-in health endpoints:

```shell
# Basic health check
curl http://localhost:3000/health
# {"status":"ok","version":"1.0.0","timestamp":"..."}
```

## Security

Basic security practices for binary deployment:

```shell
# Set proper file permissions
chmod 750 quickdapp-linux-x64  # Owner execute, group read
chmod 640 .env                 # Owner read/write, group read

# Create dedicated user (optional)
sudo useradd -r -s /bin/false quickdapp
sudo chown quickdapp:quickdapp quickdapp-linux-x64
sudo -u quickdapp ./quickdapp-linux-x64
```

## Troubleshooting

### Common Issues

**Binary won't start:**
```shell
# Check if executable
ls -la quickdapp-linux-x64

# Make executable if needed
chmod +x quickdapp-linux-x64
```

**Environment issues:**
```shell
# Verify required environment variables
echo $DATABASE_URL
echo $SESSION_ENCRYPTION_KEY

# Test with minimal environment
DATABASE_URL="postgresql://..." \
SESSION_ENCRYPTION_KEY="32_character_key" \
./quickdapp-linux-x64
```

**Port conflicts:**
```shell
# Check what's using the port
lsof -i :3000

# Use different port
PORT=3001 ./quickdapp-linux-x64
```

**Memory issues:**
```shell
# Monitor memory usage
ps -o pid,vsz,rss,comm -p $(pgrep quickdapp)

# Increase memory limit
NODE_OPTIONS="--max-old-space-size=2048" ./quickdapp-linux-x64
```

Binary deployment provides the simplest way to deploy QuickDapp with minimal server setup and maximum portability.
