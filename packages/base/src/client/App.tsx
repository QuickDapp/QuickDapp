import { validateClientConfig } from "@shared/config/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Header } from "./components/Header"
import { ToastProvider } from "./components/Toast"
import { AuthProvider } from "./contexts/AuthContext"
import { SocketProvider } from "./contexts/SocketContext"
import { HomePage } from "./pages/HomePage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    },
  },
})

export function App() {
  useMemo(() => {
    validateClientConfig()
  }, [])

  return (
    <div className="flex flex-col w-full min-h-screen relative font-body bg-background text-foreground">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SocketProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Header className="fixed h-header" />
                  <main className="relative m-after-header">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                    </Routes>
                  </main>
                  <footer>
                    <p className="text-xs p-4">
                      Built with <a href="https://quickdapp.xyz">QuickDapp</a>
                    </p>
                  </footer>
                </BrowserRouter>
              </ToastProvider>
            </SocketProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  )
}
