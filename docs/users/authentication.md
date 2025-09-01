# Authentication

QuickDapp uses Sign-In With Ethereum (SIWE) for Web3-native authentication, providing secure, decentralized user authentication without traditional usernames and passwords. Users authenticate by signing a message with their Ethereum wallet, creating a seamless Web3 experience.

## Authentication Overview

### Web3 Authentication Flow

QuickDapp's authentication system:

1. **Wallet Connection** - User connects their Ethereum wallet (MetaMask, WalletConnect, etc.)
2. **Message Signing** - Server generates a unique SIWE message for the user to sign
3. **Signature Verification** - Server verifies the signed message and creates a session
4. **JWT Token** - User receives a JWT token for subsequent API requests
5. **Session Management** - Token-based sessions with configurable expiration

### SIWE (Sign-In With Ethereum)

SIWE provides standardized authentication using Ethereum accounts:

```typescript
// Example SIWE message
const siweMessage = {
  domain: 'your-app.com',
  address: '0x1234...abcd',
  statement: 'Sign in to QuickDapp',
  uri: 'https://your-app.com',
  version: '1',
  chainId: 1,
  nonce: 'random-nonce-string',
  issuedAt: '2024-01-01T00:00:00.000Z',
  expirationTime: '2024-01-01T01:00:00.000Z'
}
```

## Setting Up Authentication

### Required Configuration

Configure authentication in your environment:

```bash
# .env
# Session encryption (32 characters)
SESSION_ENCRYPTION_KEY=your_secure_32_character_key_here

# JWT token expiration (in seconds)
JWT_EXPIRATION=86400

# Application domain for SIWE
BASE_URL=http://localhost:3000

# Wallet configuration
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Database Schema

User authentication uses these database tables:

```typescript
// Database schema (automatically created)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  address: varchar('address', { length: 42 }).unique().notNull(),
  ensName: varchar('ens_name', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
```

## Frontend Integration

### Wallet Connection

Connect wallets using Web3Modal and Wagmi:

```typescript
// Connect wallet button
import { useConnect, useAccount } from 'wagmi'

export function ConnectWalletButton() {
  const { connect, connectors } = useConnect()
  const { address, isConnected } = useAccount()

  if (isConnected) {
    return <div>Connected: {address}</div>
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}
```

### Authentication Hook

Use the authentication hook for sign-in flow:

```typescript
// useAuth hook usage
import { useAuth } from '../hooks/useAuth'

export function SignInButton() {
  const { signIn, isLoading, user, signOut } = useAuth()

  if (user) {
    return (
      <div>
        <div>Signed in as {user.address}</div>
        <button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return (
    <button onClick={signIn} disabled={isLoading}>
      {isLoading ? 'Signing in...' : 'Sign In'}
    </button>
  )
}
```

### GraphQL Authentication

Protected GraphQL operations require authentication:

```typescript
// GraphQL queries with authentication
import { useQuery } from '@apollo/client'

const GET_USER_PROFILE = gql`
  query GetUserProfile {
    userProfile {
      id
      address
      ensName
      avatar
      tokens {
        id
        name
        symbol
      }
    }
  }
`

export function UserProfile() {
  const { data, loading, error } = useQuery(GET_USER_PROFILE)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>{data.userProfile.ensName || data.userProfile.address}</h2>
      <div>Tokens: {data.userProfile.tokens.length}</div>
    </div>
  )
}
```

## Backend Authentication

### GraphQL Authentication Directive

Protect GraphQL resolvers with the `@auth` directive:

```typescript
// GraphQL schema with authentication
const typeDefs = gql`
  type Query {
    # Public endpoint (no auth required)
    publicData: String
    
    # Protected endpoint (requires authentication)
    userProfile: User @auth
    userTokens: [Token!]! @auth
  }

  type Mutation {
    # Protected mutations
    deployToken(input: DeployTokenInput!): DeployTokenResult! @auth
    updateUserProfile(input: UpdateUserInput!): User @auth
  }
`
```

### Authentication Context

Access user information in resolvers:

```typescript
// GraphQL resolver with authentication
const resolvers = {
  Query: {
    userProfile: async (parent, args, context) => {
      // User automatically available when @auth directive is used
      const { user, serverApp } = context
      
      return await serverApp.db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .then(results => results[0])
    }
  },
  
  Mutation: {
    deployToken: async (parent, { input }, context) => {
      const { user, serverApp } = context
      
      // Submit job with user context
      const job = await serverApp.workerManager.submitJob('deployToken', {
        ...input,
        userId: user.id,
        userAddress: user.address
      })
      
      return { jobId: job.id, status: 'queued' }
    }
  }
}
```

### Manual Authentication Check

Check authentication in non-GraphQL endpoints:

```typescript
// Manual authentication in ElysiaJS routes
import { verifyJWT } from '../lib/auth'

app.get('/api/protected', async ({ headers, set }) => {
  const token = headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    set.status = 401
    return { error: 'Authentication required' }
  }
  
  try {
    const payload = verifyJWT(token)
    const user = await getUserById(payload.userId)
    
    return { data: 'Protected data', user }
  } catch (error) {
    set.status = 401
    return { error: 'Invalid token' }
  }
})
```

## Authentication Workflows

### Sign-In Process

Complete sign-in workflow:

```typescript
// Sign-in workflow (client-side)
async function signIn() {
  try {
    // 1. Request nonce from server
    const { nonce } = await fetch('/api/auth/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: userAddress })
    }).then(r => r.json())

    // 2. Create SIWE message
    const message = new SiweMessage({
      domain: window.location.host,
      address: userAddress,
      statement: 'Sign in to QuickDapp',
      uri: window.location.origin,
      version: '1',
      chainId: await getChainId(),
      nonce,
      issuedAt: new Date().toISOString()
    })

    // 3. Sign message with wallet
    const signature = await signMessage({
      message: message.prepareMessage()
    })

    // 4. Verify signature with server
    const { token, user } = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.prepareMessage(),
        signature
      })
    }).then(r => r.json())

    // 5. Store token and user data
    localStorage.setItem('authToken', token)
    setCurrentUser(user)

  } catch (error) {
    console.error('Sign-in failed:', error)
    throw error
  }
}
```

### Token Refresh

Handle token expiration and refresh:

```typescript
// Token refresh workflow
async function refreshTokenIfNeeded() {
  const token = localStorage.getItem('authToken')
  
  if (!token) return null
  
  try {
    // Decode token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiryTime = payload.exp * 1000
    const now = Date.now()
    
    // Refresh if token expires in next 5 minutes
    if (expiryTime - now < 5 * 60 * 1000) {
      const { token: newToken } = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(r => r.json())
      
      localStorage.setItem('authToken', newToken)
      return newToken
    }
    
    return token
  } catch (error) {
    // Token invalid, clear and redirect to sign-in
    localStorage.removeItem('authToken')
    return null
  }
}
```

## Session Management

### Session Configuration

Configure session behavior:

```typescript
// Session configuration
const sessionConfig = {
  // JWT token expiration (24 hours)
  jwtExpiration: 24 * 60 * 60,
  
  // Session cleanup interval
  cleanupInterval: 60 * 60, // 1 hour
  
  // Maximum concurrent sessions per user
  maxSessionsPerUser: 5,
  
  // Session extension on activity
  extendOnActivity: true
}
```

### Session Storage

Sessions are stored in the database with automatic cleanup:

```typescript
// Session management
export class SessionManager {
  async createSession(userId: number): Promise<string> {
    const token = generateJWT({ userId })
    const expiresAt = new Date(Date.now() + sessionConfig.jwtExpiration * 1000)
    
    await db.insert(sessions).values({
      userId,
      token: hashToken(token),
      expiresAt
    })
    
    return token
  }
  
  async validateSession(token: string): Promise<User | null> {
    const hashedToken = hashToken(token)
    
    const session = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(
        eq(sessions.token, hashedToken),
        gt(sessions.expiresAt, new Date())
      ))
      .then(results => results[0])
      
    if (!session) return null
    
    return session.users
  }
  
  async revokeSession(token: string): Promise<void> {
    const hashedToken = hashToken(token)
    
    await db
      .delete(sessions)
      .where(eq(sessions.token, hashedToken))
  }
}
```

## Security Features

### Message Security

SIWE messages include security features:

```typescript
// Secure message generation
function generateSIWEMessage(address: string) {
  return {
    domain: process.env.BASE_URL,
    address,
    statement: 'Sign in to QuickDapp',
    uri: process.env.BASE_URL,
    version: '1',
    chainId: parseInt(process.env.CHAIN_ID || '1'),
    nonce: crypto.randomBytes(16).toString('hex'), // Unique nonce
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
  }
}
```

### Token Security

JWT tokens include security measures:

```typescript
// Secure JWT generation
function generateJWT(payload: any): string {
  return jwt.sign(payload, process.env.SESSION_ENCRYPTION_KEY, {
    expiresIn: '24h',
    issuer: 'quickdapp',
    audience: 'quickdapp-users',
    algorithm: 'HS256'
  })
}
```

### Rate Limiting

Protect authentication endpoints:

```typescript
// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/auth', authRateLimit)
```

## User Profile Management

### Profile Updates

Users can update their profile information:

```typescript
// Update user profile
const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateUserProfile(input: $input) {
      id
      ensName
      avatar
    }
  }
`

export function ProfileForm() {
  const [updateProfile] = useMutation(UPDATE_PROFILE)
  
  const handleSubmit = async (data: any) => {
    await updateProfile({
      variables: { input: data }
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="ensName" placeholder="ENS Name" />
      <input name="avatar" placeholder="Avatar URL" />
      <button type="submit">Update Profile</button>
    </form>
  )
}
```

### ENS Integration

Automatically resolve ENS names:

```typescript
// ENS resolution
async function resolveENSName(address: string): Promise<string | null> {
  try {
    const ensName = await publicClient.getEnsName({ address })
    return ensName
  } catch (error) {
    return null
  }
}

// Update user with ENS data
async function updateUserENSData(userId: number, address: string) {
  const ensName = await resolveENSName(address)
  
  if (ensName) {
    const avatar = await publicClient.getEnsAvatar({ name: ensName })
    
    await db
      .update(users)
      .set({ ensName, avatar })
      .where(eq(users.id, userId))
  }
}
```

## Troubleshooting Authentication

### Common Issues

**Wallet Connection Fails:**
```typescript
// Check wallet availability
if (!window.ethereum) {
  throw new Error('No wallet detected. Please install MetaMask.')
}

// Handle connection rejection
try {
  await connect({ connector })
} catch (error) {
  if (error.code === 4001) {
    throw new Error('User rejected connection request')
  }
  throw error
}
```

**Signature Verification Fails:**
```typescript
// Debug signature verification
try {
  const recoveredAddress = verifyMessage({
    message: siweMessage,
    signature
  })
  
  if (recoveredAddress !== expectedAddress) {
    throw new Error('Signature verification failed')
  }
} catch (error) {
  console.error('Verification error:', error)
  throw new Error('Invalid signature')
}
```

**Token Expiration Issues:**
```typescript
// Handle expired tokens
const token = localStorage.getItem('authToken')

try {
  const response = await fetch('/api/protected', {
    headers: { Authorization: `Bearer ${token}` }
  })
  
  if (response.status === 401) {
    // Token expired, redirect to sign-in
    localStorage.removeItem('authToken')
    window.location.href = '/signin'
  }
} catch (error) {
  console.error('Auth error:', error)
}
```

**Session Cleanup:**
```typescript
// Manual session cleanup
async function cleanupExpiredSessions() {
  await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    
  console.log('Cleaned up expired sessions')
}
```

The authentication system provides secure, Web3-native user authentication with comprehensive session management and security features suitable for decentralized applications.