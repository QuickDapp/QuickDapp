# QuickDapp

[![CI](https://github.com/QuickDapp/QuickDapp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/QuickDapp/QuickDapp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

QuickDapp is a highly opinionated modern web application boilerplate with built-in Web3 support. Built with TypeScript, PostgreSQL, and a modern tech stack—with optional blockchain integration for Web3 applications.

## Features

- **Modern Tech Stack**: Bun runtime, ElysiaJS web framework, PostgreSQL with DrizzleORM
- **GraphQL API**: Schema-first GraphQL API with authentication
- **Background Workers**: Job processing with cron scheduling support
- **Flexible Authentication**: JWT authentication with optional SIWE (Sign-in with Ethereum)
- **Comprehensive Testing**: Full integration test suite
- **Hot Reload Development**: Fast development cycle with hot reload
- **Built-in Web3 Support**: Optional RainbowKit, Wagmi, Viem integration for blockchain apps
- **Fully documented**: See `docs/` folder or https://docs.quickdapp.xyz

## Tech Stack

### Core
- **[Bun](https://bun.sh)** + **[ElysiaJS](https://elysiajs.com)** + **[TypeScript](https://www.typescriptlang.org)** - Runtime, web framework, and type-safe development
- **[PostgreSQL](https://www.postgresql.org)** + **[DrizzleORM](https://orm.drizzle.team)** + **[DrizzleKit](https://orm.drizzle.team/kit-docs/overview)** - Database with type-safe toolkit and migrations
- **[GraphQL](https://graphql.org)** + **[GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)** + **[GraphQL Tools](https://the-guild.dev/graphql/tools)** - Schema-first API with server and utilities
- **[React](https://react.dev)** + **[React Router](https://reactrouter.com)** + **[TailwindCSS](https://tailwindcss.com)** + **[Vite](https://vitejs.dev)** + **[Radix UI](https://www.radix-ui.com)** - Frontend UI library with routing, styling, bundling, and components
- **[Biome](https://biomejs.dev)** + **[Husky](https://typicode.github.io/husky/)** + **[Docker](https://www.docker.com)** + **[Retype](https://retype.com)** - Development tooling for linting, git hooks, containerization, and docs
- **[Commander](https://github.com/tj/commander.js)** + **[cron-schedule](https://github.com/harrisiirak/cron-schedule)** + **[JOSE](https://github.com/panva/jose)** + **[TanStack Query](https://tanstack.com/query)** - CLI framework, job scheduling, JWT handling, and data fetching

### Web3 (Optional)
- **[RainbowKit](https://www.rainbowkit.com)** + **[Wagmi](https://wagmi.sh)** + **[Viem](https://viem.sh)** + **[SIWE](https://login.xyz)** + **[WalletConnect](https://walletconnect.com)** - Wallet integration and blockchain authentication

## Prerequisites

- **Node.js** v22.0.0 or higher
- **Bun** v1.0.0 or higher
- **PostgreSQL** 14+ running locally
- **Git**

## Quick Start

### 1. Setup PostgreSQL Database

Create the development database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create development database
CREATE DATABASE quickdapp_dev;
\q
```

Update the database connection in `.env.local` if your PostgreSQL setup differs:

```env
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_dev
```

### 2. Install Dependencies

```bash
bun install
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 3. Setup Database Schema

```bash
bun run db push
```

### 4. Start Development Server

```bash
bun run dev
```

The application will be available at **http://localhost:5173**

To get help on available options:

```bash
bun run dev -h
```

### Optional: Web3 Setup

If building a Web3 application, you can also set up the local blockchain:

```bash
# In a separate terminal, start local blockchain
bun run sample-contracts/devnet.ts

# Deploy sample ERC-20 contracts (optional example)
bun run sample-contracts/deploy.ts
```

## Production

### Build for Production

```bash
bun run build
```

### Run Production Server

```bash
# Run server with client being served (default)
bun run prod

# Run client preview server only
bun run prod client
```

The production server will serve both the API and the built client application. For testing the client build separately, use the `client` subcommand which runs Vite's preview server.

## Testing

### Setup Test Database

Create the test database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE quickdapp_test;
\q
```

Update the test database connection in `.env.test` if needed:

```env
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_test
```

### Run Tests

```bash
bun run test
```

The test suite automatically:
- Sets up a clean test database before each test
- Starts a blockchain instance when running Web3-related tests
- Provides comprehensive integration testing

To get help on available options:

```bash
bun run test -h
```


### Test Specific Files

```bash
bun run test --pattern "blockchain"
bun run test --test-file tests/integration/server.test.ts
```

## Development Workflow


### Available Scripts

```bash
# Development
bun run dev            # Start development server with hot reload
bun run build          # Build for production

# Code Generation
bun run gen            # Generate types and database migrations

# Database
bun run db push        # Push schema changes to database
bun run db migrate     # Run migrations (production)

# Testing
bun run test           # Run all tests
bun run test --watch   # Run tests in watch mode

# Code Quality
bun run lint           # Run Biome linter
bun run lint:fix       # Fix linting issues
bun run format         # Format code with Biome
```

### Getting Help

- Review test files for usage examples
- Use `bun run dev -v` for detailed startup logging

## Documentation

View comprehensive documentation:

```bash
bun run showdocs
```

This starts a local documentation server using [Retype](https://retype.com). The complete documentation is available in the `docs/` folder.

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.
