import { cleanupAuditLogJob } from "./cleanupAuditLog"
import { deployMulticall3Job } from "./deployMulticall3"
import type { JobRegistry } from "./types"
import { watchChainJob } from "./watchChain"

// Job registry containing all available jobs
export const jobRegistry: JobRegistry = {
  cleanupAuditLog: cleanupAuditLogJob,
  watchChain: watchChainJob,
  deployMulticall3: deployMulticall3Job,
}

// Export individual job objects (avoiding conflicts from multiple 'run' exports)
export { cleanupAuditLogJob } from "./cleanupAuditLog"
export { deployMulticall3Job } from "./deployMulticall3"
export { watchChainJob } from "./watchChain"
