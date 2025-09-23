import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { eq } from "drizzle-orm"
import { notifications, users, workerJobs } from "../../../src/server/db/schema"
import { scheduleJob } from "../../../src/server/db/worker"
import type { ServerApp } from "../../../src/server/types"
import type { BlockchainTestContext } from "../../helpers/blockchain"
import {
  cleanupBlockchainTestContext,
  createBlockchainTestContext,
  deployMockERC20,
  deployTokenFactory,
  deployTokenViaFactory,
  mineBlocks,
  transferERC20,
} from "../../helpers/blockchain"
import { setupTestDatabase } from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
import type { TestWorkerContext } from "../../helpers/worker"
import { startTestWorker, stopTestWorker } from "../../helpers/worker"
// Import global test setup
import "../../setup"

/**
 * Helper function to schedule jobs with retry logic and database verification
 */
async function scheduleJobWithRetry(
  serverApp: ServerApp,
  jobData: Parameters<typeof scheduleJob>[1],
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<ReturnType<typeof scheduleJob>> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      testLogger.debug(
        `Attempting to schedule job (attempt ${attempt}/${maxRetries}):`,
        jobData,
      )

      // Verify database connection by doing a simple query first
      await serverApp.db.select().from(users).limit(1)
      testLogger.debug("Database connection verified")

      const job = await scheduleJob(serverApp, jobData)
      testLogger.info(
        `✅ Successfully scheduled job ${job.id} on attempt ${attempt}`,
      )
      return job
    } catch (error) {
      lastError = error as Error
      testLogger.warn(
        `❌ Job scheduling failed on attempt ${attempt}/${maxRetries}:`,
        error,
      )

      if (attempt < maxRetries) {
        testLogger.info(`⏳ Retrying in ${retryDelay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        retryDelay *= 1.5 // Exponential backoff
      }
    }
  }

  throw new Error(
    `Failed to schedule job after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  )
}

describe("Worker Blockchain Integration Tests", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer
  let workerContext: TestWorkerContext

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up blockchain integration tests...")

      // Setup test database
      await setupTestDatabase()

      // Start test server
      serverContext = await startTestServer()
      await waitForServer(serverContext.url)

      // Start testnet blockchain instance (will use port from serverConfig)
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.testnet.url}`,
      )

      // Create and start test worker
      testLogger.info("🔧 Starting test worker...")
      workerContext = await startTestWorker()
      testLogger.info(
        `✅ Test worker started: ${workerContext.isRunning ? "RUNNING" : "NOT RUNNING"}`,
      )

      // Verify worker is properly connected
      if (!workerContext.isRunning) {
        throw new Error("Test worker failed to start properly")
      }

      testLogger.info("✅ Blockchain test setup complete")
    } catch (error) {
      testLogger.error("❌ Blockchain test setup failed:", error)
      throw error
    }
  }) // Longer timeout for testnet startup

  afterAll(async () => {
    try {
      testLogger.info("🧹 Cleaning up blockchain integration tests...")

      // Stop worker
      if (workerContext) {
        await stopTestWorker(workerContext)
      }

      // Cleanup blockchain
      if (blockchainContext) {
        await cleanupBlockchainTestContext(blockchainContext)
      }

      // Shutdown server
      if (serverContext) {
        await serverContext.shutdown()
      }

      testLogger.info("✅ Blockchain test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Blockchain test cleanup failed:", error)
    }
  })

  describe("Blockchain Event Monitoring", () => {
    beforeEach(async () => {
      // Clean database before each test
      await setupTestDatabase()

      // Extra cleanup: Remove any existing worker jobs to prevent conflicts
      testLogger.info("🧹 Removing any existing worker jobs...")
      await serverContext.serverApp.db.delete(workerJobs)
      testLogger.info("✅ Worker jobs cleaned")
    })

    test(
      "should monitor ERC20 transfer events and create notifications",
      async () => {
        // Create test user for the token sender (account[0] - the one with initial token supply)
        // The sendToken filter creates notifications for the sender, not recipient
        const sender = blockchainContext.testnet.accounts[0] as `0x${string}`
        const [testUser] = await serverContext.serverApp.db
          .insert(users)
          .values({
            wallet: sender.toLowerCase(),
          })
          .returning()

        if (!testUser) {
          throw new Error("Failed to create test user")
        }

        testLogger.info(
          `👤 Created test user ${testUser.id} with wallet ${testUser.wallet}`,
        )

        // Deploy a test ERC20 token
        testLogger.info("🪙 Deploying test ERC20 token...")
        const tokenAddress = await deployMockERC20(blockchainContext, {
          name: "Test Token",
          symbol: "TEST",
          initialSupply: 1000000n * 10n ** 18n,
        })
        testLogger.info(`✅ Token deployed at ${tokenAddress}`)

        // Manually schedule persistent watchChain job to set up filters
        testLogger.info(
          "🔧 Scheduling watchChain job to set up blockchain filters...",
        )
        const filterSetupJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(`✅ Scheduled filter setup job ${filterSetupJob.id}`)

        // Wait for the job to execute and create filters
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Perform a token transfer FROM our test user's wallet (this will trigger notifications)
        const recipient = blockchainContext.testnet.accounts[1] as `0x${string}`
        const transferAmount = 1000n * 10n ** 18n

        testLogger.info(
          `💸 Transferring ${transferAmount.toString()} tokens from ${testUser.wallet} to ${recipient}`,
        )

        await transferERC20(
          blockchainContext,
          tokenAddress,
          recipient,
          transferAmount,
        )

        // Mine a block to ensure the transaction is included
        await mineBlocks(blockchainContext, 1)
        testLogger.info("✅ Token transfer completed and block mined")

        // Manually schedule persistent watchChain job to process the events
        testLogger.info(
          "🔧 Scheduling watchChain job to process transfer events...",
        )
        const eventProcessJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(
          `✅ Scheduled event processing job ${eventProcessJob.id}`,
        )

        // Wait for the job to process the events
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Check that notifications were created for the transfer event
        testLogger.info("🔍 Checking for notifications...")
        const userNotifications = await serverContext.serverApp.db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, testUser.id))

        testLogger.info(
          `📬 Found ${userNotifications.length} notifications for user ${testUser.id}`,
        )

        // Log all notifications for debugging
        if (userNotifications.length > 0) {
          testLogger.info("📋 Notification details:")
          userNotifications.forEach((notification, index) => {
            const data = notification.data as any
            testLogger.info(
              `  ${index + 1}. Type: ${data.type}, Created: ${notification.createdAt}`,
            )
          })
        } else {
          testLogger.warn("⚠️  No notifications found - investigating...")
          // Check if any notifications exist at all
          const allNotifications = await serverContext.serverApp.db
            .select()
            .from(notifications)
          testLogger.info(
            `Total notifications in DB: ${allNotifications.length}`,
          )

          // Check if user exists
          const userCheck = await serverContext.serverApp.db
            .select()
            .from(users)
            .where(eq(users.id, testUser.id))
          testLogger.info(`User exists: ${userCheck.length > 0 ? "YES" : "NO"}`)
        }

        expect(userNotifications.length).toBeGreaterThan(0)

        // Verify notification data relates to the token transfer
        // Note: The type is stored in the data JSON field, not as a direct property
        const transferNotification = userNotifications.find((n) => {
          const data = n.data as any
          return data.type === "token_transfer"
        })

        expect(transferNotification).toBeDefined()

        // Parse notification data to verify details
        const notificationData = transferNotification!.data as any
        expect(notificationData.type).toBe("token_transfer")
        expect(notificationData.tokenAddress).toBe(tokenAddress.toLowerCase())
        expect(notificationData.from.toLowerCase()).toBe(sender.toLowerCase())
        expect(notificationData.to.toLowerCase()).toBe(recipient.toLowerCase())
        expect(notificationData.amount).toBe(transferAmount.toString())
        expect(notificationData.tokenSymbol).toBe("TEST")
        expect(notificationData.tokenName).toBe("Test Token")
        expect(notificationData.transactionHash).toBeDefined()

        testLogger.info("✅ Transfer notification verified:", {
          type: notificationData.type,
          tokenSymbol: notificationData.tokenSymbol,
          amount: notificationData.amount,
          from: notificationData.from,
          to: notificationData.to,
        })
      },
      { timeout: 15000 },
    )

    test(
      "should monitor token creation events and create notifications",
      async () => {
        // Create test user for the token creator (account[0] - the one creating tokens)
        // The createToken filter creates notifications for the creator
        const creator = blockchainContext.testnet.accounts[0] as `0x${string}`
        const [testUser] = await serverContext.serverApp.db
          .insert(users)
          .values({
            wallet: creator.toLowerCase(),
          })
          .returning()

        if (!testUser) {
          throw new Error("Failed to create test user")
        }

        testLogger.info(
          `👤 Created test user ${testUser.id} with wallet ${testUser.wallet}`,
        )

        // Deploy TestTokenFactory
        testLogger.info("🏭 Deploying TestTokenFactory...")
        const factoryAddress = await deployTokenFactory(blockchainContext)
        testLogger.info(`✅ Factory deployed at ${factoryAddress}`)

        // Manually schedule persistent watchChain job to set up filters
        testLogger.info(
          "🔧 Scheduling watchChain job to set up blockchain filters...",
        )
        const filterSetupJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(`✅ Scheduled filter setup job ${filterSetupJob.id}`)

        // Wait for the job to execute and create filters
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Deploy a token via the factory (this triggers mint from 0x0 to the creator)
        // The createToken filter watches for Transfer events from address(0) (minting)
        testLogger.info("🪙 Deploying token via factory...")
        const tokenAddress = await deployTokenViaFactory(
          blockchainContext,
          factoryAddress,
          {
            name: "Factory Created Token",
            symbol: "FCT",
            decimals: 18,
            initialSupply: 500000n * 10n ** 18n,
          },
        )
        // Mine a block to ensure the transaction is included
        await mineBlocks(blockchainContext, 1)
        testLogger.info(`✅ Token created at ${tokenAddress} and block mined`)

        // Manually schedule persistent watchChain job to process the events
        testLogger.info(
          "🔧 Scheduling watchChain job to process token creation events...",
        )
        const eventProcessJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(
          `✅ Scheduled event processing job ${eventProcessJob.id}`,
        )

        // Wait for the job to process the events
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Check that notifications were created for the token creation event
        testLogger.info("🔍 Checking for token creation notifications...")
        const userNotifications = await serverContext.serverApp.db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, testUser.id))

        testLogger.info(
          `📬 Found ${userNotifications.length} notifications for user ${testUser.id}`,
        )

        // Log all notifications for debugging
        if (userNotifications.length > 0) {
          testLogger.info("📋 Notification details:")
          userNotifications.forEach((notification, index) => {
            const data = notification.data as any
            testLogger.info(
              `  ${index + 1}. Type: ${data.type}, Created: ${notification.createdAt}`,
            )
          })
        } else {
          testLogger.warn(
            "⚠️  No token creation notifications found - investigating...",
          )
          // Check if any notifications exist at all
          const allNotifications = await serverContext.serverApp.db
            .select()
            .from(notifications)
          testLogger.info(
            `Total notifications in DB: ${allNotifications.length}`,
          )
        }

        expect(userNotifications.length).toBeGreaterThan(0)

        // Verify notification data relates to the token creation
        // Note: The type is stored in the data JSON field, not as a direct property
        const creationNotification = userNotifications.find((n) => {
          const data = n.data as any
          return data.type === "token_created"
        })

        expect(creationNotification).toBeDefined()

        // Parse notification data to verify details
        const notificationData = creationNotification!.data as any
        expect(notificationData.type).toBe("token_created")
        expect(notificationData.tokenAddress).toBe(tokenAddress.toLowerCase())
        expect(notificationData.creator.toLowerCase()).toBe(
          creator.toLowerCase(),
        )
        expect(notificationData.tokenSymbol).toBe("FCT")
        expect(notificationData.tokenName).toBe("Factory Created Token")
        expect(notificationData.initialSupply).toBe(
          (500000n * 10n ** 18n).toString(),
        )
        expect(notificationData.transactionHash).toBeDefined()

        testLogger.info("✅ Token creation notification verified:", {
          type: notificationData.type,
          tokenSymbol: notificationData.tokenSymbol,
          tokenName: notificationData.tokenName,
          creator: notificationData.creator,
          initialSupply: notificationData.initialSupply,
        })
      },
      { timeout: 15000 },
    )

    test(
      "should handle multiple token contracts being monitored",
      async () => {
        // Create a test user for the token sender (account[0] owns all deployed tokens)
        // Both token deployments will be owned by account[0], so transfers from account[0] will trigger notifications
        const [testUser] = await serverContext.serverApp.db
          .insert(users)
          .values([
            {
              wallet: blockchainContext.testnet.accounts[0]!.toLowerCase(),
            },
          ])
          .returning()

        if (!testUser) {
          throw new Error("Failed to create test user")
        }

        testLogger.info(
          `👤 Created test user ${testUser.id} with wallet ${testUser.wallet}`,
        )

        // Schedule initial watchChain job to set up filters
        testLogger.info(
          "🔧 Scheduling watchChain job to set up blockchain filters...",
        )
        const filterSetupJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(`✅ Scheduled filter setup job ${filterSetupJob.id}`)

        // Wait for the job to execute and create filters
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Deploy factory first
        testLogger.info("🏭 Deploying token factory...")
        const factoryAddress = await deployTokenFactory(blockchainContext)
        testLogger.info(`✅ Factory deployed at ${factoryAddress}`)

        // Deploy two different tokens via factory (this will emit ERC20NewToken events)
        testLogger.info("🪙 Deploying first test token via factory...")
        const token1 = await deployTokenViaFactory(
          blockchainContext,
          factoryAddress,
          {
            name: "Token One",
            symbol: "TK1",
            initialSupply: 500000n * 10n ** 18n,
          },
        )

        testLogger.info("🪙 Deploying second test token via factory...")
        const token2 = await deployTokenViaFactory(
          blockchainContext,
          factoryAddress,
          {
            name: "Token Two",
            symbol: "TK2",
            initialSupply: 750000n * 10n ** 18n,
          },
        )

        // Mine blocks to process token deployments
        await mineBlocks(blockchainContext, 2)
        testLogger.info("✅ Token deployments completed and blocks mined")

        // Schedule watchChain job to process token creation events
        testLogger.info(
          "🔧 Scheduling watchChain job to process token creation events...",
        )
        const creationProcessJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(
          `✅ Scheduled creation processing job ${creationProcessJob.id}`,
        )

        // Wait for the job to process the creation events
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Perform transfers FROM the test user's wallet (account[0] that owns the tokens)
        const recipient1 = blockchainContext.testnet
          .accounts[2] as `0x${string}`
        const recipient2 = blockchainContext.testnet
          .accounts[3] as `0x${string}`

        testLogger.info("💸 Executing transfers on both tokens...")

        // Transfer token1 FROM testUser to recipient1 - will create notification for testUser
        await transferERC20(
          blockchainContext,
          token1,
          recipient1,
          100n * 10n ** 18n,
        )

        // Transfer token2 FROM testUser to recipient2 - will create notification for testUser
        await transferERC20(
          blockchainContext,
          token2,
          recipient2,
          200n * 10n ** 18n,
        )

        // Mine blocks to process transactions
        await mineBlocks(blockchainContext, 2)
        testLogger.info("⛏️  Transfer transactions completed and blocks mined")

        // Schedule watchChain job to process transfer events
        testLogger.info(
          "🔧 Scheduling watchChain job to process transfer events...",
        )
        const transferProcessJob = await scheduleJobWithRetry(
          serverContext.serverApp,
          {
            type: "watchChain",
            userId: 0,
            data: {},
            persistent: true,
          },
        )
        testLogger.info(
          `✅ Scheduled transfer processing job ${transferProcessJob.id}`,
        )

        // Wait for the job to process the transfer events
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Verify notifications for the test user
        // Should have 4 notifications: 2 token creations + 2 token transfers
        testLogger.info("🔍 Checking for multiple token notifications...")
        const userNotifications = await serverContext.serverApp.db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, testUser.id))

        testLogger.info(
          `📬 Found ${userNotifications.length} notifications for user ${testUser.id}`,
        )

        // Log all notifications for debugging
        if (userNotifications.length > 0) {
          testLogger.info("📋 All notification details:")
          userNotifications.forEach((notification, index) => {
            const data = notification.data as any
            testLogger.info(
              `  ${index + 1}. Type: ${data.type}, Symbol: ${data.tokenSymbol || "N/A"}, Created: ${notification.createdAt}`,
            )
          })
        } else {
          testLogger.warn(
            "⚠️  No notifications found for multiple token test - investigating...",
          )
          // Check if any notifications exist at all
          const allNotifications = await serverContext.serverApp.db
            .select()
            .from(notifications)
          testLogger.info(
            `Total notifications in DB: ${allNotifications.length}`,
          )

          // Log worker status
          testLogger.info(`Worker running: ${workerContext.isRunning}`)
        }

        // Should have at least 4 notifications (2 token creations + 2 token transfers)
        expect(userNotifications.length).toBeGreaterThanOrEqual(4)

        // Verify we have both creation and transfer notifications
        const creationNotifications = userNotifications.filter((n) => {
          const data = n.data as any
          return data.type === "token_created"
        })

        const transferNotifications = userNotifications.filter((n) => {
          const data = n.data as any
          return data.type === "token_transfer"
        })

        testLogger.info(
          `📊 Notification breakdown: ${creationNotifications.length} creations, ${transferNotifications.length} transfers`,
        )

        // Should have exactly 2 creation notifications (TK1 and TK2)
        expect(creationNotifications.length).toBe(2)

        // Should have exactly 2 transfer notifications (TK1 and TK2 transfers)
        expect(transferNotifications.length).toBe(2)

        // Verify the token symbols in notifications
        const tokenSymbols = [
          ...creationNotifications.map((n) => (n.data as any).tokenSymbol),
          ...transferNotifications.map((n) => (n.data as any).tokenSymbol),
        ]

        expect(tokenSymbols).toContain("TK1")
        expect(tokenSymbols).toContain("TK2")
      },
      { timeout: 15000 },
    )

    test("should handle blockchain job scheduling gracefully", async () => {
      // Test that we can schedule watchChain jobs successfully
      const watchJob = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: 0,
        data: {},
      })

      expect(watchJob.id).toBeGreaterThan(0)
      expect(watchJob.type).toBe("watchChain")
      expect(watchJob.userId).toBe(0)

      testLogger.info(`✅ Successfully scheduled watchChain job ${watchJob.id}`)
    })

    test("should handle deployMulticall3 job scheduling", async () => {
      // Test that we can schedule deployMulticall3 jobs successfully
      const deployJob = await scheduleJob(serverContext.serverApp, {
        type: "deployMulticall3",
        userId: 0,
        data: { forceRedeploy: false },
      })

      expect(deployJob.id).toBeGreaterThan(0)
      expect(deployJob.type).toBe("deployMulticall3")
      expect(deployJob.userId).toBe(0)
      expect(deployJob.data).toMatchObject({ forceRedeploy: false })

      testLogger.info(
        `✅ Successfully scheduled deployMulticall3 job ${deployJob.id}`,
      )
    })
  })
})
