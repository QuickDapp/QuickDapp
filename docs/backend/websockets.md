# WebSockets

QuickDapp includes built-in WebSocket support for real-time communication between the server and clients. This enables live updates for token deployments, job status changes, and other application events.

## WebSocket Architecture

The WebSocket system consists of:

* **SocketManager** - Manages WebSocket connections and message routing
* **User-specific channels** - Routes messages to specific authenticated users
* **Notification system** - Sends structured notifications to connected clients
* **Integration with workers** - Background jobs can send real-time updates

## Server-Side Implementation

### SocketManager

The SocketManager handles WebSocket connections and message routing:

```typescript
// src/server/ws/SocketManager.ts
export interface ISocketManager {
  sendToUser(userId: string, message: any): Promise<void>
  sendToAll(message: any): Promise<void>
  getUserConnectionCount(userId: string): number
}

export class SocketManager implements ISocketManager {
  private connections = new Map<string, Set<WebSocket>>()
  private userConnections = new Map<string, Set<string>>()
  
  constructor(private logger: Logger) {}
  
  async handleConnection(ws: WebSocket, userId?: string) {
    const connectionId = this.generateConnectionId()
    this.logger.debug('WebSocket connection opened', { connectionId, userId })
    
    // Store connection
    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, new Set())
    }
    this.connections.get(connectionId)?.add(ws)
    
    // Associate with user if authenticated
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set())
      }
      this.userConnections.get(userId)?.add(connectionId)
    }
    
    // Handle connection close
    ws.addEventListener('close', () => {
      this.handleDisconnection(connectionId, userId)
    })
    
    // Send welcome message
    await this.sendToConnection(connectionId, {
      type: 'connected',
      connectionId,
      timestamp: new Date().toISOString()
    })
  }
  
  private handleDisconnection(connectionId: string, userId?: string) {
    this.logger.debug('WebSocket connection closed', { connectionId, userId })
    
    // Remove from connections
    this.connections.delete(connectionId)
    
    // Remove from user connections
    if (userId && this.userConnections.has(userId)) {
      this.userConnections.get(userId)?.delete(connectionId)
      if (this.userConnections.get(userId)?.size === 0) {
        this.userConnections.delete(userId)
      }
    }
  }
  
  async sendToUser(userId: string, message: any): Promise<void> {
    const userConnectionIds = this.userConnections.get(userId)
    if (!userConnectionIds || userConnectionIds.size === 0) {
      this.logger.debug('No connections found for user', { userId })
      return
    }
    
    const promises = Array.from(userConnectionIds).map(connectionId =>
      this.sendToConnection(connectionId, message)
    )
    
    await Promise.allSettled(promises)
  }
  
  async sendToAll(message: any): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(connectionId =>
      this.sendToConnection(connectionId, message)
    )
    
    await Promise.allSettled(promises)
  }
  
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size ?? 0
  }
  
  private async sendToConnection(connectionId: string, message: any): Promise<void> {
    const connections = this.connections.get(connectionId)
    if (!connections) return
    
    const messageStr = JSON.stringify(message)
    
    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(messageStr)
        } catch (error) {
          this.logger.error('Failed to send WebSocket message', { error, connectionId })
        }
      }
    }
  }
  
  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}
```

### WebSocket Routes

WebSocket endpoints are registered with ElysiaJS:

```typescript
// src/server/ws/index.ts
import { Elysia } from 'elysia'
import type { ServerApp } from '../types'
import { AuthService } from '../auth/AuthService'

export function createWebSocket(serverApp: ServerApp) {
  return new Elysia()
    .ws('/ws', {
      message: async (ws, message) => {
        // Handle incoming messages
        serverApp.createLogger('websocket').debug('Received message', { message })
      },
      
      open: async (ws) => {
        // Extract authentication from query parameters or headers
        const url = new URL(ws.upgradeReq.url || '', 'http://localhost')
        const token = url.searchParams.get('token')
        
        let userId: string | undefined
        
        if (token) {
          const authService = new AuthService(serverApp)
          const user = await authService.verifyJWT(token)
          if (user) {
            userId = user.id
          }
        }
        
        await serverApp.socketManager.handleConnection(ws, userId)
      }
    })
}
```

## Notification System

The notification system provides structured real-time updates:

```typescript
// src/server/lib/notifications.ts
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: any
  createdAt: string
  read: boolean
}

export function createNotificationFactory(socketManager: ISocketManager, db: Database) {
  return async function createNotification(params: {
    userId: string
    type: string
    title: string
    message: string
    data?: any
  }): Promise<void> {
    // Save notification to database
    const [notification] = await db
      .insert(notificationTable)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
        read: false
      })
      .returning()
    
    // Send real-time notification
    await socketManager.sendToUser(params.userId, {
      type: 'notification',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.parse(notification.data) : null,
        createdAt: notification.createdAt.toISOString(),
        read: notification.read
      }
    })
  }
}
```

## Integration with Background Jobs

Workers can send real-time updates through the notification system:

```typescript
// src/server/workers/jobs/deployToken.ts
export async function deployTokenJob(
  serverApp: ServerApp,
  job: Job<DeployTokenData>
) {
  const logger = serverApp.createLogger('deploy-token')
  
  try {
    // Send initial notification
    await serverApp.createNotification({
      userId: job.data.ownerId,
      type: 'token_deployment_started',
      title: 'Token Deployment Started',
      message: `Deploying ${job.data.name} (${job.data.symbol})...`,
      data: { jobId: job.id }
    })
    
    // Deploy the contract
    logger.info('Deploying token contract', { data: job.data })
    
    const hash = await serverApp.walletClient.deployContract({
      abi: ERC20_ABI,
      bytecode: ERC20_BYTECODE,
      args: [job.data.name, job.data.symbol, parseEther(job.data.initialSupply)]
    })
    
    // Send progress notification
    await serverApp.createNotification({
      userId: job.data.ownerId,
      type: 'token_deployment_pending',
      title: 'Transaction Submitted',
      message: 'Waiting for transaction confirmation...',
      data: { jobId: job.id, txHash: hash }
    })
    
    // Wait for deployment confirmation
    const receipt = await serverApp.publicClient.waitForTransactionReceipt({ 
      hash,
      confirmations: serverConfig.TX_BLOCK_CONFIRMATIONS_REQUIRED 
    })
    
    if (receipt.status !== 'success') {
      throw new Error('Transaction failed')
    }
    
    // Save token to database
    const [token] = await serverApp.db.insert(tokenTable).values({
      address: receipt.contractAddress!,
      name: job.data.name,
      symbol: job.data.symbol,
      initialSupply: job.data.initialSupply,
      ownerId: job.data.ownerId,
      deploymentTx: hash
    }).returning()
    
    // Send success notification
    await serverApp.createNotification({
      userId: job.data.ownerId,
      type: 'token_deployment_success',
      title: 'Token Deployed Successfully!',
      message: `${job.data.name} deployed at ${receipt.contractAddress}`,
      data: { 
        jobId: job.id,
        token: {
          id: token.id,
          address: token.address,
          name: token.name,
          symbol: token.symbol
        }
      }
    })
    
    logger.info('Token deployed successfully', { 
      address: receipt.contractAddress,
      txHash: hash 
    })
    
  } catch (error) {
    logger.error('Token deployment failed', { error })
    
    // Send error notification
    await serverApp.createNotification({
      userId: job.data.ownerId,
      type: 'token_deployment_failed',
      title: 'Token Deployment Failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: { jobId: job.id, error: error?.toString() }
    })
    
    throw error
  }
}
```

## Client-Side Integration

### WebSocket Connection

```typescript
// src/client/hooks/useWebSocket.ts
import { useEffect, useCallback, useRef } from 'react'
import ReconnectingWebSocket from 'reconnecting-websocket'

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<ReconnectingWebSocket | null>(null)
  
  const connect = useCallback(() => {
    const token = localStorage.getItem('auth-token')
    if (!token) return
    
    const wsUrl = `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`
    const ws = new ReconnectingWebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
    
    wsRef.current = ws
  }, [onMessage])
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])
  
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])
  
  return { connect, disconnect }
}
```

### Notification Hook

```typescript
// src/client/hooks/useNotifications.ts
import { useState, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'notification') {
      setNotifications(prev => [data.notification, ...prev])
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(data.notification.title, {
          body: data.notification.message,
          icon: '/favicon.ico'
        })
      }
    }
  }, [])
  
  useWebSocket(handleWebSocketMessage)
  
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])
  
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])
  
  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    clearAll
  }
}
```

### React Component Usage

```typescript
// src/client/components/NotificationCenter.tsx
import { useNotifications } from '../hooks/useNotifications'

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications()
  
  return (
    <div className="notification-center">
      <div className="header">
        <h3>Notifications ({unreadCount} unread)</h3>
        <button onClick={clearAll}>Clear All</button>
      </div>
      
      <div className="notifications">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification ${notification.read ? 'read' : 'unread'}`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="title">{notification.title}</div>
            <div className="message">{notification.message}</div>
            <div className="timestamp">
              {new Date(notification.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Message Types

Common WebSocket message types:

```typescript
// Connection status
{
  type: 'connected',
  connectionId: string,
  timestamp: string
}

// Notification
{
  type: 'notification',
  notification: {
    id: string,
    type: string,
    title: string,
    message: string,
    data?: any,
    createdAt: string,
    read: boolean
  }
}

// Job status updates
{
  type: 'job_status',
  jobId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  data?: any
}

// Real-time data updates
{
  type: 'data_update',
  entity: 'token' | 'user',
  action: 'created' | 'updated' | 'deleted',
  data: any
}
```

The WebSocket system provides a robust foundation for building real-time Web3 applications with live updates and excellent user experience.