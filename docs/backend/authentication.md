# Authentication

QuickDapp uses **Sign-in with Ethereum (SIWE)** combined with **JWT tokens** to provide secure, decentralized authentication. This approach allows users to authenticate using their Ethereum wallets without requiring traditional username/password flows.

## How SIWE Authentication Works

1. **Wallet Connection** - User connects their wallet (MetaMask, WalletConnect, etc.)
2. **Nonce Generation** - Server generates a unique nonce for the user's address
3. **Message Signing** - User signs a standardized SIWE message with their private key
4. **Signature Verification** - Server verifies the signature matches the claimed address
5. **JWT Token Issuance** - Server issues a JWT token for authenticated sessions
6. **Subsequent Requests** - Client includes JWT token in Authorization header

## Authentication Flow

### Step 1: Get Authentication Nonce

```typescript
// Client requests a nonce for their wallet address
const response = await fetch('/api/auth/nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: '0x742d35Cc6634C0532925a3b8D30eE5528c097Eff' })
})

const { nonce } = await response.json()
```

### Step 2: Sign SIWE Message

```typescript
// Create SIWE message
const message = new SiweMessage({
  domain: window.location.host,
  address: walletAddress,
  statement: 'Sign in with Ethereum to the app.',
  uri: window.location.origin,
  version: '1',
  chainId: 1,
  nonce: nonce
})

// Sign message with wallet
const signature = await walletClient.signMessage({
  message: message.prepareMessage()
})
```

### Step 3: Verify and Get Token

```typescript
// Send signed message to server
const response = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: message.prepareMessage(),
    signature: signature
  })
})

const { token } = await response.json()

// Store token for subsequent requests
localStorage.setItem('auth-token', token)
```

## Server-Side Implementation

### Authentication Service

```typescript
// src/server/auth/AuthService.ts
export class AuthService {
  constructor(private serverApp: ServerApp) {}

  async generateNonce(address: string): Promise<string> {
    const nonce = generateNonce()
    
    // Store nonce in database
    await this.serverApp.db
      .insert(userTable)
      .values({ address, nonce })
      .onConflictDoUpdate({
        target: userTable.address,
        set: { nonce }
      })
    
    return nonce
  }

  async verifySignature(message: string, signature: string): Promise<User | null> {
    try {
      // Parse SIWE message
      const siweMessage = new SiweMessage(message)
      
      // Verify signature
      const result = await siweMessage.verify({
        signature,
        domain: serverConfig.BASE_URL
      })
      
      if (!result.success) {
        throw new Error('Invalid signature')
      }
      
      // Find user and verify nonce
      const [user] = await this.serverApp.db
        .select()
        .from(userTable)
        .where(eq(userTable.address, siweMessage.address))
      
      if (!user || user.nonce !== siweMessage.nonce) {
        throw new Error('Invalid nonce')
      }
      
      // Generate new nonce for next authentication
      const newNonce = generateNonce()
      await this.serverApp.db
        .update(userTable)
        .set({ nonce: newNonce })
        .where(eq(userTable.id, user.id))
      
      return user
      
    } catch (error) {
      this.serverApp.createLogger('auth').error('Signature verification failed:', error)
      return null
    }
  }

  async generateJWT(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      address: user.address,
      isAdmin: user.isAdmin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }
    
    return await new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .encrypt(new TextEncoder().encode(serverConfig.SESSION_ENCRYPTION_KEY))
  }

  async verifyJWT(token: string): Promise<User | null> {
    try {
      const { payload } = await jwtDecrypt(
        token,
        new TextEncoder().encode(serverConfig.SESSION_ENCRYPTION_KEY)
      )
      
      // Find user by ID
      const [user] = await this.serverApp.db
        .select()
        .from(userTable)
        .where(eq(userTable.id, payload.sub as string))
      
      return user || null
      
    } catch (error) {
      return null
    }
  }
}
```

### GraphQL Authentication

QuickDapp uses a custom `@auth` directive to protect GraphQL operations:

```typescript
// src/server/graphql/directives.ts
export const authDirective = {
  typeDefs: 'directive @auth on FIELD_DEFINITION',
  
  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirective = getDirective(schema, fieldConfig, 'auth')
        
        if (authDirective) {
          const originalResolver = fieldConfig.resolve
          
          fieldConfig.resolve = async (source, args, context, info) => {
            const { user, requiresAuth } = context
            
            if (requiresAuth && !user) {
              throw new GraphQLError('Authentication required')
            }
            
            return originalResolver(source, args, context, info)
          }
        }
        
        return fieldConfig
      }
    })
  }
}
```

### GraphQL Context

The GraphQL context includes authentication information:

```typescript
// src/server/graphql/context.ts
export async function createContext(request: Request, serverApp: ServerApp) {
  let user: User | null = null
  let requiresAuth = false
  
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
    requiresAuth: (required: boolean = true) => {
      requiresAuth = required
    }
  }
}
```

## Frontend Integration

### React Hook for Authentication

```typescript
// src/client/hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const signIn = async (address: string) => {
    try {
      // Get nonce
      const nonceResponse = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mutation GetNonce($address: String!) { getNonce(address: $address) }',
          variables: { address }
        })
      })
      
      const { data } = await nonceResponse.json()
      const nonce = data.getNonce
      
      // Create and sign SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce
      })
      
      const signature = await walletClient.signMessage({
        message: message.prepareMessage()
      })
      
      // Verify signature and get token
      const verifyResponse = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation VerifySignature($message: String!, $signature: String!) {
              verifySignature(message: $message, signature: $signature) {
                token
                user { id address isAdmin }
              }
            }
          `,
          variables: { message: message.prepareMessage(), signature }
        })
      })
      
      const { data: verifyData } = await verifyResponse.json()
      
      if (verifyData.verifySignature.token) {
        localStorage.setItem('auth-token', verifyData.verifySignature.token)
        setUser(verifyData.verifySignature.user)
      }
      
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    }
  }
  
  const signOut = () => {
    localStorage.removeItem('auth-token')
    setUser(null)
  }
  
  return { user, loading, signIn, signOut }
}
```

### GraphQL Client with Authentication

```typescript
// src/client/lib/graphql.ts
export const graphqlClient = new GraphQLClient('/graphql', {
  requestMiddleware: (request) => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      request.headers.authorization = `Bearer ${token}`
    }
    return request
  }
})
```

## GraphQL Schema

```graphql
# Authentication mutations
type Mutation {
  getNonce(address: String!): String!
  verifySignature(message: String!, signature: String!): AuthResult!
}

type AuthResult {
  token: String!
  user: User!
}

type User {
  id: ID!
  address: String!
  isAdmin: Boolean!
  createdAt: String!
}

# Protected queries and mutations
type Query {
  me: User @auth
  myTokens: [Token!]! @auth
}

type Mutation {
  deployToken(input: DeployTokenInput!): Token! @auth
}
```

## Security Considerations

### JWT Token Security
- **Encryption**: Tokens are encrypted using AES-256-GCM
- **Expiration**: Tokens expire after 24 hours
- **Key Management**: Encryption key must be 32 characters and kept secure

### SIWE Message Validation
- **Domain Binding**: Messages are bound to the application domain
- **Nonce Reuse Prevention**: Each nonce can only be used once
- **Timestamp Validation**: Messages have validity windows

### Best Practices
- **Secure Storage**: Store tokens securely (localStorage in browser)
- **HTTPS Only**: Never send tokens over unencrypted connections
- **Token Refresh**: Implement token refresh for long-running sessions
- **Logout Handling**: Clear tokens on logout

This authentication system provides a secure, user-friendly way to authenticate with Ethereum wallets while maintaining the decentralized nature of Web3 applications.