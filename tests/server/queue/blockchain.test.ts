import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { eq } from "drizzle-orm"
import { notifications, users } from "../../../src/server/db/schema"
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
import {
  cleanJobQueue,
  setupTestQueue,
  submitJobAndWaitForCompletion,
  teardownTestQueue,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Blockchain Integration Tests", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up blockchain integration tests...")

      // Setup test database and queue
      await setupTestDatabase()
      await setupTestQueue()

      // Start test server with workers enabled
      serverContext = await startTestServer({ workerCountOverride: 1 })
      await waitForServer(serverContext.url)

      // Start testnet blockchain instance
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.testnet.url}`,
      )

      testLogger.info("✅ Blockchain test setup complete")
    } catch (error) {
      testLogger.error("❌ Blockchain test setup failed:", error)
      throw error
    }
  })

  afterAll(async () => {
    try {
      testLogger.info("🧹 Cleaning up blockchain integration tests...")

      // Cleanup blockchain
      if (blockchainContext) {
        await cleanupBlockchainTestContext(blockchainContext)
      }

      // Shutdown server and cleanup queue
      if (serverContext) {
        await serverContext.shutdown()
        await teardownTestQueue(serverContext.serverApp)
      }

      testLogger.info("✅ Blockchain test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Blockchain test cleanup failed:", error)
    }
  })

  describe("Blockchain Event Monitoring", () => {
    beforeEach(async () => {
      // Clean database and queue before each test
      await setupTestDatabase()
      await cleanJobQueue()
    })

    test(
      "should monitor ERC20 transfer events and create notifications",
      async () => {
        // Create test user for the token sender (account[0] - the one with initial token supply)
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

        // Schedule watchChain job to set up filters
        testLogger.info(
          "🔧 Scheduling watchChain job to set up blockchain filters...",
        )
        const { auditRecord: setupJob } = await submitJobAndWaitForCompletion(
          serverContext.serverApp,
          "watchChain",
          {},
          0, // System user
          { timeoutMs: 10000 },
        )
        testLogger.info(`✅ Filter setup job completed: ${setupJob.status}`)

        // Perform a token transfer FROM our test user's wallet
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

        // Schedule watchChain job to process the events
        testLogger.info(
          "🔧 Scheduling watchChain job to process transfer events...",
        )
        const { auditRecord: processJob } = await submitJobAndWaitForCompletion(
          serverContext.serverApp,
          "watchChain",
          {},
          0,
          { timeoutMs: 10000 },
        )
        testLogger.info(
          `✅ Event processing job completed: ${processJob.status}`,
        )

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
      { timeout: 25000 },
    )

    test(
      "should monitor token creation events and create notifications",
      async () => {
        // Create test user for the token creator (account[0] - the one creating tokens)
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

        // Schedule watchChain job to set up filters
        testLogger.info(
          "🔧 Scheduling watchChain job to set up blockchain filters...",
        )
        await submitJobAndWaitForCompletion(
          serverContext.serverApp,
          "watchChain",
          {},
          0,
          { timeoutMs: 10000 },
        )

        // Deploy a token via the factory (this triggers mint from 0x0 to the creator)
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

        // Schedule watchChain job to process the events
        testLogger.info(
          "🔧 Scheduling watchChain job to process token creation events...",
        )
        await submitJobAndWaitForCompletion(
          serverContext.serverApp,
          "watchChain",
          {},
          0,
          { timeoutMs: 10000 },
        )

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
      { timeout: 25000 },
    )

    test("should handle deployMulticall3 job successfully", async () => {
      // Test that we can execute deployMulticall3 jobs successfully
      const { result, auditRecord } = await submitJobAndWaitForCompletion(
        serverContext.serverApp,
        "deployMulticall3",
        { forceRedeploy: false },
        0, // System user
        { timeoutMs: 15000 },
      )

      expect(auditRecord.status).toBe("completed")
      expect(auditRecord.type).toBe("deployMulticall3")
      expect(auditRecord.userId).toBe(0)
      expect(auditRecord.data).toMatchObject({ forceRedeploy: false })

      testLogger.info(
        `✅ Successfully executed deployMulticall3 job with result:`,
        result,
      )
    })

    test("should handle watchChain job successfully", async () => {
      // Test that we can execute watchChain jobs successfully
      const { result, auditRecord } = await submitJobAndWaitForCompletion(
        serverContext.serverApp,
        "watchChain",
        {},
        0, // System user
        { timeoutMs: 15000 },
      )

      expect(auditRecord.status).toBe("completed")
      expect(auditRecord.type).toBe("watchChain")
      expect(auditRecord.userId).toBe(0)

      testLogger.info(
        `✅ Successfully executed watchChain job with result:`,
        result,
      )
    })
  })
})
