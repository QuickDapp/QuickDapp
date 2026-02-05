import {
  type DehydratedState,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "./AppRoutes"
import { AppShell } from "./AppShell"
import "./styles/globals.css"

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
