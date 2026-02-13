---
order: 80
---

# Performance

Performance monitoring is done via the recording of _Traces_ and _Spans_. 

A trace is a single a single request and/or execution unit. Traces are made up of what's known as _Spans_. A span is a sub-part of a trace and can itself have sub-spans. 

By default Sentry records all network requests made in the frontend so that you can see the breakdown of page loading time by requests made. Here is an example trace whereby the user has accessed the main page of a site:

![](/images/sentry-trace.png)

In the front-end Sentry will auto-trace all network requests made. But in the backend it's upto you to add spans around code blocks which you wish to monitor the performance of.

The `ServerApp` object includes a `startSpan` method which can be used as follows:

```typescript
// File: src/server/graphql/resolver.ts
import { setSentryUser } from "../lib/sentry"

export function createResolvers(serverApp: ServerApp): Resolvers {
  return {
    Query: {
      getEventStats: async (_, __, context) => {
        return serverApp.startSpan("GraphQL:getEventStats", async (span) => {
          if (context.user) {
            setSentryUser({
              id: context.user.id,
            })
          }

          span.setAttributes({ /* other attributes you wish to set on this reqeust */ })

          /* Inside callDbMethod() we can call serverApp.startSpan() to start a sub-span of this current span. */
          return await callDbMethod()
        })
      }
    }
  }
}
```

In the Sentry UI it will look something like:

![](/images/sentry-trace-span.png)

Set the `SENTRY_TRACES_SAMPLE_RATE` environment variable to control what fraction of requests are traced.

