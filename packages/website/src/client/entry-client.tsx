import * as Sentry from "@sentry/react"
import { clientConfig } from "@shared/config/client"
import {
  type DehydratedState,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import posthog from "posthog-js"
import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "./AppRoutes"
import { AppShell } from "./AppShell"
import "./styles/globals.css"

if (clientConfig.SENTRY_DSN) {
  Sentry.init({
    dsn: clientConfig.SENTRY_DSN,
    environment: clientConfig.NODE_ENV,
    tracesSampleRate: clientConfig.SENTRY_TRACES_SAMPLE_RATE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracePropagationTargets: ["localhost"],
    replaysSessionSampleRate: clientConfig.SENTRY_REPLAY_SESSION_SAMPLE_RATE,
  })
}

if (clientConfig.POSTHOG_API_KEY) {
  posthog.init(clientConfig.POSTHOG_API_KEY, {
    api_host: clientConfig.POSTHOG_API_HOST || "https://us.i.posthog.com",
  })
}

declare global {
  interface Window {
    __REACT_QUERY_STATE__?: DehydratedState
    __SSR__?: boolean
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
})

function ClientApp() {
  const dehydratedState = window.__REACT_QUERY_STATE__

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <BrowserRouter>
            <AppShell queryClient={queryClient}>
              <AppRoutes />
            </AppShell>
          </BrowserRouter>
        </HydrationBoundary>
      </QueryClientProvider>
    </StrictMode>
  )
}

const container = document.getElementById("root")!

if (window.__SSR__) {
  hydrateRoot(container, <ClientApp />)
} else {
  createRoot(container).render(<ClientApp />)
}
