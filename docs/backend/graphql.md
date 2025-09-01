# GraphQL

QuickDapp uses [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) integrated with ElysiaJS to provide a powerful, type-safe API layer. The GraphQL implementation includes authentication, subscriptions, and comprehensive error handling.

## Schema Definition

GraphQL schemas are defined using a schema-first approach with shared type definitions:

```graphql
# src/shared/graphql/schema.graphql
type User {
  id: ID!
  address: String!
  isAdmin: Boolean!
  createdAt: String!
  tokens: [Token!]!
}

type Token {
  id: ID!
  address: String!
  name: String!
  symbol: String!
  owner: User!
  createdAt: String!
}

type Query {
  me: User @auth
  tokens: [Token!]! @auth
  token(id: ID!): Token @auth
}

type Mutation {
  getNonce(address: String!): String!
  verifySignature(message: String!, signature: String!): AuthResult!
  deployToken(input: DeployTokenInput!): Token! @auth
}

type Subscription {
  tokenDeployed: Token! @auth
  notifications: Notification! @auth
}

input DeployTokenInput {
  name: String!
  symbol: String!
  initialSupply: String!
}

type AuthResult {
  token: String!
  user: User!
}

directive @auth on FIELD_DEFINITION
```

## Resolvers

Resolvers handle the business logic for GraphQL operations:

```typescript
// src/server/graphql/resolvers.ts
import { GraphQLResolveInfo } from 'graphql'
import type { ServerApp } from '../types'

export interface GraphQLContext {
  serverApp: ServerApp
  user: User | null
  requiresAuth: boolean
}

export const resolvers = {
  Query: {
    me: async (
      parent: any,
      args: any,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const { serverApp, user } = context
      if (!user) throw new Error('Authentication required')
      
      return user
    },

    tokens: async (parent: any, args: any, context: GraphQLContext) => {
      const { serverApp, user } = context
      if (!user) throw new Error('Authentication required')
      
      return await serverApp.db
        .select()
        .from(tokenTable)
        .where(eq(tokenTable.ownerId, user.id))
        .orderBy(desc(tokenTable.createdAt))
    },

    token: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const { serverApp, user } = context
      if (!user) throw new Error('Authentication required')
      
      const [token] = await serverApp.db
        .select()
        .from(tokenTable)
        .where(and(
          eq(tokenTable.id, id),
          eq(tokenTable.ownerId, user.id)
        ))
      
      if (!token) {
        throw new Error('Token not found')
      }
      
      return token
    }
  },

  Mutation: {
    getNonce: async (parent: any, { address }: { address: string }, context: GraphQLContext) => {
      const { serverApp } = context
      const authService = new AuthService(serverApp)
      
      return await authService.generateNonce(address)
    },

    verifySignature: async (
      parent: any,
      { message, signature }: { message: string; signature: string },
      context: GraphQLContext
    ) => {
      const { serverApp } = context
      const authService = new AuthService(serverApp)
      
      const user = await authService.verifySignature(message, signature)
      if (!user) {
        throw new Error('Invalid signature')
      }
      
      const token = await authService.generateJWT(user)
      
      return { token, user }
    },

    deployToken: async (
      parent: any,
      { input }: { input: DeployTokenInput },
      context: GraphQLContext
    ) => {
      const { serverApp, user } = context
      if (!user) throw new Error('Authentication required')
      
      // Submit deployment job to worker
      await serverApp.workerManager.submitJob({
        type: 'deployToken',
        data: {
          ...input,
          ownerId: user.id
        }
      })
      
      // Return placeholder - real token will be created by worker
      return {
        id: 'pending',
        address: '0x0000000000000000000000000000000000000000',
        name: input.name,
        symbol: input.symbol,
        owner: user,
        createdAt: new Date().toISOString()
      }
    }
  },

  Subscription: {
    tokenDeployed: {
      // Subscribe to token deployment events for the authenticated user
      subscribe: async (parent: any, args: any, context: GraphQLContext) => {
        const { serverApp, user } = context
        if (!user) throw new Error('Authentication required')
        
        return serverApp.pubsub.asyncIterator(`token_deployed_${user.id}`)
      }
    },

    notifications: {
      // Subscribe to all notifications for the authenticated user
      subscribe: async (parent: any, args: any, context: GraphQLContext) => {
        const { serverApp, user } = context
        if (!user) throw new Error('Authentication required')
        
        return serverApp.pubsub.asyncIterator(`notifications_${user.id}`)
      }
    }
  },

  // Field resolvers
  User: {
    tokens: async (user: User, args: any, context: GraphQLContext) => {
      const { serverApp } = context
      
      return await serverApp.db
        .select()
        .from(tokenTable)
        .where(eq(tokenTable.ownerId, user.id))
        .orderBy(desc(tokenTable.createdAt))
    }
  },

  Token: {
    owner: async (token: Token, args: any, context: GraphQLContext) => {
      const { serverApp } = context
      
      const [owner] = await serverApp.db
        .select()
        .from(userTable)
        .where(eq(userTable.id, token.ownerId))
      
      return owner
    }
  }
}
```

## Authentication Directive

The `@auth` directive provides field-level authentication:

```typescript
// src/server/graphql/directives/auth.ts
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { GraphQLSchema, GraphQLError } from 'graphql'

export const authDirective = {
  typeDefs: 'directive @auth on FIELD_DEFINITION',
  
  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirective = getDirective(schema, fieldConfig, 'auth')
        
        if (authDirective) {
          const originalResolver = fieldConfig.resolve
          
          fieldConfig.resolve = async (source, args, context, info) => {
            const { user } = context
            
            if (!user) {
              throw new GraphQLError('Authentication required', {
                extensions: { code: 'UNAUTHENTICATED' }
              })
            }
            
            return originalResolver ? 
              originalResolver(source, args, context, info) : 
              source[info.fieldName]
          }
        }
        
        return fieldConfig
      }
    })
  }
}
```

## GraphQL Server Setup

The GraphQL server is integrated with ElysiaJS:

```typescript
// src/server/graphql/index.ts
import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { readFileSync } from 'fs'
import { resolvers } from './resolvers'
import { authDirective } from './directives/auth'
import type { ServerApp } from '../types'

export function createGraphQLHandler(serverApp: ServerApp) {
  // Load schema
  const typeDefs = readFileSync('./src/shared/graphql/schema.graphql', 'utf8')
  
  // Create executable schema
  let schema = makeExecutableSchema({
    typeDefs: [authDirective.typeDefs, typeDefs],
    resolvers
  })
  
  // Apply directives
  schema = authDirective.transformer(schema)
  
  // Create Yoga instance
  const yoga = createYoga({
    schema,
    context: async ({ request }) => {
      return createGraphQLContext(request, serverApp)
    },
    // Enable GraphQL playground in development
    graphiql: serverConfig.NODE_ENV === 'development',
    // Custom error handling
    maskedErrors: serverConfig.NODE_ENV === 'production',
    logging: {
      debug: (...args) => serverApp.createLogger('graphql').debug(...args),
      info: (...args) => serverApp.createLogger('graphql').info(...args),
      warn: (...args) => serverApp.createLogger('graphql').warn(...args),
      error: (...args) => serverApp.createLogger('graphql').error(...args),
    }
  })
  
  return yoga
}

async function createGraphQLContext(request: Request, serverApp: ServerApp) {
  let user: User | null = null
  
  // Extract JWT token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const authService = new AuthService(serverApp)
    user = await authService.verifyJWT(token)
  }
  
  return {
    serverApp,
    user,
    requiresAuth: false
  }
}
```

## Error Handling

GraphQL errors are handled consistently:

```typescript
// Custom error types
export class ValidationError extends Error {
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.extensions = { code: 'VALIDATION_ERROR', field }
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
    this.extensions = { code: 'UNAUTHENTICATED' }
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
    this.extensions = { code: 'FORBIDDEN' }
  }
}

// Error formatting
const formatError = (error: GraphQLError) => {
  // Log server errors
  if (!error.extensions?.code) {
    serverApp.createLogger('graphql').error('GraphQL Error:', error)
  }
  
  // Return formatted error
  return {
    message: error.message,
    extensions: error.extensions,
    locations: error.locations,
    path: error.path
  }
}
```

## Subscriptions

Real-time subscriptions are supported via WebSockets:

```typescript
// Publishing events
export class NotificationService {
  constructor(private serverApp: ServerApp) {}
  
  async notifyTokenDeployed(userId: string, token: Token) {
    await this.serverApp.pubsub.publish(`token_deployed_${userId}`, {
      tokenDeployed: token
    })
  }
  
  async sendNotification(userId: string, notification: Notification) {
    await this.serverApp.pubsub.publish(`notifications_${userId}`, {
      notifications: notification
    })
  }
}
```

## Client Usage

### React Query Integration

```typescript
// src/client/hooks/useTokens.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '../lib/graphql'

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const data = await graphqlClient.request(`
        query GetTokens {
          tokens {
            id
            address
            name
            symbol
            createdAt
          }
        }
      `)
      return data.tokens
    }
  })
}

export function useDeployToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: DeployTokenInput) => {
      const data = await graphqlClient.request(`
        mutation DeployToken($input: DeployTokenInput!) {
          deployToken(input: $input) {
            id
            name
            symbol
          }
        }
      `, { input })
      
      return data.deployToken
    },
    onSuccess: () => {
      // Invalidate tokens query to refetch
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
    }
  })
}
```

### Subscription Usage

```typescript
// src/client/hooks/useTokenSubscription.ts
import { useEffect } from 'react'
import { graphqlClient } from '../lib/graphql'

export function useTokenSubscription(onTokenDeployed: (token: Token) => void) {
  useEffect(() => {
    const subscription = graphqlClient.subscribe(`
      subscription TokenDeployed {
        tokenDeployed {
          id
          address
          name
          symbol
        }
      }
    `)
    
    subscription.subscribe({
      next: (data) => onTokenDeployed(data.tokenDeployed),
      error: (error) => console.error('Subscription error:', error)
    })
    
    return () => subscription.return?.()
  }, [onTokenDeployed])
}
```

The GraphQL API provides a powerful, type-safe way to build modern Web3 applications with real-time capabilities and robust authentication.