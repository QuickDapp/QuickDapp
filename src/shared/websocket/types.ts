import type { NotificationData } from "../notifications/types"

export enum WebSocketMessageType {
  Connected = "connected",
  Registered = "registered",
  NotificationReceived = "notification_received",
}

export interface WebSocketMessage {
  type: WebSocketMessageType
  data: unknown
}

export interface ConnectedMessage extends WebSocketMessage {
  type: WebSocketMessageType.Connected
  data: {
    message: string
  }
}

export interface RegisteredMessage extends WebSocketMessage {
  type: WebSocketMessageType.Registered
  data: {
    userId: number
    message: string
  }
}

export interface NotificationReceivedMessage extends WebSocketMessage {
  type: WebSocketMessageType.NotificationReceived
  data: {
    id: number
    userId: number
    data: NotificationData
    createdAt: string
    read: boolean
  }
}

export type WebSocketEventMap = {
  [WebSocketMessageType.Connected]: ConnectedMessage
  [WebSocketMessageType.Registered]: RegisteredMessage
  [WebSocketMessageType.NotificationReceived]: NotificationReceivedMessage
}
