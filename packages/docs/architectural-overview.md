---
order: 96
icon: Layers
---

# Architectural overview

QuickDapp follows a modern, clean architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                          QuickDapp                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                    │
│  ├── React + TypeScript                                     │
│  ├── GraphQL Client (React Query)                           │
│  └── WebSocket Client                                       │
├─────────────────────────────────────────────────────────────┤
│  Backend (Bun + ElysiaJS)                                   │
│  ├── ElysiaJS Server                                        │
│  ├── GraphQL Yoga API                                       │
│  ├── JWT Authentication                                     │
│  ├── WebSocket Server                                       │
│  └── Static Asset Serving                                   │
├─────────────────────────────────────────────────────────────┤
│  Worker System (Child Processes)                            │
│  ├── Background Job Processing                              │
│  ├── Cron Job Scheduling                                    │
│  └── IPC Communication                                      │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (DrizzleORM + PostgreSQL)                   │
│  ├── Type-safe SQL Queries                                  │
│  ├── Schema Migrations                                      │
│  └── Connection Pooling                                     │
├─────────────────────────────────────────────────────────────┤
│  Variant-specific Layers (Optional)                         │
│  └── e.g. Web3: Blockchain Clients, Contract Interactions   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── server/              # Backend server code
│   ├── db/             # Database schema, migrations, and queries
│   ├── graphql/        # GraphQL resolvers and schema
│   ├── auth/           # Authentication (email, OAuth)
│   ├── workers/        # Background job system
│   ├── lib/            # Server utilities (logging, errors, etc.)
│   └── ws/             # WebSocket implementation
├── client/             # Frontend React application
│   ├── components/     # React components
│   ├── contexts/       # Theme, Auth, Socket contexts
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Client-side utilities
│   └── pages/          # Application pages
├── shared/             # Code shared between client/server
│   ├── config/         # Environment configuration
│   └── graphql/        # GraphQL schema definitions
scripts/                # Build and development scripts
tests/                  # Integration test suite
```


## Configuration Management

QuickDapp uses a layered configuration system using [environment variables](./environment-variables.md).

## Development Workflow

During local development:

* Both frontend and backend restart automatically when code changes.
* A GraphQL playground UI is available at `/graphql` in the browser.

For production builds:

* Self-contained executables are built from the code, meaning you can port and run your web app anywhere without needing to install dependencies.
    * Frontend assets embedded in server
* Container-based deployment with Docker.

