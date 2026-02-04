# QuickDapp Web3

Production-ready boilerplate for vibe coders building onchain.

QuickDapp Web3 gives you a batteries-included full-stack TypeScript foundation with comprehensive blockchain integration — wallet authentication, smart contract tooling, and chain monitoring — on top of the same auth, database, GraphQL API, background workers, and polished React frontend as the base package.

## Features

**Backend:** TypeScript, Bun, ElysiaJS, PostgreSQL + Drizzle ORM, GraphQL Yoga, WebSockets
**Frontend:** React 19, TailwindCSS, Radix UI, React Query, dark/light theme
**Auth:** Sign-In with Ethereum (SIWE), email/password, OAuth (Google, GitHub, etc.)
**Web3:** RainbowKit + WalletConnect, Viem + Wagmi, multi-chain support, chain watchers
**Infrastructure:** Background workers with cron, Docker deployment, single-executable binary builds

## Getting Started

### CLI (recommended)

```bash
bunx @quickdapp/cli create my-project --variant web3

# npx works too
npx @quickdapp/cli create my-project --variant web3
```

### Manual setup

```bash
# Terminal 1: Start PostgreSQL (keep running)
docker-compose up postgres

# Terminal 2: Run these commands
bun install
cp .env.example .env
bun run db push
bun run gen
bun run dev
```

## Web3 Configuration

After completing the Quick Start, configure Web3-specific settings:

### 1. Deploy the Factory Contract

The token management features require a deployed factory contract.

The project root `.env` has `WEB3_FACTORY_CONTRACT_ADDRESS` pre-configured with the deterministic address that `sample-contracts` deploys to on a fresh local Anvil devnet.

Run these commands in separate terminals alongside your QuickDapp dev server:

```bash
# Terminal 3: Start local blockchain (keep running)
cd sample-contracts
bun devnet.ts

# Terminal 4: Deploy contracts (run once after devnet starts)
cd sample-contracts
bun run deploy
```

If you redeploy on the same devnet instance or deploy to a different address on-chain, create `.env.local` in the project root and set the correct address:

```
WEB3_FACTORY_CONTRACT_ADDRESS=0x... (your deployed address)
```

The deployed address is written to `sample-contracts/deployed.txt` after each deployment.

### 2. Configure SIWE Origins

For wallet authentication to work, add your frontend URL to allowed SIWE origins.

For development (Vite runs on port 5173):
```
WEB3_ALLOWED_SIWE_ORIGINS=http://localhost:3000,http://localhost:5173
```

For production, add your actual domain:
```
WEB3_ALLOWED_SIWE_ORIGINS=https://yourdomain.com
```

### 3. WalletConnect Project ID

Get a free project ID from [WalletConnect Cloud](https://cloud.walletconnect.com):

```
WEB3_WALLETCONNECT_PROJECT_ID=your_project_id
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

- [Full documentation](https://quickdapp.xyz/docs)
- [Website](https://quickdapp.xyz)

### LLM-Friendly Docs

Machine-readable documentation is available at [quickdapp.xyz/llms.txt](https://quickdapp.xyz/llms.txt).

## License

MIT — see [LICENSE.md](./LICENSE.md)
