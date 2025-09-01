# Backend

The QuickDapp backend is built on modern, high-performance technologies designed for Web3 applications. At its core is the **ServerApp pattern** - a dependency injection system that provides clean access to all backend services.

## Technology Stack

* **[Bun](https://bun.sh/)** - Primary runtime (Node.js compatible)
* **[ElysiaJS](https://elysiajs.com/)** - High-performance web framework
* **[GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)** - GraphQL server with subscriptions
* **[DrizzleORM](https://orm.drizzle.team/)** - Type-safe database toolkit
* **[PostgreSQL](https://www.postgresql.org/)** - Relational database
* **[SIWE](https://login.xyz/)** - Sign-in with Ethereum authentication
* **[Viem](https://viem.sh/)** - Type-safe Ethereum client

## Key Features

### ServerApp Dependency Injection
The ServerApp pattern provides clean access to all backend services:

```typescript
export type ServerApp = {
  app: Elysia                    // ElysiaJS server instance
  db: PostgresJsDatabase         // DrizzleORM database connection
  rootLogger: Logger             // Root logger instance
  createLogger: typeof createLogger  // Logger factory
  workerManager: WorkerManager   // Background job processing
  socketManager: ISocketManager  // WebSocket manager
  publicClient: PublicClient     // Blockchain read client
  walletClient: WalletClient     // Blockchain write client
  createNotification: Function   // Notification system
}
```

### Type-Safe Database Access
DrizzleORM provides compile-time type checking and excellent performance:

```typescript
import { serverApp } from './bootstrap'

// Type-safe queries
const users = await serverApp.db
  .select()
  .from(userTable)
  .where(eq(userTable.address, walletAddress))

// Transactions
await serverApp.db.transaction(async (tx) => {
  // All operations are rolled back if any fail
})
```

### GraphQL API
Schema-first GraphQL API with authentication:

```graphql
type Query {
  me: User @auth
  tokens: [Token!]! @auth
}

type Mutation {
  deployToken(input: DeployTokenInput!): Token @auth
}
```

### Real-time Communication
WebSocket support for real-time updates:

```typescript
// Send notification to specific user
await serverApp.createNotification({
  userId: user.id,
  type: 'token_deployed',
  data: { tokenAddress: '0x...' }
})
```

### Background Jobs
Robust worker system for blockchain monitoring and async tasks:

```typescript
// Submit a background job
await serverApp.workerManager.submitJob({
  type: 'deployToken',
  data: { name: 'MyToken', symbol: 'MTK' }
})
```

## Documentation Sections

* [Bootstrap](./bootstrap.md) - ServerApp pattern and dependency injection
* [Database](./database.md) - DrizzleORM setup and usage patterns
* [GraphQL](./graphql.md) - API schema and resolver implementation
* [Authentication](./authentication.md) - SIWE and JWT authentication system
* [WebSockets](./websockets.md) - Real-time communication implementation

## Quick Examples

### Creating a Simple Resolver
```typescript
// src/server/graphql/resolvers.ts
export const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      const { serverApp, user } = context
      if (!user) throw new Error('Authentication required')
      
      return await serverApp.db
        .select()
        .from(userTable)
        .where(eq(userTable.id, user.id))
        .then(rows => rows[0])
    }
  }
}
```

### Database Operations
```typescript
// Insert with returning
const [user] = await serverApp.db
  .insert(userTable)
  .values({ address: '0x...', nonce: generateNonce() })
  .returning()

// Complex queries with joins
const tokensWithOwners = await serverApp.db
  .select({
    token: tokenTable,
    owner: userTable
  })
  .from(tokenTable)
  .leftJoin(userTable, eq(tokenTable.ownerId, userTable.id))
```

### Background Job Handler
```typescript
// src/server/workers/jobs/deployToken.ts
export async function deployTokenJob(
  serverApp: ServerApp,
  job: Job<DeployTokenData>
) {
  const { name, symbol, ownerId } = job.data
  
  // Deploy contract using wallet client
  const hash = await serverApp.walletClient.deployContract({
    abi: ERC20_ABI,
    bytecode: ERC20_BYTECODE,
    args: [name, symbol]
  })
  
  // Wait for deployment
  const receipt = await serverApp.publicClient.waitForTransactionReceipt({ hash })
  
  // Save to database
  await serverApp.db.insert(tokenTable).values({
    address: receipt.contractAddress,
    name,
    symbol,
    ownerId
  })
  
  // Notify user
  await serverApp.createNotification({
    userId: ownerId,
    type: 'token_deployed',
    data: { address: receipt.contractAddress }
  })
}
```

The backend architecture prioritizes developer experience, type safety, and performance while maintaining clean separation of concerns through the ServerApp pattern.