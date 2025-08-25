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
  private url: string
  private token?: string
  private readyPromise: Promise<void> | null = null

  constructor(url?: string) {
    this.url = url || `ws://${window.location.host}/ws`
    this.connect()
  }

  connect(token?: string) {
    if (token) {
      this.token = token
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log("WebSocket connected")
          this.isConnected = true
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

        this.ws.onclose = () => {
          console.log("WebSocket disconnected")
          this.isConnected = false
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          reject(error)
        }
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error)
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
      console.error("Max reconnection attempts reached")
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.reconnectAttempts++
      this.connect(this.token)
    }, delay)
  }
}
