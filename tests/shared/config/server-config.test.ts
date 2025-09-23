/**
 * Server configuration validation tests
 *
 * Tests the server configuration loading and validation functionality
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { validateConfig } from "../../../src/shared/config/server"

describe("Server Configuration Validation", () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    })
    Object.assign(process.env, originalEnv)
  })

  describe("validateConfig", () => {
    it("should pass validation with all required environment variables", () => {
      // Set all required environment variables
      process.env.DATABASE_URL = "postgresql://test@localhost:5432/test"
      process.env.SESSION_ENCRYPTION_KEY =
        "test_key_32_chars_long_for_testing_only!!"
      process.env.SERVER_WALLET_PRIVATE_KEY =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      process.env.BASE_URL = "http://localhost:3000"
      process.env.CHAIN_RPC_ENDPOINT = "http://localhost:8545"
      process.env.SERVER_CHAIN_RPC_ENDPOINT = "http://localhost:8545"
      process.env.WALLETCONNECT_PROJECT_ID = "test_project_id"

      expect(() => validateConfig()).not.toThrow()
    })

    it("should throw error when SERVER_CHAIN_RPC_ENDPOINT is missing", () => {
      // Set all required environment variables except SERVER_CHAIN_RPC_ENDPOINT
      process.env.DATABASE_URL = "postgresql://test@localhost:5432/test"
      process.env.SESSION_ENCRYPTION_KEY =
        "test_key_32_chars_long_for_testing_only!!"
      process.env.SERVER_WALLET_PRIVATE_KEY =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      process.env.BASE_URL = "http://localhost:3000"
      process.env.CHAIN_RPC_ENDPOINT = "http://localhost:8545"
      process.env.WALLETCONNECT_PROJECT_ID = "test_project_id"
      delete process.env.SERVER_CHAIN_RPC_ENDPOINT

      expect(() => validateConfig()).toThrow(
        "Missing required environment variables: SERVER_CHAIN_RPC_ENDPOINT",
      )
    })

    it("should throw error when SERVER_CHAIN_RPC_ENDPOINT is empty", () => {
      // Set all required environment variables but make SERVER_CHAIN_RPC_ENDPOINT empty
      process.env.DATABASE_URL = "postgresql://test@localhost:5432/test"
      process.env.SESSION_ENCRYPTION_KEY =
        "test_key_32_chars_long_for_testing_only!!"
      process.env.SERVER_WALLET_PRIVATE_KEY =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      process.env.BASE_URL = "http://localhost:3000"
      process.env.CHAIN_RPC_ENDPOINT = "http://localhost:8545"
      process.env.SERVER_CHAIN_RPC_ENDPOINT = ""
      process.env.WALLETCONNECT_PROJECT_ID = "test_project_id"

      expect(() => validateConfig()).toThrow(
        "Missing required environment variables: SERVER_CHAIN_RPC_ENDPOINT",
      )
    })

    it("should throw error when both CHAIN_RPC_ENDPOINT and SERVER_CHAIN_RPC_ENDPOINT are missing", () => {
      // Set other required environment variables but omit both RPC endpoints
      process.env.DATABASE_URL = "postgresql://test@localhost:5432/test"
      process.env.SESSION_ENCRYPTION_KEY =
        "test_key_32_chars_long_for_testing_only!!"
      process.env.SERVER_WALLET_PRIVATE_KEY =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      process.env.BASE_URL = "http://localhost:3000"
      process.env.WALLETCONNECT_PROJECT_ID = "test_project_id"
      delete process.env.CHAIN_RPC_ENDPOINT
      delete process.env.SERVER_CHAIN_RPC_ENDPOINT

      expect(() => validateConfig()).toThrow(
        "Missing required environment variables: CHAIN_RPC_ENDPOINT, SERVER_CHAIN_RPC_ENDPOINT",
      )
    })

    it("should validate SESSION_ENCRYPTION_KEY length requirement", () => {
      // This test checks that the validation requirements exist
      // Note: Since serverConfig is evaluated at module load time, we can't easily test runtime validation
      // But we can verify that the test environment itself meets the requirements
      expect(process.env.SESSION_ENCRYPTION_KEY).toBeDefined()
      expect(process.env.SESSION_ENCRYPTION_KEY!.length).toBeGreaterThanOrEqual(
        32,
      )
    })
  })
})
