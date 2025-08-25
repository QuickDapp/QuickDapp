import { clientConfig } from "../../../shared/config/client"
import {
  type WebSocketMessage,
  WebSocketMessageType,
} from "../../../shared/websocket/types"

export interface SocketEventHandler {
  type: WebSocketMessageType
  handler: (message: WebSocketMessage) => void
}

/**
 * WebSocket client for real-time communication with the server
 */
export class Socket {
  private ws: WebSocket | null = null
  private handlers: SocketEventHandler[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnected = false
  private isReconnecting = false
  private url: string
  private token?: string
  private readyPromise: Promise<void> | null = null

  constructor(url?: string) {
    this.url = url || this.getWebSocketUrl()
    this.connect()
  }

  private getWebSocketUrl(): string {
    // In development mode with Vite dev server, use the current host which will be proxied
    // In production, use BASE_URL from client config
    if (clientConfig.NODE_ENV === "development") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      return `${protocol}//${window.location.host}/ws`
    }

    // Production: Use BASE_URL from client config
    const baseUrl = new URL(clientConfig.BASE_URL)
    const protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${baseUrl.host}/ws`
  }

  connect(token?: string) {
    if (token) {
      this.token = token
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isReconnecting) {
      return
    }

    this.isReconnecting = true

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log(`WebSocket connected to ${this.url}`)
          this.isConnected = true
          this.isReconnecting = false
          this.reconnectAttempts = 0

          // Send registration message
          this.send({
            type: "register",
            jwtToken: this.token,
          })

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage
            this.handleMessage(message)
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error)
          }
        }

        this.ws.onclose = (event) => {
          console.log(
            `WebSocket disconnected (code: ${event.code}, reason: ${event.reason || "none"})`,
          )
          this.isConnected = false
          this.isReconnecting = false
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error(`WebSocket error (url: ${this.url}):`, error)
          this.isReconnecting = false
          reject(error)
        }
      } catch (error) {
        console.error(
          `Failed to create WebSocket connection to ${this.url}:`,
          error,
        )
        this.isReconnecting = false
        reject(error)
        this.attemptReconnect()
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  subscribe(
    type: WebSocketMessageType,
    handler: (message: WebSocketMessage) => void,
  ): () => void {
    const eventHandler: SocketEventHandler = { type, handler }
    this.handlers.push(eventHandler)

    // Return unsubscribe function
    return () => {
      const index = this.handlers.indexOf(eventHandler)
      if (index > -1) {
        this.handlers.splice(index, 1)
      }
    }
  }

  get connected(): boolean {
    return this.isConnected
  }

  onceReady(): Promise<void> {
    return this.readyPromise || Promise.resolve()
  }

  setJwtToken(token?: string) {
    this.token = token
    if (this.isConnected && this.ws) {
      // Re-register with new token
      this.send({
        type: "register",
        jwtToken: this.token,
      })
    }
  }

  /**
   * Force reconnection with new token (e.g., after authentication)
   */
  reconnectWithToken(token?: string) {
    console.log("WebSocket: Forcing reconnection with new token")
    if (token) {
      this.token = token
    }

    // Disconnect current connection
    this.disconnect()

    // Reset reconnection attempts for fresh start
    this.reconnectAttempts = 0

    // Reconnect with new token
    this.connect(this.token)
  }

  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const matchingHandlers = this.handlers.filter(
      (h) => h.type === message.type,
    )
    matchingHandlers.forEach((h) => h.handler(message))
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Max reconnection attempts reached (${this.maxReconnectAttempts}). WebSocket connection failed permanently.`,
      )
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(
      `Attempting to reconnect to ${this.url} in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.reconnectAttempts++
      this.connect(this.token)
    }, delay)
  }
}
