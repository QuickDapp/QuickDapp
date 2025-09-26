import type { ISocketManager } from "../../shared/websocket/socket-manager"
import type { WebSocketMessage } from "../../shared/websocket/types"
import type { Logger } from "../lib/logger"
import { WorkerIPCMessageType } from "./ipc-types"

/**
 * Worker-side SocketManager that sends IPC messages to the server process
 * to relay WebSocket messages through the server's SocketManager
 */
export class WorkerSocketManager implements ISocketManager {
  constructor(private log: Logger) {}

  async sendToUser(
    userId: number,
    message: WebSocketMessage,
  ): Promise<boolean> {
    try {
      if (process.send) {
        process.send({
          type: WorkerIPCMessageType.SendToUser,
          userId,
          message,
        })
        this.log.debug(`Sent WebSocket message via IPC to user ${userId}`)
        return true
      }
      this.log.warn("No IPC connection available to send message to user")
      return false
    } catch (error) {
      this.log.error(
        `Failed to send WebSocket message via IPC to user ${userId}:`,
        error,
      )
      return false
    }
  }

  async broadcast(message: WebSocketMessage): Promise<number> {
    try {
      if (process.send) {
        process.send({
          type: WorkerIPCMessageType.Broadcast,
          message,
        })
        this.log.debug("Broadcast WebSocket message via IPC")
        return 0 // Can't know actual recipient count from worker
      }
      this.log.warn("No IPC connection available to broadcast message")
      return 0
    } catch (error) {
      this.log.error("Failed to broadcast WebSocket message via IPC:", error)
      return 0
    }
  }

  // Other ISocketManager methods - workers don't handle direct connections
  async disconnectUser(userId: number): Promise<boolean> {
    this.log.debug(`Worker cannot directly disconnect user ${userId}`)
    return false
  }

  async getUserCount(): Promise<number> {
    this.log.debug("Worker cannot get user count directly")
    return 0
  }

  async isUserConnected(userId: number): Promise<boolean> {
    this.log.debug(
      `Worker cannot check if user ${userId} is connected directly`,
    )
    return false
  }
}
