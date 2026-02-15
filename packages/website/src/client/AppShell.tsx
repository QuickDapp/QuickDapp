import { PostHogProvider } from "@posthog/react"
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query"
import posthog from "posthog-js"
import { type ReactNode, useEffect, useMemo } from "react"
import { useLocation, useNavigationType } from "react-router-dom"
import { validateClientConfig } from "../shared/config/client"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Header } from "./components/Header"
import { ThemeProvider } from "./contexts/ThemeContext"

function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType !== "POP" && pathname) {
      window.scrollTo(0, 0)
    }
  }, [pathname, navigationType])
  return null
}

function HeaderWrapper() {
  const location = useLocation()
  const isDocsPage = location.pathname.startsWith("/docs")
  return <Header showBackToHome={isDocsPage} />
}

interface AppShellProps {
  queryClient: QueryClient
  children: ReactNode
}

export function AppShell({ queryClient, children }: AppShellProps) {
  useMemo(() => {
    validateClientConfig()
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <ThemeProvider>
        <ScrollToTop />
        <div className="flex flex-col w-full min-h-screen relative font-body bg-background text-foreground">
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <HeaderWrapper />
              {children}
            </QueryClientProvider>
          </ErrorBoundary>
        </div>
      </ThemeProvider>
    </PostHogProvider>
  )
}
