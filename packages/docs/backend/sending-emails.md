---
order: 35
---

# Sending emails

QuickDapp uses [Mailgun](https://mailgun.io) for sending emails.

The [`Mailer`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/server/lib/mailer.ts) class wraps the Mailgun API and provides graceful fallback when Mailgun has not been configured.

## Configuration

The relevant [environment variables](../environment-variables.md) are:

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILGUN_API_KEY` | No | Your Mailgun API key |
| `MAILGUN_API_ENDPOINT` | No | Mailgun API endpoint (defaults to US region) |
| `MAILGUN_FROM_ADDRESS` | No | Sender email address (e.g., `noreply@yourdomain.com`) |
| `MAILGUN_REPLY_TO` | No | Reply-To email address for outgoing emails |

The Mailer extracts the domain from `MAILGUN_FROM_ADDRESS` automatically. For EU region, set `MAILGUN_API_ENDPOINT` to `https://api.eu.mailgun.net`.

## Usage

Create a Mailer instance with a logger and call `send()`:

```typescript
import { Mailer } from "../lib/mailer"

const mailer = new Mailer(logger)

await mailer.send({
  to: "user@example.com",
  subject: "Welcome!",
  text: "Thanks for signing up.",
  html: "<p>Thanks for signing up.</p>",
})
```

The `to` field accepts a single email address or an array for multiple recipients. Either `text` or `html` content is required—if only `text` is provided, it's used for both.

## Development Mode

When Mailgun isn't configured (no `MAILGUN_API_KEY`), the Mailer logs email content to the console instead of sending:

```
[WARN] Mail client not configured - logging email to console instead:
[WARN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WARN] To: user@example.com
[WARN] Subject: Your verification code
[WARN] Body: Your verification code is: 123456
[WARN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This allows development and testing without a Mailgun account.

## Error Handling

The Mailer throws errors when email delivery fails. Wrap calls in try/catch to handle failures gracefully:

```typescript
try {
  await mailer.send({ to, subject, text })
} catch (error) {
  logger.error("Failed to send email:", error)
  // Handle failure (retry, notify user, etc.)
}
```

