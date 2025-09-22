# QuickDapp

A modern Web3 dapp development platform built with TypeScript, PostgreSQL, and comprehensive blockchain integration.

## Features

- **Full-Stack Web3 Development**: Complete dapp development environment with blockchain integration
- **Modern Tech Stack**: Bun runtime, ElysiaJS web framework, PostgreSQL with DrizzleORM
- **GraphQL API**: Schema-first GraphQL API with authentication
- **Background Workers**: Job processing with cron scheduling support
- **Wallet Authentication**: SIWE (Sign-in with Ethereum) + JWT authentication
- **Comprehensive Testing**: Full integration test suite with blockchain simulation
- **Hot Reload Development**: Fast development cycle with hot reload

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
```

### 3. Setup Database Schema

```bash
bun run db push
```

### 4. Start Local Blockchain

In a **separate terminal**, start the local blockchain:

```bash
bun run sample-contracts/devnet.ts
```

This will start a Hardhat node on `http://localhost:8545` with:
- Chain ID: 31337
- Block time: 1 second
- 10 pre-funded test accounts

### 5. Deploy Sample Contracts

```bash
bun run sample-contracts/deploy.ts
```

### 6. Start Development Server

```bash
bun run dev
```

The application will be available at **http://localhost:5173**

To get help on available options:

```bash
bun run dev -h
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
- Starts its own blockchain instance (Hardhat node)
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

# Database
bun run db:generate    # Generate DrizzleORM migrations
bun run db:push        # Push schema changes to database
bun run db:migrate     # Run migrations (production)

# Testing
bun run test           # Run all tests
bun run test --watch   # Run tests in watch mode

# Code Quality
bun run lint           # Run Biome linter
bun run lint:fix       # Fix linting issues
bun run format         # Format code with Biome
```


## Architecture

### Key Technologies

- **Runtime**: Bun (primary) + Node.js v22+ compatibility
- **Web Framework**: ElysiaJS (Bun-native high performance)
- **Database**: PostgreSQL with DrizzleORM
- **GraphQL**: GraphQL Yoga with schema-first approach
- **Authentication**: SIWE (Sign-in with Ethereum) + JWT
- **Testing**: Bun test runner with Hardhat blockchain simulation
- **Linting**: Biome (replaces ESLint/Prettier)

### Environment Configuration

The project uses layered environment configuration:

1. `.env` - Base configuration (committed)
2. `.env.{NODE_ENV}` - Environment-specific overrides
3. `.env.local` - Developer-specific overrides (gitignored)

## Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/quickdapp_dev

# Security
SESSION_ENCRYPTION_KEY=your-32-char-encryption-key
SERVER_WALLET_PRIVATE_KEY=0x...

# Blockchain
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://...
WALLETCONNECT_PROJECT_ID=your-project-id
DIAMOND_PROXY_ADDRESS=0x...

# Application
BASE_URL=http://localhost:3000
```

## Troubleshooting

### Common Issues

**Database Connection Issues**
- Ensure PostgreSQL is running
- Check connection string in `.env`
- Verify database exists

**Blockchain Connection Issues**
- Ensure devnet is running: `bun run sample-contracts/devnet.ts`
- Check if port 8545 is available
- Verify contracts are deployed

**Test Failures**
- Ensure test database exists and is accessible
- Check that no other services are using test ports
- Run tests with `-v` for detailed output

### Getting Help

- Review test files for usage examples
- Use `bun run dev -v` for detailed startup logging

## License

Private project - All rights reserved.
