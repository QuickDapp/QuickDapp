---
order: 96
---


# Architecture Layout

## High-level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     QuickDapp                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                  │
│  ├── React 19 + TypeScript                                │
│  ├── RainbowKit + Wagmi (Web3)                           │
│  ├── GraphQL Client (React Query)                        │
│  └── WebSocket Client                                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (Bun + ElysiaJS)                                 │
│  ├── ElysiaJS Server                                     │
│  ├── GraphQL Yoga API                                    │
│  ├── SIWE Authentication                                 │
│  ├── WebSocket Server                                    │
│  └── Static Asset Serving                                │
├─────────────────────────────────────────────────────────────┤
│  Worker System (Child Processes)                          │
│  ├── Background Job Processing                           │
│  ├── Cron Job Scheduling                                 │
│  ├── Blockchain Monitoring                               │
│  └── IPC Communication                                   │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (DrizzleORM + PostgreSQL)                 │
│  ├── Type-safe SQL Queries                               │
│  ├── Schema Migrations                                   │
│  └── Connection Pooling                                  │
├─────────────────────────────────────────────────────────────┤
│  Blockchain Layer (Viem)                                  │
│  ├── Public Client (Read Operations)                     │
│  ├── Wallet Client (Write Operations)                    │
│  └── Contract Interactions                               │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── server/             # Backend server code
├── client/             # Frontend React application
├── shared/             # Code shared between client/server
scripts/                # Build and development scripts
tests/                  # Integration test suite
dist/                   # Production build output
sample-contracts/       # Sample smart contracts for default demo app
docs/                   # This documentation
```

