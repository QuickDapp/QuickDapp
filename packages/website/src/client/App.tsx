import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { validateClientConfig } from "../shared/config/client"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Header } from "./components/Header"
import { ThemeProvider } from "./contexts/ThemeContext"
import { DocsLlmPage } from "./pages/DocsLlmPage"
import { DocsPage } from "./pages/DocsPage"
import { HomePage } from "./pages/HomePage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/docs" element={<Navigate to="/docs/latest" replace />} />
      <Route path="/docs/:version/llm" element={<DocsLlmPage />} />
      <Route path="/docs/:version/*" element={<DocsPage />} />
      <Route path="/docs/:version" element={<DocsPage />} />
    </Routes>
  )
}

function HeaderWrapper() {
  const location = useLocation()
  const isDocsPage = location.pathname.startsWith("/docs")
  return <Header showBackToHome={isDocsPage} />
}

export function App() {
  useMemo(() => {
    validateClientConfig()
  }, [])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex flex-col w-full min-h-screen relative font-body bg-background text-foreground">
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <HeaderWrapper />
              <AppRoutes />
            </QueryClientProvider>
          </ErrorBoundary>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
