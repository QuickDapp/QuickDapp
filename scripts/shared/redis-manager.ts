import { $, spawn } from "bun"

export interface RedisManagerOptions {
  port: number
  containerName: string
  image?: string
  verbose?: boolean
  testMode?: boolean
}

export class RedisManager {
  private options: RedisManagerOptions

  constructor(options: RedisManagerOptions) {
    this.options = {
      image: "redis:alpine",
      verbose: false,
      testMode: false,
      ...options,
    }

    // In test mode, register cleanup handler
    if (this.options.testMode) {
      const cleanup = async () => {
        if (this.options.verbose) {
          console.log(
            `🧹 Test mode cleanup: removing Redis container ${this.options.containerName}`,
          )
        }
        await this.cleanup()
      }

      process.on("exit", cleanup)
      process.on("SIGINT", cleanup)
      process.on("SIGTERM", cleanup)
    }
  }

  async isDockerAvailable(): Promise<boolean> {
    try {
      await $`docker --version`
      return true
    } catch {
      return false
    }
  }

  async isPortAvailable(port: number): Promise<boolean> {
    try {
      await $`lsof -ti:${port}`
      return false // Port is in use
    } catch {
      return true // Port is available
    }
  }

  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const result = await $`docker ps -q -f name=${containerName}`.quiet()
      return result.text().trim().length > 0
    } catch {
      return false
    }
  }

  async isContainerStopped(containerName: string): Promise<boolean> {
    try {
      const result = await $`docker ps -aq -f name=${containerName}`.quiet()
      return result.text().trim().length > 0
    } catch {
      return false
    }
  }

  async ensureRedis(): Promise<void> {
    if (!(await this.isDockerAvailable())) {
      throw new Error(
        `Docker is required to run Redis. Install Docker Desktop or run: brew install redis && redis-server --port ${this.options.port}`,
      )
    }

    if (this.options.verbose) {
      console.log(`🔍 Checking Redis container: ${this.options.containerName}`)
    }

    if (this.options.testMode) {
      // In test mode: always kill existing containers and start fresh
      if (this.options.verbose) {
        console.log(
          `🧹 Test mode: cleaning up any existing Redis containers on port ${this.options.port}`,
        )
      }

      // Kill any container using our name
      try {
        await $`docker rm -f ${this.options.containerName}`.quiet()
        if (this.options.verbose) {
          console.log(
            `🗑️  Removed existing container: ${this.options.containerName}`,
          )
        }
      } catch {
        // Container doesn't exist, that's fine
      }

      // Kill any process using our port
      try {
        const pids = await $`lsof -ti:${this.options.port}`.quiet()
        if (pids.text().trim()) {
          await $`kill -9 ${pids.text().trim()}`.quiet()
          if (this.options.verbose) {
            console.log(`🗑️  Killed process on port ${this.options.port}`)
          }
        }
      } catch {
        // No process on port, that's fine
      }
    } else {
      // Non-test mode: try to reuse existing containers
      if (await this.isContainerRunning(this.options.containerName)) {
        if (this.options.verbose) {
          console.log(
            `✅ Redis container already running on port ${this.options.port}`,
          )
        }
        await this.waitForConnection()
        return
      }

      if (await this.isContainerStopped(this.options.containerName)) {
        if (this.options.verbose) {
          console.log(
            `🔄 Starting existing Redis container: ${this.options.containerName}`,
          )
        }
        await $`docker start ${this.options.containerName}`
        await this.waitForConnection()
        if (this.options.verbose) {
          console.log(`✅ Redis ready on port ${this.options.port}`)
        }
        return
      }

      // Check if port is available for new container
      if (!(await this.isPortAvailable(this.options.port))) {
        throw new Error(
          `Port ${this.options.port} is already in use. Stop the process using the port or use a different port.`,
        )
      }
    }

    // Create new container
    if (this.options.verbose) {
      console.log(
        `🚀 Creating new Redis container: ${this.options.containerName}`,
      )
    }
    await $`docker run -d --name ${this.options.containerName} -p ${this.options.port}:6379 ${this.options.image}`

    await this.waitForConnection()

    if (this.options.verbose) {
      console.log(`✅ Redis ready on port ${this.options.port}`)
    }
  }

  async waitForConnection(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Use docker exec to ping Redis inside the container
        await $`docker exec ${this.options.containerName} redis-cli ping`.quiet()
        return
      } catch {
        if (this.options.verbose) {
          console.log(
            `⏳ Waiting for Redis connection on port ${this.options.port}...`,
          )
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    throw new Error(
      `Redis failed to start within ${timeoutMs}ms on port ${this.options.port}`,
    )
  }

  async cleanup(): Promise<void> {
    if (this.options.verbose) {
      console.log(
        `🧹 Cleaning up Redis container: ${this.options.containerName}`,
      )
    }

    try {
      // Stop container if running
      if (await this.isContainerRunning(this.options.containerName)) {
        await $`docker stop ${this.options.containerName}`
        if (this.options.verbose) {
          console.log(
            `🛑 Stopped Redis container: ${this.options.containerName}`,
          )
        }
      }

      // Remove container if exists
      if (await this.isContainerStopped(this.options.containerName)) {
        await $`docker rm ${this.options.containerName}`
        if (this.options.verbose) {
          console.log(
            `🗑️  Removed Redis container: ${this.options.containerName}`,
          )
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️  Error during cleanup: ${error}`)
      }
    }
  }

  async flushAll(): Promise<void> {
    try {
      await $`redis-cli -p ${this.options.port} flushall`
      if (this.options.verbose) {
        console.log(
          `🧹 Flushed all data from Redis on port ${this.options.port}`,
        )
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️  Error flushing Redis: ${error}`)
      }
    }
  }
}

// Convenience factory functions
export function createDevRedisManager(verbose = false): RedisManager {
  return new RedisManager({
    port: 6379,
    containerName: "redis-quickdapp-dev",
    verbose,
  })
}

export function createTestRedisManager(verbose = false): RedisManager {
  return new RedisManager({
    port: 6380,
    containerName: "redis-quickdapp-test",
    verbose,
    testMode: true,
  })
}
