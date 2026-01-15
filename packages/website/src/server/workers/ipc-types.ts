export enum WorkerIPCMessageType {
  WorkerStarted = "worker-started",
  WorkerShutdown = "worker-shutdown",
  WorkerError = "worker-error",
  Heartbeat = "heartbeat",
}

export interface WorkerStartedMessage {
  type: WorkerIPCMessageType.WorkerStarted
  pid: number
}

export interface WorkerShutdownMessage {
  type: WorkerIPCMessageType.WorkerShutdown
  pid: number
}

export interface WorkerErrorMessage {
  type: WorkerIPCMessageType.WorkerError
  error: string
  pid: number
}

export interface HeartbeatMessage {
  type: WorkerIPCMessageType.Heartbeat
  pid: number
}

export type WorkerIPCMessage =
  | WorkerStartedMessage
  | WorkerShutdownMessage
  | WorkerErrorMessage
  | HeartbeatMessage
