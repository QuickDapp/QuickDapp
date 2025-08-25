export enum WebSocketMessageType {
  NotificationReceived = "notification_received",
  // Future: TokenCreated, TokenTransferred, etc.
}

export interface WebSocketMessage {
  type: WebSocketMessageType
  data: unknown
}

export interface NotificationReceivedMessage extends WebSocketMessage {
  type: WebSocketMessageType.NotificationReceived
  data: {
    id: number
    userId: number
    data: any
    createdAt: string
    read: boolean
  }
}

export type WebSocketEventMap = {
  [WebSocketMessageType.NotificationReceived]: NotificationReceivedMessage
}
