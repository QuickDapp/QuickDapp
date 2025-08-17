# QuickDapp v3

Modern Web3 DApp development platform built with ElysiaJS, DrizzleORM, and Bun.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or higher
- Node.js v22.0.0 or higher
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
bun install
```

2. Set up your environment:
```bash
# Copy and customize environment variables
cp .env.development .env.local
```

3. Set up the database:
```bash
# Make sure PostgreSQL is running
# Create database: quickdapp_v3_dev
createdb quickdapp_v3_dev

# Generate and run migrations
bun run db:generate
bun run db:push
```

4. Start the development server:
```bash
bun run dev
```

The server will start at `http://localhost:3000` with GraphQL endpoint at `/graphql`.

## Development

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run test` - Run tests
- `bun run test:integration` - Run integration tests
- `bun run db:generate` - Generate database migrations
- `bun run db:push` - Push migrations to database
- `bun run lint` - Run linter
- `bun run lint:fix` - Fix linting issues
- `bun run format` - Format code

### Project Structure

```
src/
├── server/           # Backend server code
│   ├── db/          # Database schema and migrations
│   ├── graphql/     # GraphQL resolvers and schema
│   ├── lib/         # Shared utilities
│   └── workers/     # Background worker processes
├── shared/          # Code shared between client and server
│   └── config/      # Environment configuration
└── client/          # Frontend client code (future)
```

## Architecture

QuickDapp v3 is built with:

- **ElysiaJS**: Fast Bun-native web framework
- **DrizzleORM**: Type-safe database ORM
- **GraphQL**: API layer with GraphQL Yoga
- **PostgreSQL**: Primary database
- **Worker Processes**: Background job processing
- **WebSockets**: Real-time communication (planned)
- **TailwindCSS v4**: Styling (planned for frontend)

## Environment Configuration

See `.env.development` for all available configuration options.

Client-visible variables (exposed to frontend):
- `CHAIN` - Blockchain network
- `CHAIN_RPC_ENDPOINT` - RPC endpoint  
- `WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- `DIAMOND_PROXY_ADDRESS` - Smart contract address
- `BASE_URL` - Application base URL

All other variables are server-side only.

## License

MIT
