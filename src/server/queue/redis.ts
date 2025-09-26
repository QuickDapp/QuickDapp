import Redis, { type RedisOptions } from "ioredis"
import { serverConfig } from "../../shared/config/server"

export interface RedisConnectionOptions {
  lazyConnect?: boolean
}

// Shared Redis instance for BullMQ to prevent multiple connections
let sharedRedisInstance: Redis | null = null

export function getSharedRedisConnection(): Redis {
  if (!sharedRedisInstance) {
    sharedRedisInstance = createRedisConnection({ lazyConnect: false })
  }
  return sharedRedisInstance
}

export function createRedisConnection(
  options: RedisConnectionOptions = {},
): Redis {
  const { lazyConnect = false } = options

  // Debug: Log Redis URL being used
  console.log(`🔗 Creating Redis connection to: ${serverConfig.REDIS_URL}`)

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
    console.error("Redis connection error:", error)
  })

  redis.on("connect", () => {
    console.log(`Redis connected to ${redisUrl.hostname}:${redisUrl.port}`)
  })

  redis.on("ready", () => {
    console.log("Redis connection ready")
  })

  redis.on("close", () => {
    console.log("Redis connection closed")
  })

  return redis
}

export async function testRedisConnection(redis: Redis): Promise<boolean> {
  try {
    const response = await redis.ping()
    return response === "PONG"
  } catch (error) {
    console.error("Redis health check failed:", error)
    return false
  }
}

export async function gracefulRedisShutdown(redis: Redis): Promise<void> {
  try {
    await redis.quit()
    console.log("Redis connection closed gracefully")
  } catch (error) {
    console.error("Error during Redis shutdown:", error)
    redis.disconnect()
  }
}

export async function shutdownSharedRedis(): Promise<void> {
  if (sharedRedisInstance) {
    await gracefulRedisShutdown(sharedRedisInstance)
    sharedRedisInstance = null
  }
}
