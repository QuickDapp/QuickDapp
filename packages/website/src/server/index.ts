import { serverConfig, validateConfig } from "@shared/config/server"
import { createApp } from "./start-server"
import { startWorker } from "./start-worker"

validateConfig()

if (serverConfig.WORKER_ID) {
  await startWorker(serverConfig.WORKER_ID)
} else {
  if (import.meta.main) {
    await createApp()
  }
}

export { createApp }
