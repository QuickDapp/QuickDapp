# Users

QuickDapp provides a comprehensive user management system built around Ethereum wallet addresses and Sign-in with Ethereum (SIWE) authentication. Users can connect their wallets, manage tokens, and receive real-time notifications about their activities.

## User Model

Users in QuickDapp are identified by their Ethereum wallet addresses:

```typescript
// Database schema
export const userTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: text('address').notNull().unique(),
  nonce: text('nonce').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// TypeScript type
export interface User {
  id: string
  address: string
  nonce: string
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
}
```

## Authentication Flow

### Wallet-Based Authentication

QuickDapp uses SIWE (Sign-in with Ethereum) for decentralized authentication:

1. **Wallet Connection** - User connects their wallet (MetaMask, WalletConnect, etc.)
2. **Nonce Request** - Client requests a unique nonce for the wallet address
3. **Message Signing** - User signs a SIWE message with their private key
4. **Verification** - Server verifies the signature and issues a JWT token
5. **Session Management** - JWT token used for subsequent API requests

### User Registration

Users are automatically registered when they first authenticate:

```typescript
// Automatic user creation during authentication
export async function verifySignature(message: string, signature: string): Promise<User | null> {
  const siweMessage = new SiweMessage(message)
  
  // Verify signature
  const result = await siweMessage.verify({ signature })
  if (!result.success) return null
  
  // Find or create user
  let [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.address, siweMessage.address))
  
  if (!user) {
    // Create new user
    [user] = await db
      .insert(userTable)
      .values({
        address: siweMessage.address,
        nonce: generateNonce()
      })
      .returning()
  }
  
  return user
}
```

## User Roles

### Regular Users
Default user role with access to:
* Token deployment and management
* Personal dashboard and activity history
* Real-time notifications
* GraphQL API for owned resources

### Admin Users
Enhanced permissions for administrative functions:
* System-wide statistics and monitoring
* User management capabilities
* Access to administrative GraphQL operations
* Advanced debugging and logging features

```typescript
// Admin check in GraphQL resolvers
export const adminResolvers = {
  Query: {
    allUsers: async (parent, args, context) => {
      const { user } = context
      if (!user?.isAdmin) {
        throw new Error('Admin access required')
      }
      
      return await serverApp.db.select().from(userTable)
    }
  }
}
```

## User Profile Management

### Profile Data

Users can manage their profile information:

```typescript
// Extended user profile
export const userProfileTable = pgTable('user_profiles', {
  userId: uuid('user_id').references(() => userTable.id).primaryKey(),
  displayName: text('display_name'),
  email: text('email'),
  bio: text('bio'),
  website: text('website'),
  twitter: text('twitter'),
  github: text('github'),
  avatar: text('avatar'), // IPFS hash or URL
  preferences: text('preferences'), // JSON string
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Profile Updates

GraphQL mutations for profile management:

```graphql
type Mutation {
  updateProfile(input: UpdateProfileInput!): UserProfile! @auth
}

input UpdateProfileInput {
  displayName: String
  email: String
  bio: String
  website: String
  twitter: String
  github: String
}

type UserProfile {
  userId: ID!
  displayName: String
  email: String
  bio: String
  website: String
  twitter: String
  github: String
  avatar: String
  preferences: JSON
  updatedAt: String!
}
```

## User Activity

### Activity Tracking

Track user actions for history and analytics:

```typescript
export const userActivityTable = pgTable('user_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => userTable.id).notNull(),
  action: text('action').notNull(), // 'token_deployed', 'token_transferred', etc.
  entityType: text('entity_type'), // 'token', 'transaction', etc.
  entityId: text('entity_id'),
  metadata: text('metadata'), // JSON string with additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Activity Logging

Automatic activity logging through the backend:

```typescript
// Activity service
export class ActivityService {
  constructor(private serverApp: ServerApp) {}
  
  async logActivity(userId: string, action: string, entityType?: string, entityId?: string, metadata?: any) {
    await this.serverApp.db.insert(userActivityTable).values({
      userId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null
    })
  }
}

// Usage in resolvers
export const tokenResolvers = {
  Mutation: {
    deployToken: async (parent, { input }, context) => {
      const { serverApp, user } = context
      
      // Submit deployment job
      await serverApp.workerManager.submitJob({
        type: 'deployToken',
        data: { ...input, ownerId: user.id }
      })
      
      // Log activity
      const activityService = new ActivityService(serverApp)
      await activityService.logActivity(
        user.id, 
        'token_deployment_started',
        'token',
        null,
        { name: input.name, symbol: input.symbol }
      )
      
      return { success: true }
    }
  }
}
```

## User Dashboard

### Dashboard Data

GraphQL queries for user dashboard:

```graphql
type Query {
  dashboard: UserDashboard! @auth
}

type UserDashboard {
  user: User!
  stats: DashboardStats!
  recentTokens: [Token!]!
  recentActivity: [Activity!]!
  notifications: [Notification!]!
}

type DashboardStats {
  totalTokens: Int!
  totalTransactions: Int!
  totalValue: String! # In ETH
  activeTokens: Int!
}
```

### Dashboard Implementation

```typescript
export const dashboardResolvers = {
  Query: {
    dashboard: async (parent, args, context) => {
      const { serverApp, user } = context
      
      // Get user tokens
      const tokens = await serverApp.db
        .select()
        .from(tokenTable)
        .where(eq(tokenTable.ownerId, user.id))
        .orderBy(desc(tokenTable.createdAt))
        .limit(5)
      
      // Get recent activity
      const activity = await serverApp.db
        .select()
        .from(userActivityTable)
        .where(eq(userActivityTable.userId, user.id))
        .orderBy(desc(userActivityTable.createdAt))
        .limit(10)
      
      // Get stats
      const totalTokens = await serverApp.db
        .select({ count: count() })
        .from(tokenTable)
        .where(eq(tokenTable.ownerId, user.id))
        .then(rows => rows[0].count)
      
      return {
        user,
        stats: {
          totalTokens,
          totalTransactions: 0, // Calculate from activity
          totalValue: '0',
          activeTokens: totalTokens
        },
        recentTokens: tokens,
        recentActivity: activity,
        notifications: [] // Will be populated by notification system
      }
    }
  }
}
```

## Notification System

### User Notifications

Real-time notifications for user activities:

```typescript
export const notificationTable = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => userTable.id).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'), // JSON string
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Notification Types

Common notification types in QuickDapp:

* `token_deployed` - Token deployment completed
* `token_deployment_failed` - Token deployment failed
* `transaction_confirmed` - Transaction confirmed on blockchain
* `system_maintenance` - System maintenance notifications
* `security_alert` - Security-related notifications

### Frontend Notification Hook

React hook for managing user notifications:

```typescript
// src/client/hooks/useNotifications.ts
import { useState, useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import { graphqlClient } from '../lib/graphql'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Load initial notifications
  useEffect(() => {
    loadNotifications()
  }, [])
  
  // Listen for real-time notifications
  useWebSocket((data) => {
    if (data.type === 'notification') {
      setNotifications(prev => [data.notification, ...prev])
      setUnreadCount(prev => prev + 1)
    }
  })
  
  const loadNotifications = async () => {
    const data = await graphqlClient.request(`
      query GetNotifications($limit: Int) {
        notifications(limit: $limit) {
          id
          type
          title
          message
          read
          createdAt
        }
      }
    `, { limit: 50 })
    
    setNotifications(data.notifications)
    setUnreadCount(data.notifications.filter(n => !n.read).length)
  }
  
  const markAsRead = async (notificationId: string) => {
    await graphqlClient.request(`
      mutation MarkNotificationRead($id: ID!) {
        markNotificationRead(id: $id)
      }
    `, { id: notificationId })
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    reload: loadNotifications
  }
}
```

## Privacy and Security

### Data Privacy

User data privacy considerations:
* **Minimal Data Collection** - Only collect necessary data (wallet address, preferences)
* **No Personal Information** - No email, phone, or personal details required
* **Blockchain Transparency** - All token activities are publicly visible on blockchain
* **Local Storage** - Sensitive data stays in user's wallet/browser

### Security Measures

User security features:
* **Wallet-Only Authentication** - No passwords to compromise
* **Session Management** - JWT tokens with expiration
* **Address Verification** - All actions verified against wallet ownership
* **Nonce Protection** - Prevent replay attacks with unique nonces

### Data Export

Allow users to export their data:

```typescript
// GraphQL mutation for data export
type Mutation {
  exportUserData: UserDataExport! @auth
}

type UserDataExport {
  user: User!
  tokens: [Token!]!
  activity: [Activity!]!
  notifications: [Notification!]!
  exportedAt: String!
}
```

## Documentation Sections

* [Authentication](./authentication.md) - Wallet authentication and session management

The user management system in QuickDapp provides a secure, privacy-focused approach to user identity and data management while maintaining the decentralized principles of Web3.