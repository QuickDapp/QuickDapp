// Side-effect import: sets env vars before serverConfig loads
import "@tests/helpers/test-config"

import { describe, expect, it } from "bun:test"
import {
  clientConfig,
  getClientApiBaseUrl,
  validateClientConfig,
} from "../../../src/shared/config/client"

describe("Client Configuration", () => {
  it("should have APP_VERSION matching package.json version", () => {
    const packageJson = require("../../../package.json")
    expect(clientConfig.APP_VERSION).toBe(packageJson.version)
  })

  it("should pass validation without CLIENT_API_BASE_URL", () => {
    expect(() => validateClientConfig()).not.toThrow()
  })

  it("should have CLIENT_API_BASE_URL as undefined when env var not set", () => {
    expect(clientConfig.CLIENT_API_BASE_URL).toBeUndefined()
  })

  it("should return empty string from getClientApiBaseUrl when running server-side without CLIENT_API_BASE_URL", () => {
    expect(getClientApiBaseUrl()).toBe("")
  })
})
