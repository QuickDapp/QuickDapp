import "../../helpers/test-config"

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"

const mockCreate = mock(() => Promise.resolve())

mock.module("mailgun.js", () => {
  return {
    default: class MockMailgun {
      client() {
        return {
          messages: {
            create: mockCreate,
          },
        }
      }
    },
  }
})

mock.module("form-data", () => {
  return { default: class FormData {} }
})

describe("Mailer", () => {
  const noop = () => undefined
  const mockLogger = {
    info: mock(noop),
    warn: mock(noop),
    error: mock(noop),
    debug: mock(noop),
    trace: mock(noop),
    fatal: mock(noop),
  }

  beforeEach(() => {
    mockCreate.mockClear()
    mockLogger.info.mockClear()
    mockLogger.warn.mockClear()
  })

  afterEach(() => {
    mock.restore()
  })

  it("should include Reply-To header when MAILGUN_REPLY_TO is set", async () => {
    mock.module("@shared/config/server", () => ({
      serverConfig: {
        MAILGUN_API_KEY: "test-api-key",
        MAILGUN_FROM_ADDRESS: "noreply@example.com",
        MAILGUN_REPLY_TO: "support@example.com",
      },
    }))

    const { Mailer } = await import("@server/lib/mailer")
    const mailer = new Mailer(mockLogger as any)

    await mailer.send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const args = mockCreate.mock.calls[0] as unknown as [string, any]
    expect(args[0]).toBe("example.com")
    expect(args[1]["h:Reply-To"]).toBe("support@example.com")
  })

  it("should omit Reply-To header when MAILGUN_REPLY_TO is empty", async () => {
    mock.module("@shared/config/server", () => ({
      serverConfig: {
        MAILGUN_API_KEY: "test-api-key",
        MAILGUN_FROM_ADDRESS: "noreply@example.com",
        MAILGUN_REPLY_TO: "",
      },
    }))

    const { Mailer } = await import("@server/lib/mailer")
    const mailer = new Mailer(mockLogger as any)

    await mailer.send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const args = mockCreate.mock.calls[0] as unknown as [string, any]
    expect(args[1]["h:Reply-To"]).toBeUndefined()
  })

  it("should omit Reply-To header when MAILGUN_REPLY_TO is undefined", async () => {
    mock.module("@shared/config/server", () => ({
      serverConfig: {
        MAILGUN_API_KEY: "test-api-key",
        MAILGUN_FROM_ADDRESS: "noreply@example.com",
      },
    }))

    const { Mailer } = await import("@server/lib/mailer")
    const mailer = new Mailer(mockLogger as any)

    await mailer.send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const args = mockCreate.mock.calls[0] as unknown as [string, any]
    expect(args[1]["h:Reply-To"]).toBeUndefined()
  })

  it("should log email to console when mail client is not configured", async () => {
    mock.module("@shared/config/server", () => ({
      serverConfig: {
        MAILGUN_API_KEY: "",
        MAILGUN_FROM_ADDRESS: "noreply@example.com",
        MAILGUN_REPLY_TO: "support@example.com",
      },
    }))

    const { Mailer } = await import("@server/lib/mailer")
    const mailer = new Mailer(mockLogger as any)

    await mailer.send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    })

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalled()
  })
})
