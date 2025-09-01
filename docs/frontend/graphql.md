# GraphQL

The QuickDapp frontend integrates seamlessly with the GraphQL API using GraphQL Request and React Query for efficient data fetching, caching, and state management. This combination provides excellent developer experience with type safety and optimistic updates.

## GraphQL Client Setup

### Client Configuration

The GraphQL client is configured with authentication and error handling:

```typescript
// src/client/lib/graphql.ts
import { GraphQLClient } from 'graphql-request'
import { clientConfig } from '@shared/config/client'

// Create GraphQL client
export const graphqlClient = new GraphQLClient('/graphql', {
  requestMiddleware: (request) => {
    // Add authentication token
    const token = localStorage.getItem('auth-token')
    if (token) {
      request.headers.authorization = `Bearer ${token}`
    }
    return request
  },
  
  responseMiddleware: (response) => {
    // Handle authentication errors
    if (response instanceof Error && response.message.includes('Authentication required')) {
      // Clear token and redirect to login
      localStorage.removeItem('auth-token')
      window.location.reload()
    }
  }
})

// Helper function for making GraphQL requests
export async function request<T = any>(
  document: string,
  variables?: any
): Promise<T> {
  try {
    return await graphqlClient.request<T>(document, variables)
  } catch (error) {
    console.error('GraphQL Error:', error)
    throw error
  }
}
```

## React Query Integration

### Query Hook Pattern

Create reusable hooks for GraphQL operations:

```typescript
// src/client/hooks/useTokens.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { request } from '../lib/graphql'

// Query for user's tokens
export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: () => request(`
      query GetTokens {
        tokens {
          id
          address
          name
          symbol
          createdAt
          owner {
            address
          }
        }
      }
    `),
    select: (data) => data.tokens,
    staleTime: 30000, // Consider fresh for 30 seconds
  })
}

// Query for specific token details
export function useToken(tokenId: string) {
  return useQuery({
    queryKey: ['token', tokenId],
    queryFn: () => request(`
      query GetToken($id: ID!) {
        token(id: $id) {
          id
          address
          name
          symbol
          createdAt
          owner {
            id
            address
          }
        }
      }
    `, { id: tokenId }),
    select: (data) => data.token,
    enabled: !!tokenId,
  })
}

// Mutation for deploying tokens
export function useDeployToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (input: DeployTokenInput) => request(`
      mutation DeployToken($input: DeployTokenInput!) {
        deployToken(input: $input) {
          id
          name
          symbol
        }
      }
    `, { input }),
    
    // Optimistic update
    onMutate: async (input) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tokens'] })
      
      // Snapshot the previous value
      const previousTokens = queryClient.getQueryData(['tokens'])
      
      // Optimistically update the cache
      queryClient.setQueryData(['tokens'], (old: any[]) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          name: input.name,
          symbol: input.symbol,
          address: '0x0000000000000000000000000000000000000000',
          createdAt: new Date().toISOString(),
          owner: { address: 'current-user' }
        }
      ])
      
      return { previousTokens }
    },
    
    // Revert on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tokens'], context?.previousTokens)
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
    },
  })
}
```

### Authentication Queries

Handle authentication-specific GraphQL operations:

```typescript
// src/client/hooks/useAuth.ts (GraphQL parts)
export function useAuthMutations() {
  const queryClient = useQueryClient()
  
  // Get nonce for SIWE authentication
  const getNonce = useMutation({
    mutationFn: (address: string) => request(`
      mutation GetNonce($address: String!) {
        getNonce(address: $address)
      }
    `, { address }),
  })
  
  // Verify SIWE signature
  const verifySignature = useMutation({
    mutationFn: ({ message, signature }: { message: string; signature: string }) => 
      request(`
        mutation VerifySignature($message: String!, $signature: String!) {
          verifySignature(message: $message, signature: $signature) {
            token
            user {
              id
              address
              isAdmin
              createdAt
            }
          }
        }
      `, { message, signature }),
    
    onSuccess: (data) => {
      // Cache user data
      queryClient.setQueryData(['me'], data.verifySignature.user)
      
      // Store auth token
      localStorage.setItem('auth-token', data.verifySignature.token)
      
      // Update GraphQL client headers
      graphqlClient.setHeader('authorization', `Bearer ${data.verifySignature.token}`)
    }
  })
  
  return { getNonce, verifySignature }
}

// Query current user
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => request(`
      query Me {
        me {
          id
          address
          isAdmin
          createdAt
        }
      }
    `),
    select: (data) => data.me,
    retry: false, // Don't retry auth failures
    staleTime: 60000, // Cache for 1 minute
  })
}
```

## Subscription Support

### WebSocket Subscriptions

While GraphQL subscriptions can be complex, QuickDapp uses WebSockets for real-time updates:

```typescript
// src/client/hooks/useSubscriptions.ts
import { useWebSocket } from './useWebSocket'
import { useQueryClient } from '@tanstack/react-query'

export function useTokenSubscriptions() {
  const queryClient = useQueryClient()
  
  useWebSocket((data) => {
    if (data.type === 'notification' && data.notification.type === 'token_deployed') {
      // Update tokens cache when new token is deployed
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      
      // Optionally add to cache directly
      const tokenData = data.notification.data.token
      if (tokenData) {
        queryClient.setQueryData(['token', tokenData.id], tokenData)
      }
    }
  })
}
```

## Error Handling

### GraphQL Error Management

Handle different types of GraphQL errors appropriately:

```typescript
// src/client/lib/graphql-errors.ts
import { GraphQLError } from 'graphql-request'

export function parseGraphQLError(error: any): string {
  // Handle GraphQL errors
  if (error?.response?.errors) {
    const firstError = error.response.errors[0]
    
    // Handle authentication errors
    if (firstError.extensions?.code === 'UNAUTHENTICATED') {
      return 'Please sign in to continue'
    }
    
    // Handle validation errors
    if (firstError.extensions?.code === 'VALIDATION_ERROR') {
      return firstError.message
    }
    
    // Handle authorization errors
    if (firstError.extensions?.code === 'FORBIDDEN') {
      return 'You do not have permission to perform this action'
    }
    
    return firstError.message
  }
  
  // Handle network errors
  if (error?.message?.includes('fetch')) {
    return 'Network error - please check your connection'
  }
  
  return error?.message || 'An unexpected error occurred'
}
```

### Error Boundary Integration

Use React error boundaries with GraphQL operations:

```typescript
// src/client/hooks/useErrorHandler.ts
import { useNotifications } from '../contexts/NotificationContext'
import { parseGraphQLError } from '../lib/graphql-errors'

export function useErrorHandler() {
  const { addNotification } = useNotifications()
  
  return useCallback((error: any) => {
    const message = parseGraphQLError(error)
    addNotification({
      type: 'error',
      title: 'Operation Failed',
      message
    })
  }, [addNotification])
}

// Use in mutations
export function useDeployTokenWithErrorHandling() {
  const handleError = useErrorHandler()
  const deployToken = useDeployToken()
  
  return useMutation({
    ...deployToken,
    onError: handleError
  })
}
```

## Advanced Patterns

### Pagination Support

Handle paginated GraphQL queries:

```typescript
// src/client/hooks/usePaginatedTokens.ts
export function usePaginatedTokens(limit: number = 10) {
  return useInfiniteQuery({
    queryKey: ['tokens', 'paginated'],
    queryFn: ({ pageParam = 0 }) => request(`
      query GetPaginatedTokens($offset: Int!, $limit: Int!) {
        tokens(offset: $offset, limit: $limit) {
          items {
            id
            address
            name
            symbol
            createdAt
          }
          totalCount
          hasMore
        }
      }
    `, { 
      offset: pageParam * limit, 
      limit 
    }),
    select: (data) => ({
      pages: data.pages.map(page => page.tokens.items).flat(),
      totalCount: data.pages[0]?.tokens.totalCount || 0
    }),
    getNextPageParam: (lastPage, allPages) => 
      lastPage.tokens.hasMore ? allPages.length : undefined,
  })
}
```

### Cache Updates

Manually update the cache for immediate UI feedback:

```typescript
// src/client/hooks/useTokenMutations.ts
export function useUpdateToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTokenInput }) => 
      request(`
        mutation UpdateToken($id: ID!, $input: UpdateTokenInput!) {
          updateToken(id: $id, input: $input) {
            id
            name
            symbol
            updatedAt
          }
        }
      `, { id, input }),
    
    onSuccess: (data) => {
      // Update individual token cache
      queryClient.setQueryData(['token', data.updateToken.id], data.updateToken)
      
      // Update tokens list cache
      queryClient.setQueryData(['tokens'], (old: any[]) => 
        old?.map(token => 
          token.id === data.updateToken.id 
            ? { ...token, ...data.updateToken }
            : token
        ) || []
      )
    }
  })
}
```

### Typed GraphQL Operations

Generate types from GraphQL schema:

```typescript
// src/client/types/graphql.ts
export interface Token {
  id: string
  address: string
  name: string
  symbol: string
  createdAt: string
  owner: User
}

export interface User {
  id: string
  address: string
  isAdmin: boolean
  createdAt: string
}

export interface DeployTokenInput {
  name: string
  symbol: string
  initialSupply: string
}

// Type-safe request function
export function typedRequest<TData = any, TVariables = any>(
  document: string,
  variables?: TVariables
): Promise<TData> {
  return request<TData>(document, variables)
}
```

## Performance Optimization

### Query Optimization Strategies

1. **Select Only Needed Fields** - Use GraphQL's field selection
2. **Cache Configuration** - Configure staleTime and cacheTime appropriately
3. **Query Deduplication** - React Query automatically deduplicates identical queries
4. **Background Refetching** - Keep data fresh with background updates

```typescript
export function useOptimizedTokens() {
  return useQuery({
    queryKey: ['tokens', 'optimized'],
    queryFn: () => request(`
      query GetOptimizedTokens {
        tokens {
          id
          name
          symbol
          # Only fetch fields we actually need
        }
      }
    `),
    staleTime: 30000,        # Fresh for 30 seconds
    cacheTime: 300000,       # Keep in cache for 5 minutes
    refetchOnWindowFocus: false, # Don't refetch on focus
    refetchInterval: 60000,  # Background refetch every minute
  })
}
```

## Testing GraphQL Operations

### Mock GraphQL Responses

Test GraphQL hooks with mock data:

```typescript
// src/client/__tests__/hooks/useTokens.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTokens } from '../../hooks/useTokens'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Mock graphql-request
jest.mock('graphql-request', () => ({
  GraphQLClient: jest.fn(() => ({
    request: jest.fn().mockResolvedValue({
      tokens: [
        {
          id: '1',
          name: 'Test Token',
          symbol: 'TEST',
          address: '0x123...'
        }
      ]
    })
  }))
}))

test('useTokens returns token data', async () => {
  const { result } = renderHook(() => useTokens(), {
    wrapper: createWrapper()
  })
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  
  expect(result.current.data).toHaveLength(1)
  expect(result.current.data[0].name).toBe('Test Token')
})
```

The GraphQL integration in QuickDapp provides a powerful, type-safe, and efficient way to interact with the backend API while maintaining excellent user experience through optimistic updates and intelligent caching.