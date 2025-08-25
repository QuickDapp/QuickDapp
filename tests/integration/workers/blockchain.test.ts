import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { eq } from "drizzle-orm"
import { notifications, users } from "../../../src/server/db/schema"
import { scheduleJob } from "../../../src/server/db/worker"
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

      // Start Anvil blockchain instance (will use port from serverConfig)
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.anvil.url}`,
      )

      // Create and start test worker
      workerContext = await startTestWorker()

      testLogger.info("✅ Blockchain test setup complete")
    } catch (error) {
      testLogger.error("❌ Blockchain test setup failed:", error)
      throw error
    }
  }) // Longer timeout for Anvil startup

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
    })

    afterEach(async () => {
      // Clean database after each test
      await setupTestDatabase()
    })

    test("should monitor ERC20 transfer events and create notifications", async () => {
      // Create test user for the token sender (account[0] - the one with initial token supply)
      // The sendToken filter creates notifications for the sender, not recipient
      const sender = blockchainContext.anvil.accounts[0] as `0x${string}`
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
      const filterSetupJob = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: 0,
        persistent: true,
      })
      testLogger.info(`✅ Scheduled filter setup job ${filterSetupJob.id}`)

      // Wait for the job to execute and create filters
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Perform a token transfer FROM our test user's wallet (this will trigger notifications)
      const recipient = blockchainContext.anvil.accounts[1] as `0x${string}`
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
      const eventProcessJob = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: 0,
        persistent: true,
      })
      testLogger.info(`✅ Scheduled event processing job ${eventProcessJob.id}`)

      // Wait for the job to process the events
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check that notifications were created for the transfer event
      const userNotifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testUser.id))

      testLogger.info(
        `📬 Found ${userNotifications.length} notifications for user ${testUser.id}`,
      )

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
    })

    test("should monitor token creation events and create notifications", async () => {
      // Create test user for the token creator (account[0] - the one creating tokens)
      // The createToken filter creates notifications for the creator
      const creator = blockchainContext.anvil.accounts[0] as `0x${string}`
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
      const filterSetupJob = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: 0,
        persistent: true,
      })
      testLogger.info(`✅ Scheduled filter setup job ${filterSetupJob.id}`)

      // Wait for the job to execute and create filters
      await new Promise((resolve) => setTimeout(resolve, 2000))

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
      const eventProcessJob = await scheduleJob(serverContext.serverApp, {
        type: "watchChain",
        userId: 0,
        persistent: true,
      })
      testLogger.info(`✅ Scheduled event processing job ${eventProcessJob.id}`)

      // Wait for the job to process the events
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check that notifications were created for the token creation event
      const userNotifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testUser.id))

      testLogger.info(
        `📬 Found ${userNotifications.length} notifications for user ${testUser.id}`,
      )

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
      expect(notificationData.creator.toLowerCase()).toBe(creator.toLowerCase())
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
    })

    test.skip("should handle multiple token contracts being monitored", async () => {
      // Create a test user for the token sender (account[0] owns all deployed tokens)
      // Both token deployments will be owned by account[0], so transfers from account[0] will trigger notifications
      const [testUser] = await serverContext.serverApp.db
        .insert(users)
        .values([
          {
            wallet: blockchainContext.anvil.accounts[0]!.toLowerCase(),
          },
        ])
        .returning()

      if (!testUser) {
        throw new Error("Failed to create test user")
      }

      // Deploy two different tokens
      testLogger.info("🪙 Deploying first test token...")
      const token1 = await deployMockERC20(blockchainContext, {
        name: "Token One",
        symbol: "TK1",
        initialSupply: 500000n * 10n ** 18n,
      })

      testLogger.info("🪙 Deploying second test token...")
      const token2 = await deployMockERC20(blockchainContext, {
        name: "Token Two",
        symbol: "TK2",
        initialSupply: 750000n * 10n ** 18n,
      })

      // Perform transfers FROM the test user's wallet (account[0] that owns the tokens)
      const recipient1 = blockchainContext.anvil.accounts[2] as `0x${string}`
      const recipient2 = blockchainContext.anvil.accounts[3] as `0x${string}`

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
      await mineBlocks(blockchainContext, 5)
      testLogger.info("⛏️  Mined blocks to process transactions")

      // Allow time for notifications to be created
      testLogger.info("⏳ Waiting for worker to process all transfer events...")
      await new Promise((resolve) => setTimeout(resolve, 12000))

      // Verify notifications for the test user (should have 2 notifications - one for each token transfer)
      const userNotifications = await serverContext.serverApp.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, testUser.id))

      testLogger.info(
        `📬 Found ${userNotifications.length} notifications for user ${testUser.id}`,
      )

      // Should have at least 2 notifications (one for each token transfer)
      expect(userNotifications.length).toBeGreaterThanOrEqual(2)
    })

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
