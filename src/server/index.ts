import { validateConfig } from "@shared/config/server"
import { createApp } from "./start-server"
import { startWorker } from "./start-worker"

// Validate environment configuration on startup
validateConfig()

// Check if we're running as a worker (WORKER_ID is set by worker manager when spawning)
const workerId = process.env.WORKER_ID
if (workerId) {
  // We're a worker process - start worker
  await startWorker(workerId)
} else {
  // We're the server process - start server if this is the main entry point
  if (import.meta.main) {
    await createApp()
  }
}

// Export createApp for tests and other imports
export { createApp }
