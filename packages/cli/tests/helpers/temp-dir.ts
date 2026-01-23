import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const tempDirs: string[] = []

export function createTempDir(prefix = "quickdapp-test-"): {
  path: string
  cleanup: () => void
} {
  const path = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(path)

  return {
    path,
    cleanup: () => {
      rmSync(path, { recursive: true, force: true })
      const index = tempDirs.indexOf(path)
      if (index !== -1) {
        tempDirs.splice(index, 1)
      }
    },
  }
}

export function cleanupAllTempDirs(): void {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
  tempDirs.length = 0
}
