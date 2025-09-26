import { $ } from "bun"

export interface RedisManagerOptions {
  port: number
  verbose?: boolean
}

export class RedisManager {
  private options: RedisManagerOptions

  constructor(options: RedisManagerOptions) {
    this.options = {
      verbose: false,
      ...options,
    }
  }

  async checkConnection(): Promise<void> {
    if (this.options.verbose) {
      console.log(`🔍 Checking Redis connection on port ${this.options.port}`)
    }

    try {
      await $`redis-cli -p ${this.options.port} ping`.quiet()
      if (this.options.verbose) {
        console.log(`✅ Redis is running on port ${this.options.port}`)
      }
    } catch (_error) {
      const port = this.options.port
      const isDevPort = port === 6379
      const isTestPort = port === 6380

      let command = `redis-server --port ${port}`
      if (isDevPort) {
        command = "bun redis:dev"
      } else if (isTestPort) {
        command = "bun redis:test"
      }

      throw new Error(
        `Redis is not running on port ${port}. Please start it with: ${command}`,
      )
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
      throw error
    }
  }
}

// Convenience factory functions
export function createDevRedisManager(verbose = false): RedisManager {
  return new RedisManager({
    port: 6379,
    verbose,
  })
}

export function createTestRedisManager(verbose = false): RedisManager {
  return new RedisManager({
    port: 6380,
    verbose,
  })
}
