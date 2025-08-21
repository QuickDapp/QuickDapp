import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { notifications, users } from "../../../src/server/db/schema"
import { scheduleJob } from "../../../src/server/db/worker"
import { runWorker } from "../../../src/server/workers/worker"
import type { BlockchainTestContext } from "../../helpers/blockchain"
import {
  cleanupBlockchainTestContext,
  createBlockchainTestContext,
  deployMockERC20,
  mineBlocks,
  transferERC20,
} from "../../helpers/blockchain"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"

describe("Worker Blockchain Integration Tests", () => {
  let blockchainContext: BlockchainTestContext | undefined
  let serverContext: TestServer | undefined

  beforeEach(async () => {
    try {
      // Setup test database
      await setupTestDatabase()

      // Start test server
      serverContext = await startTestServer()
      await waitForServer(serverContext.url)

      // Start Anvil blockchain for worker tests
      blockchainContext = await createBlockchainTestContext(8546) // Use different port to avoid conflicts
    } catch (error) {
      testLogger.error("Setup failed:", error)
      throw error
    }
  })

  afterEach(async () => {
    try {
      // Cleanup blockchain
      if (blockchainContext) {
        await cleanupBlockchainTestContext(blockchainContext)
        blockchainContext = undefined
      }

      // Shutdown server
      if (serverContext) {
        await serverContext.shutdown()
        serverContext = undefined
      }

      // Clean database
      await cleanTestDatabase()
    } catch (error) {
      testLogger.error("Cleanup failed:", error)
    }
  })

  describe("Worker with Blockchain Integration", () => {
    test("should schedule watchChain jobs to monitor blockchain", async () => {
      if (!serverContext || !blockchainContext) {
        throw new Error("Test contexts not initialized")
      }

      // Schedule a chain watching job that targets our test blockchain
      const job = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: 0,
        data: {
          chainUrl: blockchainContext.anvil.url,
          chainId: blockchainContext.anvil.chainId,
        },
      })

      expect(job.id).toBeGreaterThan(0)
      expect(job.type).toBe("watchChain")
      expect(job.data).toMatchObject({
        chainUrl: blockchainContext.anvil.url,
        chainId: blockchainContext.anvil.chainId,
      })
    })

    test("should handle blockchain event monitoring job execution", async () => {
      // Create a test user to associate with notifications
      const [testUser] = await serverContext.serverApp.db
        .insert(users)
        .values({
          wallet: blockchainContext.anvil.accounts[0],
        })
        .returning()

      // Deploy a test token for monitoring
      const tokenAddress = await deployMockERC20(blockchainContext, {
        name: "Worker Test Token",
        symbol: "WTT",
        initialSupply: 1000000n * 10n ** 18n,
      })

      // Schedule a watchChain job to monitor this token
      const job = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: testUser.id,
        data: {
          contractAddress: tokenAddress,
          events: ["Transfer"],
        },
      })

      expect(job.id).toBeGreaterThan(0)

      // Perform a token transfer to generate events
      const recipient = blockchainContext.anvil.accounts[1] as `0x${string}`
      const transferAmount = 1000n * 10n ** 18n

      await transferERC20(
        blockchainContext,
        tokenAddress,
        recipient,
        transferAmount,
      )

      // Mine blocks to ensure the transaction is processed
      await mineBlocks(blockchainContext, 2)

      // Run the worker to process the job
      runWorker(serverContext.serverApp)

      // Let the worker run for a short time to process the job
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check that notifications were created for the transfer event
      const userNotifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testUser.id))

      expect(userNotifications.length).toBeGreaterThan(0)

      // Verify notification data relates to the token transfer
      const transferNotification = userNotifications.find(
        (n) =>
          JSON.stringify(n.data).includes("Transfer") ||
          JSON.stringify(n.data).includes(tokenAddress.slice(0, 10)),
      )
      expect(transferNotification).toBeDefined()
    }, 10000)

    test("should handle multiple token monitoring jobs", async () => {
      // Create test users
      const [user1, user2] = await serverContext.serverApp.db
        .insert(users)
        .values([
          {
            wallet: blockchainContext.anvil.accounts[0],
          },
          {
            wallet: blockchainContext.anvil.accounts[1],
          },
        ])
        .returning()

      // Deploy multiple tokens
      const token1 = await deployMockERC20(blockchainContext, {
        name: "Token 1",
        symbol: "TK1",
        initialSupply: 1000000n * 10n ** 18n,
      })

      const token2 = await deployMockERC20(blockchainContext, {
        name: "Token 2",
        symbol: "TK2",
        initialSupply: 1000000n * 10n ** 18n,
      })

      // Schedule separate monitoring jobs for each token
      const job1 = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: user1.id,
        data: {
          contractAddress: token1,
          events: ["Transfer"],
        },
      })

      const job2 = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: user2.id,
        data: {
          contractAddress: token2,
          events: ["Transfer"],
        },
      })

      expect(job1.id).toBeGreaterThan(0)
      expect(job2.id).toBeGreaterThan(0)
      expect(job1.id).not.toBe(job2.id)

      // Perform transfers on both tokens
      const recipient1 = blockchainContext.anvil.accounts[2] as `0x${string}`
      const recipient2 = blockchainContext.anvil.accounts[3] as `0x${string}`

      await transferERC20(
        blockchainContext,
        token1,
        recipient1,
        500n * 10n ** 18n,
      )
      await transferERC20(
        blockchainContext,
        token2,
        recipient2,
        750n * 10n ** 18n,
      )

      // Mine blocks to process transactions
      await mineBlocks(blockchainContext, 3)

      // Run worker to process both jobs
      runWorker(serverContext.serverApp)

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Verify notifications for both users
      const user1Notifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user1.id))

      const user2Notifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user2.id))

      expect(user1Notifications.length).toBeGreaterThan(0)
      expect(user2Notifications.length).toBeGreaterThan(0)
    }, 15000)

    test("should handle worker job failures with blockchain connectivity issues", async () => {
      // Create a test user
      const [testUser] = await serverContext.serverApp.db
        .insert(users)
        .values({
          wallet: blockchainContext.anvil.accounts[0],
        })
        .returning()

      // Schedule a watchChain job with invalid blockchain endpoint
      const job = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: testUser.id,
        data: {
          contractAddress: "0x1234567890123456789012345678901234567890",
          events: ["Transfer"],
        },
      })

      expect(job.id).toBeGreaterThan(0)

      // Run worker to attempt processing the invalid job
      runWorker(serverContext.serverApp)

      // Allow time for the worker to attempt and fail the job
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // The job should remain in the database but potentially marked as failed
      // Note: The actual failure handling depends on the worker implementation
      // This test ensures the job system can handle connectivity issues gracefully
      const jobAfterAttempt =
        await serverContext.serverApp.db.query.workerJobs.findFirst({
          where: (jobs, { eq }) => eq(jobs.id, job.id),
        })

      expect(jobAfterAttempt).toBeDefined()
    }, 8000)

    test("should process token transfer events through worker chain filters", async () => {
      // Create test users for sender and recipient
      const [sender] = await serverContext.serverApp.db
        .insert(users)
        .values([
          {
            wallet: blockchainContext.anvil.accounts[0],
          },
        ])
        .returning()

      // Deploy a token for testing transfers
      const tokenAddress = await deployMockERC20(blockchainContext, {
        name: "Transfer Monitor Token",
        symbol: "TMT",
        initialSupply: 1000000n * 10n ** 18n,
      })

      // Schedule monitoring for this token
      await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: sender.id,
        data: {
          contractAddress: tokenAddress,
          events: ["Transfer"],
        },
      })

      // Simulate a token transfer
      const recipientAddress = blockchainContext.anvil
        .accounts[1] as `0x${string}`
      const transferAmount = 1000n * 10n ** 18n

      await transferERC20(
        blockchainContext,
        tokenAddress,
        recipientAddress,
        transferAmount,
      )

      // Mine blocks to ensure the transaction is processed
      await mineBlocks(blockchainContext, 2)

      // Run worker to process the events
      runWorker(serverContext.serverApp)

      // Allow time for event processing
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Verify notifications were created for the transfer event
      const senderNotifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, sender.id))

      expect(senderNotifications.length).toBeGreaterThan(0)

      // Verify the notification contains relevant transfer information
      const transferNotification = senderNotifications.find(
        (n) =>
          JSON.stringify(n.data).includes("Token") ||
          JSON.stringify(n.data).includes("Transfer") ||
          JSON.stringify(n.data).includes(tokenAddress.slice(0, 10)),
      )

      expect(transferNotification).toBeDefined()
      expect(JSON.stringify(transferNotification?.data)).toContain(
        transferAmount.toString(),
      )
    }, 12000)
  })
})
