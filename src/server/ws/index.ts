import Elysia, { t } from "elysia"
import type { ISocketManager } from "../../shared/websocket/socket-manager"
import type { WebSocketMessage } from "../../shared/websocket/types"
import { AuthService } from "../auth/index"
import type { Logger } from "../lib/logger"
import type { ServerApp } from "../types"

export const createWebSocket = (serverApp: ServerApp) => {
  const log = serverApp.createLogger("ws")
  const authService = new AuthService(serverApp)

  return new Elysia().ws("/ws", {
    body: t.Object({
      type: t.Literal("register"),
      jwtToken: t.Optional(t.String()),
    }),
    response: t.Object({
      type: t.String(),
      data: t.Unknown(),
    }),
    close(ws) {
      log.debug(`Client disconnected: ${ws.id}`)
      ;(serverApp.socketManager as SocketManager).deregister(ws.id)
    },
    message(ws, message) {
      const { type, jwtToken } = message
      ;(async () => {
        if (type === "register") {
          log.debug(`Client connected: ${ws.id}`)

          // Register client with socket manager
          ;(serverApp.socketManager as SocketManager).registerClient(ws, ws.id)

          // If JWT token provided, authenticate and associate with user
          if (jwtToken) {
            try {
              const user = await authService.verifyToken(jwtToken)
              if (user?.wallet) {
                // For now, use wallet address as user identifier
                // In a real app, you'd map wallet to user ID from database
                const userIdHash = user.wallet.toLowerCase().slice(2, 10) // Simple hash for demo
                const userId = parseInt(userIdHash, 16) % 1000000 // Convert to reasonable number
                ;(serverApp.socketManager as SocketManager).registerUser(
                  ws.id,
                  userId,
                )
                log.debug(
                  `Client ${ws.id} authenticated as user ${userId} (${user.wallet})`,
                )
              }
            } catch (err) {
              log.error(`Error verifying JWT token`, err)
            }
          }
        }
      })()
    },
  })
}

export class SocketManager implements ISocketManager {
  private log: Logger
  private mapClientIdToSocket: Record<string, any> = {}
  private mapUserIdToClientIds: Record<number, Set<string>> = {}
  private mapClientIdToUserId: Record<string, number> = {}

  constructor(log: Logger) {
    this.log = log
  }

  public registerClient(socket: any, clientId: string) {
    this.log.debug(`Registering client: ${clientId}`)
    this.mapClientIdToSocket[clientId] = socket
  }

  public registerUser(clientId: string, userId: number) {
    this.log.debug(`Associating client ${clientId} with user ${userId}`)

    // Remove any existing association for this client
    const existingUserId = this.mapClientIdToUserId[clientId]
    if (existingUserId) {
      this.mapUserIdToClientIds[existingUserId]?.delete(clientId)
      if (this.mapUserIdToClientIds[existingUserId]?.size === 0) {
        delete this.mapUserIdToClientIds[existingUserId]
      }
    }

    // Add new association
    this.mapClientIdToUserId[clientId] = userId
    if (!this.mapUserIdToClientIds[userId]) {
      this.mapUserIdToClientIds[userId] = new Set()
    }
    this.mapUserIdToClientIds[userId].add(clientId)
  }

  public async sendToUser(
    userId: number,
    message: WebSocketMessage,
  ): Promise<boolean> {
    const clientIds = this.mapUserIdToClientIds[userId]
    if (!clientIds || clientIds.size === 0) {
      this.log.debug(`No connected clients for user ${userId}`)
      return false
    }

    let sent = false
    for (const clientId of clientIds) {
      const socket = this.mapClientIdToSocket[clientId]
      if (socket) {
        try {
          socket.send(message)
          sent = true
          this.log.debug(
            `Message sent to user ${userId} via client ${clientId}`,
          )
        } catch (err) {
          this.log.error(`Error sending message to client ${clientId}:`, err)
        }
      }
    }

    return sent
  }

  public async broadcast(message: WebSocketMessage): Promise<number> {
    let count = 0
    for (const clientId in this.mapClientIdToSocket) {
      const socket = this.mapClientIdToSocket[clientId]
      if (socket) {
        try {
          socket.send(message)
          count++
        } catch (err) {
          this.log.error(`Error broadcasting to client ${clientId}:`, err)
        }
      }
    }
    this.log.debug(`Broadcast message sent to ${count} clients`)
    return count
  }

  public deregister(clientId: string) {
    this.log.debug(`Deregistering client: ${clientId}`)

    // Remove from client socket map
    delete this.mapClientIdToSocket[clientId]

    // Remove user association
    const userId = this.mapClientIdToUserId[clientId]
    if (userId) {
      delete this.mapClientIdToUserId[clientId]
      this.mapUserIdToClientIds[userId]?.delete(clientId)
      if (this.mapUserIdToClientIds[userId]?.size === 0) {
        delete this.mapUserIdToClientIds[userId]
      }
    }
  }

  public getConnectedUsersCount(): number {
    return Object.keys(this.mapUserIdToClientIds).length
  }

  public getConnectedClientsCount(): number {
    return Object.keys(this.mapClientIdToSocket).length
  }
}
