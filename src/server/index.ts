import { validateConfig } from "@shared/config/server"
import { createApp } from "./start-server"

// Validate environment configuration on startup
validateConfig()

// Start server if this is the main entry point
if (import.meta.main) {
  await createApp()
}

// Export createApp for tests and other imports
export { createApp }
