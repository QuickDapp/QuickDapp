import { validateConfig } from "@shared/config/server"
import { startWorker } from "./queue/start-worker"
import { createApp } from "./start-server"

// Validate environment configuration on startup
validateConfig()

// Check if we're running as a worker subprocess
if (process.env.WORKER_ID) {
  // Worker subprocess mode - start BullMQ worker
  await startWorker()
} else {
  // Main server process - start server if main entry
  if (import.meta.main) {
    await createApp()
  }
}

// Export createApp for tests and other imports
export { createApp }
