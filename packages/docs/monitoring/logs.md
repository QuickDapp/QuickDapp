---
order: 80
---

# Logs

If you have setup and configured  Sentry correctly you should be able to log into Sentry and see something like this in the _Logs_ tab:

![](/images/sentry-logs.png)


## Server configuration

In the codebase the [`SentryTransport`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/server/lib/sentry.ts) class connects the server logging system with Sentry's logging system.:

By default, the transport sends ERROR level logs and above to Sentry. You can configure the minimum level:

```typescript
new SentryTransport({ minLevel: LogLevel.WARN })
```

## Error capture

QuickDapp captures errors at multiple levels:

**Uncaught Exceptions and Unhandled Rejections**

Both server and worker processes register handlers that capture exceptions and rejections before exiting:

```typescript
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error)
  Sentry.captureException(error)
  process.exit(1)
})
```

**Elysia Error Handler**

The server's global error handler captures unexpected errors during request processing:

```typescript
app.onError(({ error, set, request }) => {
  Sentry.captureException(error)
  set.status = 500
  return { error: "Internal server error" }
})
```

This ensures errors that escape your handlers still reach Sentry before returning a 500 response.

## Graceful Shutdown

When the server or worker shuts down, `Sentry.close()` flushes pending events:

```typescript
if (serverConfig.SENTRY_DSN) {
  await Sentry.close(2000)  // Wait up to 2 seconds
  logger.info("Sentry events flushed")
}
```

This ensures errors captured just before shutdown are not lost.

