---
order: 100
label: dev
---


# dev


This command:

* Starts the ElysiaJS backend server on port 3000
* Launches the Vite frontend development server on port 5173
* Initializes worker processes for background jobs
* Sets up database connections and WebSocket support
* Enables hot reload for both client and server code

Usage:

```shell
bun run dev
```

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

### Hot Reload System

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

Vite provides instant hot module replacement for the frontend:

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

