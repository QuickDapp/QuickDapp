# Getting started

## Step 0 - Pre-requisites

Ensure you have the following pre-requisites installed and ready:

* [Bun](https://bun.sh/) v1.0+ (required - only supported runtime and package manager)
* [PostgreSQL](https://www.postgresql.org/) 11+ running locally on port 5432, with a default admin user called `postgres`.
* [Foundry](https://book.getfoundry.sh/getting-started/installation) for smart contract development.
* [Git](https://git-scm.com/) for version control.

!!!
QuickDapp exclusively uses Bun as its runtime and package manager. npm/yarn/pnpm are not supported. This design choice ensures optimal performance and consistency across all development, testing, and deployment workflows.
!!!

## Step 1 - Source code

Clone or fork the QuickDapp repository from GitHub:

```shell
git clone https://github.com/QuickDapp/quickdapp-v3.git
cd quickdapp-v3
```

## Step 2 - Dependencies

In the project folder, let's install the dependencies:

```shell
bun install
```

## Step 3 - PostgreSQL database

By default, QuickDapp assumes the existence of a [PostgreSQL](https://www.postgresql.org/) database. The default connection parameters (defined in the `.env` file) are:

* host: `localhost`
* port: `5432`
* user: `postgres`
* db: `quickdapp_dev`

If you haven't already, create the `quickdapp_dev` database, ensuring the `postgres` user has full system-level privileged access to it:

```shell
psql -U postgres -c 'CREATE DATABASE quickdapp_dev'
```

Let's get the dev database setup:

```shell
bun run db push
```

This command uses DrizzleORM to set up your database schema based on the definitions in `src/server/db/schema.ts`.

## Step 4 - Local smart contract development

QuickDapp includes a sample ERC-20 token factory contract for local development. The contracts are located in the `sample-contracts/` directory and use a simple factory pattern (not Diamond Standard).

### Install Foundry (if not already installed)

If you haven't installed Foundry yet:

```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Start local blockchain

In a new terminal, start the local Hardhat development node:

```shell
cd sample-contracts
bun devnet.ts
```

This starts a local blockchain on `http://localhost:8545` with pre-funded test accounts.

### Deploy contracts locally

In another terminal, deploy the ERC-20 factory contract:

```shell
cd sample-contracts
bun deploy.ts
```

This will:
- Build the contracts using Foundry
- Deploy the ERC-20Factory contract to your local node
- Automatically save the contract address to `../.env.local`

The factory contract allows you to deploy custom ERC-20 tokens through the QuickDapp interface.

## Step 5 - Setup wallet

The local blockchain pre-funds test accounts using this mnemonic:

```
test test test test test test test test test test test junk
```

Import this mnemonic into your browser wallet (like [MetaMask](https://metamask.io/)) to access pre-funded test accounts.

You'll also need to add the local network to your wallet:
- Network Name: Localhost 8545
- RPC URL: http://localhost:8545
- Chain ID: 31337
- Currency Symbol: ETH

## Step 6 - Start development server

Now start the QuickDapp development server:

```shell
bun run dev
```

This will:
* Start the backend server on http://localhost:3000
* GraphQL endpoint at http://localhost:3000/graphql and health at http://localhost:3000/health
* Start the Vite frontend development server on http://localhost:5173
* Generate contract ABIs and copy static assets
* Enable hot reload for both frontend and backend changes

The development server provides live reloading for an optimal development experience.

## Step 7 - Interact with the dapp

Goto http://localhost:5173 in your Metamask-enabled browser to interact with the dapp!

The development setup includes:
* Full Web3 wallet integration via RainbowKit
* GraphQL API with authentication
* Real-time WebSocket connections
* Background job processing
* Comprehensive logging

## Step 8 - Run tests

QuickDapp includes a basic test framework. Run tests with:

```shell
bun run test
```

You can add your own tests to the `tests/` directory. The test framework includes database isolation, server lifecycle management, and GraphQL testing utilities.

## Step 9 - Deploying to production

The following steps all deal with deploying our dapp to production.

We will do the following:

* Deploy smart contracts to Sepolia test network.
* Build the application for production.
* Deploy using Docker containers or binary builds.
* Use a hosted PostgreSQL database as the production database.

!!!
QuickDapp supports multiple deployment strategies: Docker containers, self-contained binaries, or separate frontend/backend deployments. The choice depends on your infrastructure preferences.
!!!

## Step 10 - Setup production database

We will setup a PostgreSQL database for production use. You can use any PostgreSQL hosting service such as:

* [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases)
* [AWS RDS](https://aws.amazon.com/rds/)
* [Railway](https://railway.app/)
* [Supabase](https://supabase.com/)

Once you have your production database connection string, add it to your `.env.production` file (or create a production environment file):

```ini
DATABASE_URL="postgresql://user:password@host:5432/database"
```

Now setup the production database schema:

```shell
bun run db migrate
```

## Step 11 - Deploy contracts to Sepolia

Deploy the ERC-20 factory contract to [Sepolia](https://www.alchemy.com/overviews/sepolia-testnet) testnet for production use.

### Prerequisites:

1. Get Sepolia ETH from the [Sepolia faucet](https://sepoliafaucet.com/)
2. Get a Sepolia RPC endpoint from [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)

### Set environment variables:

Add these to your shell environment or `.env.production`:

```bash
CHAIN=sepolia
WEB3_SEPOLIA_RPC="https://sepolia.infura.io/v3/your-api-key"
WEB3_SERVER_WALLET_PRIVATE_KEY="0x..." # Your deployment wallet private key
```

### Deploy to Sepolia:

```shell
cd sample-contracts
bun deploy.ts
```

This will:
- Deploy the ERC-20Factory contract to Sepolia
- Save the contract address to `../.env.production`
- Display the deployed contract address

The deployed factory address will be automatically saved to your environment configuration for production use.

## Step 12 - Test-run production build locally

_Note: This step is optional, and is useful if you want to debug some production issues locally_

In the project folder, build the production apps:

```shell
bun run build
# Optionally bundle client into server static assets so server serves the SPA:
# bun run build --bundle
```

Now, run the production apps:

```shell
bun run prod
```

Now goto http://localhost:3000 in your Metamask-enabled browser to interact with the dapp. You will need to connect to the Sepolia test network in your wallet.

## Step 13 - Deploy to production

QuickDapp supports several deployment options:

**Option A: Binary deployment**
Build a self-contained binary with embedded assets:

```shell
bun run build
# Binaries are created automatically in dist/binaries/
```

**Option B: Docker deployment**
Build and run as Docker containers:

```shell
docker build -t quickdapp .
docker run -p 3000:3000 quickdapp
```

See the [deployment documentation](./deployment/) for detailed guides on various deployment strategies.

## Step 14 - Hurrah!

**Congratulations! your dapp is now available on the web in production mode.**

## Next steps

Now that you have QuickDapp running, explore the documentation to learn about:

* [Backend architecture](./backend/) - Understanding the ServerApp pattern and database layer
* [Frontend development](./frontend/) - Building React components and Web3 integrations  
* [Worker system](./worker/) - Adding background jobs and cron tasks
* [Command line tools](./command-line/) - Development and deployment commands
* [Testing](./getting-started.md#step-8---run-tests) - Writing and running tests
