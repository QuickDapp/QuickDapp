---
order: 93
icon: monitor
expanded: true
---

# Monitoring

Once your app is deployed it's important to monitor it (especially the backend server) for the following:

* **Logs** - Knowing what's happening in your server is crucial to understanding the root cause of any unexpected errors which occur. Ideally you would also want to be notified of errors so that you can take action to rectify them.
* **Performance** - If users are experience slowness when using your app it would be good to know exactly which part of a given request to the backend is slow. Is it the call to the database? Is it the business logic aside from that? Or is it the network connection? Performance monitoring helps to answer these questions by recording activity _traces_.
* **User experience** - Are a lot of users landing on your page but not then able to successfully sign up? Are they rage-quitting? Being able to see what user's actualy experience when using your web app will provide very useful information in terms of answering these questions.


## Sentry

QuickDapp comes with built-in support for [Sentry](https://sentry.io/), an all-in-one monitoring solution that's cloud-hosted but can also be self-hosted. Sentry captures unhandled exceptions, logs errors, and traces performance across server and worker processes.

### Configuration

To enable Sentry do the following:

1. Sign up at https://sentry.io
1. Create two projects, one for the your web app's server to log to and another for background workers to log to.
    - For example, you may call the two Sentry projects _Server_ and _Worker_ respectively.
1. Obtain the DSN (Data Source Name) values for both projects, see [the DSN docs](https://docs.sentry.io/concepts/key-terms/dsn-explainer/) for more info.
1. Now set the values of the following two [environment variables](../environment-variables.md) to these values (use a `.env.local` file):
    - `SENTRY_DSN` - the _Server_ DSN
    - `SENTRY_WORKER_DSN` - the _Worker_ DSN
1. Now restart the dev server and start using the web app - you should start seeing data show up in Sentry.

The full set of environment variables for Sentry:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | — | Sentry DSN for the main server process |
| `SENTRY_WORKER_DSN` | No | — | Sentry DSN for worker processes (can be same or different project) |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `1.0` | Fraction of requests to trace (0.0 to 1.0) |
| `SENTRY_PROFILE_SESSION_SAMPLE_RATE` | No | `0` | Fraction of sessions to profile (0.0 to 1.0) |
| `SENTRY_REPLAY_SESSION_SAMPLE_RATE` | No | `1.0` | Fraction of browser sessions to record for replay (0.0 to 1.0) |

### User Context

Link errors to specific users with `setSentryUser()` and `clearSentryUser()`. These functions update the Sentry scope so all subsequent errors include user information:

```typescript
import { setSentryUser, clearSentryUser } from "./lib/sentry"

// After authentication succeeds
setSentryUser({ id: user.id })

// After logout
clearSentryUser()
```

When a user is set, Sentry events include their ID, making it easier to trace issues affecting specific accounts.

