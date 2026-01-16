import { readFileSync } from "fs"

const LOG_FILE = "/tmp/e2e-server.log"

/**
 * Extract verification code from server logs.
 * In dev/test mode, the mailer logs: "Body: Your verification code is: XXXXXX"
 */
export async function getVerificationCodeFromLogs(
  maxWaitMs = 5000,
): Promise<string> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const logs = readFileSync(LOG_FILE, "utf-8")
      const codeMatches = logs.match(/Your verification code is: (\d{6})/g)
      if (codeMatches && codeMatches.length > 0) {
        const lastMatch = codeMatches[codeMatches.length - 1]
        if (lastMatch) {
          const codeMatch = lastMatch.match(/(\d{6})/)
          if (codeMatch?.[1]) {
            return codeMatch[1]
          }
        }
      }
    } catch {
      // File may not exist yet
    }
    await new Promise((r) => setTimeout(r, 100))
  }

  throw new Error(
    `Could not find verification code in logs within ${maxWaitMs}ms`,
  )
}

/**
 * Count how many verification codes have been logged so far.
 * Used to detect when a new code is sent.
 */
export function getVerificationCodeCount(): number {
  try {
    const logs = readFileSync(LOG_FILE, "utf-8")
    const codeMatches = logs.match(/Your verification code is: (\d{6})/g)
    return codeMatches?.length ?? 0
  } catch {
    return 0
  }
}

/**
 * Wait for a new verification code to appear after a known count.
 */
export async function waitForNewVerificationCode(
  previousCount: number,
  maxWaitMs = 5000,
): Promise<string> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const logs = readFileSync(LOG_FILE, "utf-8")
      const codeMatches = logs.match(/Your verification code is: (\d{6})/g)
      if (codeMatches && codeMatches.length > previousCount) {
        const lastMatch = codeMatches[codeMatches.length - 1]
        if (lastMatch) {
          const codeMatch = lastMatch.match(/(\d{6})/)
          if (codeMatch?.[1]) {
            return codeMatch[1]
          }
        }
      }
    } catch {
      // File may not exist yet
    }
    await new Promise((r) => setTimeout(r, 100))
  }

  throw new Error(
    `Could not find new verification code in logs within ${maxWaitMs}ms`,
  )
}
