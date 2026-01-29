import "@rainbow-me/rainbowkit/styles.css"
import {
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit"
import { clientConfig, validateClientConfig } from "@shared/config/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { WagmiProvider } from "wagmi"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Header } from "./components/Header"
import { ToastProvider } from "./components/Toast"
import { createWeb3Config } from "./config/web3"
import { AuthProvider } from "./contexts/AuthContext"
import { SocketProvider } from "./contexts/SocketContext"
import { ThemeProvider, useTheme } from "./contexts/ThemeContext"
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

// Wrapper component for Web3 providers with theme-aware RainbowKit
function Web3Providers({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()

  const web3Config = useMemo(() => {
    try {
      validateClientConfig()
      return createWeb3Config(clientConfig)
    } catch (error) {
      console.error("Failed to create web3 config:", error)
      throw new Error(
        `Web3 configuration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }, [])

  const rainbowKitTheme = useMemo(() => {
    return resolvedTheme === "dark" ? darkTheme() : lightTheme()
  }, [resolvedTheme])

  return (
    <WagmiProvider config={web3Config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export function App() {
  return (
    <div className="flex flex-col w-full min-h-screen relative font-body bg-background text-foreground">
      <ErrorBoundary>
        <ThemeProvider>
          <Web3Providers>
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
          </Web3Providers>
        </ThemeProvider>
      </ErrorBoundary>
    </div>
  )
}
