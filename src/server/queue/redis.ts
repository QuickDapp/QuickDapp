import Redis, { type RedisOptions } from "ioredis"
import { serverConfig } from "../../shared/config/server"
import type { Logger } from "../lib/logger"

export interface RedisConnectionOptions {
  lazyConnect?: boolean
}

export class RedisManager {
  private logger: Logger
  private redis: Redis | null = null

  constructor(logger: Logger) {
    this.logger = logger.child("redis")
  }

  /**
   * Get or create the shared Redis connection
   */
  getConnection(): Redis {
    if (!this.redis) {
      this.redis = this.createConnection({ lazyConnect: false })
    }
    return this.redis
  }

  /**
   * Create a new Redis connection with proper event handling
   */
  private createConnection(options: RedisConnectionOptions = {}): Redis {
    const { lazyConnect = false } = options

    this.logger.debug(`Creating Redis connection to: ${serverConfig.REDIS_URL}`)

    // Parse Redis URL
    const redisUrl = new URL(serverConfig.REDIS_URL)

    const redisOptions: RedisOptions = {
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
      password: redisUrl.password || undefined,
      db: Number(redisUrl.pathname.slice(1)) || 0,
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect,
      // Connection handling
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    }

    const redis = new Redis(redisOptions)

    // Error handling
    redis.on("error", (error) => {
      this.logger.error("Redis connection error:", error)
    })

    redis.on("connect", () => {
      this.logger.info(
        `Redis connected to ${redisUrl.hostname}:${redisUrl.port}`,
      )
    })

    redis.on("ready", () => {
      this.logger.info("Redis connection ready")
    })

    redis.on("close", () => {
      this.logger.info("Redis connection closed")
    })

    return redis
  }

  /**
   * Test the Redis connection health
   */
  async testConnection(): Promise<boolean> {
    try {
      const redis = this.getConnection()
      const response = await redis.ping()
      return response === "PONG"
    } catch (error) {
      this.logger.error("Redis health check failed:", error)
      return false
    }
  }

  /**
   * Gracefully shutdown the Redis connection
   */
  async shutdown(): Promise<void> {
    if (!this.redis) {
      return
    }

    try {
      await this.redis.quit()
      this.logger.info("Redis connection closed gracefully")
    } catch (error) {
      this.logger.error("Error during Redis shutdown:", error)
      this.redis.disconnect()
    } finally {
      this.redis = null
    }
  }
}

// Legacy exports for backward compatibility
export function getSharedRedisConnection(): Redis {
  throw new Error(
    "getSharedRedisConnection is deprecated. Use RedisManager class instead.",
  )
}

export function createRedisConnection(): Redis {
  throw new Error(
    "createRedisConnection is deprecated. Use RedisManager class instead.",
  )
}

export async function testRedisConnection(): Promise<boolean> {
  throw new Error(
    "testRedisConnection is deprecated. Use RedisManager class instead.",
  )
}

export async function gracefulRedisShutdown(): Promise<void> {
  throw new Error(
    "gracefulRedisShutdown is deprecated. Use RedisManager class instead.",
  )
}

export async function shutdownSharedRedis(): Promise<void> {
  throw new Error(
    "shutdownSharedRedis is deprecated. Use RedisManager class instead.",
  )
}
