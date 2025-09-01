# Dev

The QuickDapp development server provides a complete development environment with hot reloading, integrated frontend and backend servers, and comprehensive debugging capabilities.

## Starting Development Server

### Basic Usage

Start the development environment:

```shell
bun run dev
```

This command:
* Starts the ElysiaJS backend server on port 3000
* Launches the Vite frontend development server on port 5173
* Initializes worker processes for background jobs
* Sets up database connections and WebSocket support
* Enables hot reload for both client and server code

### Verbose Mode

Enable detailed startup logging:

```shell
bun run dev --verbose
```

Shows detailed information about:
* Environment variable loading
* Database connection status
* Worker process initialization
* Server startup sequence
* Available endpoints and routes

## Development Server Architecture

### Multi-Process Setup

The dev server runs multiple processes in parallel:

```
┌─────────────────────────────────────────┐
│  Development Environment                │
├─────────────────────────────────────────┤
│  Backend (Port 3000)                    │
│  ├── ElysiaJS Server                    │
│  ├── GraphQL Endpoint (/graphql)       │
│  ├── WebSocket Server (/ws)            │
│  └── Static File Serving               │
├─────────────────────────────────────────┤
│  Frontend (Port 5173)                  │
│  ├── Vite Dev Server                   │
│  ├── React Hot Reload                  │
│  ├── TypeScript Compilation           │
│  └── Proxy to Backend                  │
├─────────────────────────────────────────┤
│  Worker Processes                      │
│  ├── Job Processing                    │
│  ├── Blockchain Monitoring             │
│  └── Cron Tasks                        │
└─────────────────────────────────────────┘
```

### Port Configuration

Default port assignments:
* **Backend Server**: 3000
* **Frontend Dev Server**: 5173 (proxied through backend)
* **WebSocket**: Same as backend (3000/ws)

Override ports via environment variables:
```shell
PORT=4000 bun run dev              # Backend on port 4000
FRONTEND_PORT=3001 bun run dev     # Frontend on port 3001
```

## Hot Reload System

### Backend Hot Reload

The backend supports hot reloading for most changes:

**Automatic Reload:**
* GraphQL resolvers
* Route handlers
* Utility functions
* Configuration changes
* Environment variable updates

**Manual Restart Required:**
* Database schema changes
* Worker job definitions
* Server bootstrap logic
* Package.json changes

### Frontend Hot Reload

Vite provides instant hot module replacement:

**Instant Updates:**
* React components
* CSS/Tailwind classes
* TypeScript files
* Hook dependencies
* GraphQL queries

**Browser Refresh Triggered:**
* Route changes
* Context provider changes
* Main App component updates

## Development Configuration

### Environment Files

Development uses layered environment configuration:

```shell
# Load order (later overrides earlier)
.env                    # Base configuration
.env.development        # Development-specific settings
.env.development.local  # Personal dev overrides
.env.local              # General local overrides
```

### Development-Specific Settings

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_dev

# Development wallet (Anvil default)
SERVER_WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Local blockchain
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545

# Reduced worker count for development
WORKER_COUNT=1

# Enable development features
GRAPHQL_PLAYGROUND=true
```

## Debugging Features

### Server Debugging

Enable debug logging for different components:

```shell
# Debug all components
LOG_LEVEL=debug WORKER_LOG_LEVEL=debug bun run dev

# Debug specific modules
DEBUG=graphql,auth,worker bun run dev
```

### Database Debugging

Monitor database queries during development:

```shell
# Enable query logging
DATABASE_LOG_QUERIES=true bun run dev

# Show slow queries
DATABASE_SLOW_QUERY_THRESHOLD=100 bun run dev
```

### Worker Debugging

Debug background job processing:

```shell
# Verbose worker logging
WORKER_LOG_LEVEL=debug bun run dev

# Single worker for easier debugging
WORKER_COUNT=1 bun run dev
```

## Development Workflow

### Typical Development Session

1. **Start Services**
   ```shell
   # Terminal 1: Start local blockchain (if needed)
   cd sample-contracts && bun devnet.ts
   
   # Terminal 2: Start QuickDapp
   bun run dev --verbose
   ```

2. **Make Changes**
   * Edit React components → Hot reload in browser
   * Update GraphQL resolvers → Server restarts automatically
   * Modify database schema → Run `bun run db push`

3. **Test Changes**
   * Frontend changes visible immediately
   * Backend changes after brief restart
   * Use browser dev tools for debugging

### Database Development

Work with database changes during development:

```shell
# Apply schema changes to development database
bun run db push

# Generate migration for schema changes
bun run db generate

# Reset development database (destructive)
bun run db push --force
```

### Testing During Development

Run tests alongside development:

```shell
# Run tests in watch mode
bun run test --watch

# Run specific test file
bun run test --pattern auth

# Debug test with verbose logging
LOG_LEVEL=debug bun run test
```

## Common Development Tasks

### Adding New Routes

1. **Backend Route**
   ```typescript
   // src/server/start-server.ts
   app.get('/api/custom', () => {
     return { message: 'Custom endpoint' }
   })
   ```

2. **Frontend Route**
   ```typescript
   // src/client/App.tsx
   <Route path="/custom" element={<CustomPage />} />
   ```

3. **GraphQL Operation**
   ```typescript
   // src/server/graphql/resolvers.ts
   export const resolvers = {
     Query: {
       customData: () => ({ data: 'Custom data' })
     }
   }
   ```

### Environment Variable Changes

1. Update `.env` or `.env.development`
2. Restart dev server to pick up changes
3. Update TypeScript types if needed:
   ```typescript
   // src/shared/config/server.ts
   export const serverConfig = {
     CUSTOM_SETTING: get('CUSTOM_SETTING').asString()
   }
   ```

### Adding Dependencies

1. **Install Package**
   ```shell
   bun add package-name
   # or for dev dependency
   bun add -d package-name
   ```

2. **Restart Dev Server**
   ```shell
   # Stop with Ctrl+C, then restart
   bun run dev
   ```

## Performance Optimization

### Development Performance Tips

1. **Reduce Worker Count**
   ```shell
   WORKER_COUNT=1 bun run dev  # Instead of default
   ```

2. **Limit Database Logging**
   ```bash
   # Only in .env.development if needed
   DATABASE_LOG_QUERIES=false
   ```

3. **Use Incremental TypeScript**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true
     }
   }
   ```

4. **Optimize Vite Configuration**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     server: {
       hmr: { overlay: false }, // Disable error overlay if needed
     }
   })
   ```

## Troubleshooting

### Common Issues

**Port Already in Use**
```shell
# Kill processes on default ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Or use different ports
PORT=3001 bun run dev
```

**Database Connection Issues**
```shell
# Check PostgreSQL is running
brew services list | grep postgresql

# Reset database connection
bun run db push --force
```

**Hot Reload Not Working**
```shell
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
bun run dev
```

**Worker Process Errors**
```shell
# Debug worker startup
WORKER_LOG_LEVEL=debug WORKER_COUNT=1 bun run dev
```

### Debug Information

Get system information for troubleshooting:

```shell
# Check versions
bun --version

# Check database connection
psql -U postgres -c "SELECT version();"

# Check ports in use
lsof -i :3000
lsof -i :5173
```

The development server in QuickDapp provides a comprehensive environment for building and testing your dapp with excellent developer experience and debugging capabilities.