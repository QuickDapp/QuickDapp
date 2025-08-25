import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import {
  type WebSocketMessage,
  WebSocketMessageType,
} from "../../../shared/websocket/types"
import { Socket } from "../lib/socket"
import { useAuthContext } from "./AuthContext"

interface SocketContextValue {
  connected: boolean
  subscribe: (
    type: WebSocketMessageType,
    handler: (message: WebSocketMessage) => void,
  ) => () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { authToken } = useAuthContext()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Initialize socket connection
  useEffect(() => {
    console.debug("SocketProvider: Initializing socket connection")

    const socket = new Socket()
    socketRef.current = socket

    // Track connection status
    const checkConnectionStatus = () => {
      setConnected(socket.connected)
    }

    // Check connection status periodically
    const interval = setInterval(checkConnectionStatus, 1000)

    // Initial status check
    socket
      .onceReady()
      .then(() => {
        checkConnectionStatus()
      })
      .catch(() => {
        checkConnectionStatus()
      })

    return () => {
      clearInterval(interval)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  // Update JWT token when auth state changes
  useEffect(() => {
    if (socketRef.current) {
      console.debug(
        "SocketProvider: Updating JWT token",
        authToken ? "present" : "not present",
      )
      socketRef.current.setJwtToken(authToken ?? undefined)
    }
  }, [authToken])

  const subscribe = (
    type: WebSocketMessageType,
    handler: (message: WebSocketMessage) => void,
  ) => {
    if (!socketRef.current) {
      console.warn(
        "SocketProvider: Attempted to subscribe but socket not available",
      )
      return () => {} // Return no-op unsubscribe
    }

    return socketRef.current.subscribe(type, handler)
  }

  const contextValue: SocketContextValue = {
    connected,
    subscribe,
  }

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
