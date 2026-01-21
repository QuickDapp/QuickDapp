# QuickDapp Web3

A highly opinionated framework for building Web3 dapps with comprehensive blockchain integration.

## Features

- **Wallet Auth**: Sign-In with Ethereum (SIWE)
- **Wallet Connect**: RainbowKit + WalletConnect integration
- **Smart Contracts**: Viem + Wagmi for contract interactions
- **Chain Support**: Multi-chain with configurable networks
- **Database**: PostgreSQL with DrizzleORM
- **API**: GraphQL Yoga with schema-first approach
- **Frontend**: React 19 with TailwindCSS
- **Server**: ElysiaJS with Bun runtime
- **Background Jobs**: Chain watchers and workers

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Start PostgreSQL
docker-compose up -d postgres

# Push database schema
bun run db push

# Generate types
bun run gen

# Start development server
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run prod` | Run production server |
| `bun run test` | Run tests |
| `bun run gen` | Generate types and migrations |
| `bun run db push` | Push schema to database |
| `bun run lint` | Run linter |

## Sample Contracts

See [sample-contracts/](./sample-contracts/) for example Solidity contracts and local blockchain setup.

## Documentation

See [quickdapp.xyz](https://quickdapp.xyz) for full documentation.

## License

MIT
