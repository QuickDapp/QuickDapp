import type { NotificationData } from "@shared/notifications/types"
import type { ISocketManager } from "@shared/websocket/socket-manager"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { Elysia } from "elysia"
import type { PublicClient, WalletClient } from "viem"
import type * as schema from "./db/schema"
import type { Logger } from "./lib/logger"
import type { QueueManager } from "./queue/manager"

/**
 * ServerApp type containing references to useful properties and methods
 * that get passed around the application
 */
export type ServerApp = {
  /** The server application instance */
  app: Elysia
  /** Database instance */
  db: PostgresJsDatabase<typeof schema>
  /** Root logger instance */
  rootLogger: Logger
  /** Create a logger with a category */
  createLogger: (category: string) => Logger
  /** Queue manager for background job processing */
  queueManager: QueueManager
  /** WebSocket manager for real-time communication */
  socketManager: ISocketManager
  /** Public blockchain client for reading */
  publicClient: PublicClient
  /** Wallet client for transactions (using server private key) */
  walletClient: WalletClient
  /** Create a notification for a user and send via WebSocket */
  createNotification: (
    userId: number,
    notificationData: NotificationData,
  ) => Promise<void>
}
