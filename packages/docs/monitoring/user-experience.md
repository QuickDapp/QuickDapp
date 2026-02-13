---
order: 70
---

# User experience

Sentry has built-in support for recording browser sessions, which you can then replay back later on to see exactly where a user clicked, typed and how they used the mouse to select items and scroll the page.

![](/images/sentry-replay.png)

Enabling the `SENTRY_DSN` automatically enables replay recording in the frontend with the sample rate set to `1.0` by default - meaning that _every_ user session is recorded. 

Once your site hits a lot of traffic you will probably want to reduce the recording rate - do so by adjusting the `SENTRY_REPLAY_SESSION_SAMPLE_RATE` environment variable.

## User privacy

By deafult Sentry does not record the actual page text and/or user input, thus protecting the privacy of user-information by default. To turn this on - e.g for sites which don't display any sensitive user data and/or require user input - simply turn off masking during Sentry initialization in the frontend:

```typescript
// file: src/client/main.tsx
Sentry.init({
  // ...
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false, // don't mask text
      blockAllMedia: false, // don't block media
    }),
  ],
  // ...
})



