import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { WagmiProvider } from "wagmi"
import { clientConfig, validateClientConfig } from "../../shared/config/client"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Header } from "./components/Header"
import { ToastProvider } from "./components/ui/Toast"
import { createWeb3Config } from "./config/web3"
import { AuthProvider } from "./contexts/AuthContext"
import { SocketProvider } from "./contexts/SocketContext"
import { HomePage } from "./pages/HomePage"

// Import RainbowKit styles
import "@rainbow-me/rainbowkit/styles.css"

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
  // Create web3 config with validation inside component so errors are caught by ErrorBoundary
  const web3Config = useMemo(() => {
    try {
      // Validate client config first
      validateClientConfig()
      return createWeb3Config(clientConfig)
    } catch (error) {
      console.error("Failed to create web3 config:", error)
      throw new Error(
        `Web3 configuration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }, [])

  return (
    <div className="flex flex-col w-full min-h-screen relative font-body bg-background text-foreground">
      <ErrorBoundary>
        <WagmiProvider config={web3Config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={darkTheme()}>
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
                          Built with{" "}
                          <a href="https://quickdapp.xyz">QuickDapp</a>
                        </p>
                      </footer>
                    </BrowserRouter>
                  </ToastProvider>
                </SocketProvider>
              </AuthProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </div>
  )
}
