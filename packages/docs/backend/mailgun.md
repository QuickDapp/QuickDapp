---
order: 35
---

# Mailgun

QuickDapp uses Mailgun for transactional email delivery. The [`Mailer`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/mailer.ts) class wraps the Mailgun API and provides graceful fallback when not configured—emails are logged to the console instead of being sent.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILGUN_API_KEY` | No | Your Mailgun API key |
| `MAILGUN_API_ENDPOINT` | No | Mailgun API endpoint (defaults to US region) |
| `MAILGUN_FROM_ADDRESS` | No | Sender email address (e.g., `noreply@yourdomain.com`) |

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

This allows development and testing without a Mailgun account. The email content appears in your terminal, making it easy to verify what would be sent.

## Email Verification Flow

QuickDapp uses email verification for passwordless authentication. The flow works as follows:

1. User submits their email address
2. Server generates a verification code and encrypted blob
3. Server sends the code via Mailer
4. User enters the received code
5. Server verifies the code against the blob and creates a session

```typescript
// From resolvers.ts - sending verification code
const { code, blob } = await generateVerificationCodeAndBlob(logger, email)

const mailer = new Mailer(logger)
await mailer.send({
  to: email,
  subject: "Your verification code",
  text: `Your verification code is: ${code}`,
  html: `<p>Your verification code is: <strong>${code}</strong></p>`,
})
```

The blob contains the encrypted code with an expiration timestamp, allowing stateless verification without storing codes in the database.

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

Mailgun API errors (invalid API key, domain not verified) propagate as exceptions with descriptive messages.

## Testing

In tests, Mailgun variables are left empty in `.env.test`, so emails are logged instead of sent. E2E tests can parse the logged output to extract verification codes:

```typescript
// From tests/e2e/helpers/email-code.ts
// In dev/test mode, the mailer logs: "Body: Your verification code is: XXXXXX"
```

See [`src/server/lib/mailer.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/mailer.ts) for the implementation.
