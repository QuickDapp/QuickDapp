import { validateClientConfig } from "@shared/config/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Header } from "./components/Header"
import { ToastProvider } from "./components/Toast"
import { AuthProvider } from "./contexts/AuthContext"
import { SocketProvider } from "./contexts/SocketContext"
import { ThemeProvider } from "./contexts/ThemeContext"
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
    <div className="flex flex-col w-full min-h-screen font-body bg-background text-foreground">
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SocketProvider>
                <ToastProvider>
                  <BrowserRouter>
                    <Header className="fixed h-header" />
                    <main className="relative m-after-header flex-1 flex flex-col">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                      </Routes>
                    </main>
                    <footer className="pb-6 text-center">
                      <p className="text-sm text-muted">
                        Built with <a href="https://quickdapp.xyz">QuickDapp</a>
                      </p>
                    </footer>
                  </BrowserRouter>
                </ToastProvider>
              </SocketProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </div>
  )
}
