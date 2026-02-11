import * as Sentry from "@sentry/react"
import { clientConfig } from "@shared/config/client"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./styles/globals.css"

if (clientConfig.SENTRY_DSN) {
  const tracePropagationTargets: (string | RegExp)[] = ["localhost"]
  if (clientConfig.CLIENT_API_BASE_URL) {
    tracePropagationTargets.push(`${clientConfig.CLIENT_API_BASE_URL}/graphql`)
  }

  Sentry.init({
    dsn: clientConfig.SENTRY_DSN,
    environment: clientConfig.NODE_ENV,
    tracesSampleRate: clientConfig.SENTRY_TRACES_SAMPLE_RATE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracePropagationTargets,
    replaysSessionSampleRate: clientConfig.SENTRY_REPLAY_SESSION_SAMPLE_RATE,
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
