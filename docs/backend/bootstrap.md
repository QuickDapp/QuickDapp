# Bootstrap

The bootstrap system in QuickDapp is built around the **ServerApp pattern** - a dependency injection approach that provides clean access to all backend services. This replaces traditional singleton patterns with a more testable and maintainable architecture.

## The ServerApp Pattern

The `ServerApp` type defines all the core services your application needs:

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

## Bootstrap Process

The bootstrap process initializes all services in the correct order:

```typescript
// src/server/bootstrap.ts
export async function createServerApp(options: BootstrapOptions): Promise<ServerApp> {
  // 1. Load configuration
  const config = serverConfig
  
  // 2. Create logger
  const rootLogger = createRootLogger()
  
  // 3. Initialize database connection
  const db = await dbManager.connect()
  
  // 4. Create blockchain clients
  const publicClient = createPublicClient({ ... })
  const walletClient = createWalletClient({ ... })
  
  // 5. Initialize WebSocket manager
  const socketManager = new SocketManager(rootLogger)
  
  // 6. Create worker manager (if requested)
  const workerManager = options.includeWorkerManager 
    ? new WorkerManager({ ... })
    : undefined
  
  // 7. Set up notification system
  const createNotification = createNotificationFactory(socketManager)
  
  return {
    db,
    rootLogger,
    createLogger,
    workerManager,
    socketManager,
    publicClient,
    walletClient,
    createNotification
  }
}
```

## Using ServerApp in Components

### GraphQL Resolvers
GraphQL resolvers receive the `ServerApp` through context:

```typescript
export const resolvers = {
  Query: {
    tokens: async (parent, args, context) => {
      const { serverApp, user } = context
      
      // Access database through ServerApp
      return await serverApp.db
        .select()
        .from(tokenTable)
        .where(eq(tokenTable.ownerId, user.id))
    }
  },
  
  Mutation: {
    deployToken: async (parent, { input }, context) => {
      const { serverApp, user } = context
      
      // Submit background job
      await serverApp.workerManager.submitJob({
        type: 'deployToken',
        data: { ...input, ownerId: user.id }
      })
      
      return { success: true }
    }
  }
}
```

### Worker Jobs
Worker jobs receive `ServerApp` as their first parameter:

```typescript
// src/server/workers/jobs/deployToken.ts
export async function deployTokenJob(
  serverApp: ServerApp,
  job: Job<DeployTokenData>
) {
  // Access all services through ServerApp
  const logger = serverApp.createLogger('deploy-token')
  
  logger.info('Deploying token', { data: job.data })
  
  // Use blockchain client
  const hash = await serverApp.walletClient.deployContract({
    abi: ERC20_ABI,
    bytecode: ERC20_BYTECODE,
    args: [job.data.name, job.data.symbol]
  })
  
  // Save to database
  await serverApp.db.insert(tokenTable).values({
    address: receipt.contractAddress,
    name: job.data.name,
    symbol: job.data.symbol,
    ownerId: job.data.ownerId
  })
}
```

### Custom Services
Create services that accept `ServerApp` for dependency access:

```typescript
// src/server/services/tokenService.ts
export class TokenService {
  constructor(private serverApp: ServerApp) {}
  
  async createToken(data: CreateTokenData) {
    const logger = this.serverApp.createLogger('token-service')
    
    // Use database
    const [token] = await this.serverApp.db
      .insert(tokenTable)
      .values(data)
      .returning()
    
    // Send notification
    await this.serverApp.createNotification({
      userId: data.ownerId,
      type: 'token_created',
      data: { tokenId: token.id }
    })
    
    logger.info('Token created', { tokenId: token.id })
    return token
  }
}
```

## Configuration Loading

The bootstrap system loads configuration using a layered approach:

```typescript
// Environment loading order:
// 1. .env (base)
// 2. .env.{NODE_ENV} (environment-specific)
// 3. .env.{NODE_ENV}.local (environment-specific local)
// 4. .env.local (local overrides, except in test/production)

import { serverConfig } from '@shared/config/server'

// Type-safe access to all configuration
const dbUrl = serverConfig.DATABASE_URL
const port = serverConfig.PORT
const logLevel = serverConfig.LOG_LEVEL
```

## Testing with ServerApp

The ServerApp pattern makes testing much easier:

```typescript
// tests/helpers/createTestServer.ts
export async function createTestServerApp(): Promise<ServerApp> {
  return createServerApp({
    includeWorkerManager: false, // Disable workers in tests
    config: {
      ...serverConfig,
      DATABASE_URL: 'postgresql://postgres@localhost:5432/quickdapp_test'
    }
  })
}

// In your tests
describe('Token Service', () => {
  let serverApp: ServerApp
  
  beforeEach(async () => {
    serverApp = await createTestServerApp()
    await setupTestDatabase(serverApp.db)
  })
  
  it('creates tokens correctly', async () => {
    const tokenService = new TokenService(serverApp)
    const token = await tokenService.createToken({
      name: 'Test Token',
      symbol: 'TEST'
    })
    
    expect(token).toBeDefined()
  })
})
```

## Environment-Specific Bootstrap

Different environments may need different bootstrap configurations:

```typescript
// Development: Full services including workers
const serverApp = await createServerApp({
  includeWorkerManager: true,
  workerCountOverride: 1
})

// Test: Minimal services, no workers
const serverApp = await createServerApp({
  includeWorkerManager: false
})

// Production: Optimized for performance
const serverApp = await createServerApp({
  includeWorkerManager: true,
  workerCountOverride: 'cpus' // Auto-scale to CPU count
})
```

## Benefits of the ServerApp Pattern

### Type Safety
- All dependencies are typed
- No global state to manage
- Compile-time checks for service availability

### Testability  
- Easy to mock individual services
- Clean dependency injection
- Isolated testing environments

### Maintainability
- Clear service boundaries
- Consistent access patterns
- Easy to add new services

### Performance
- Services initialized once
- Connection pooling handled centrally
- Efficient resource sharing

The ServerApp pattern provides a solid foundation for building scalable, maintainable applications while keeping the architecture clean and testable.