import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { WagmiProvider } from "wagmi"
import { clientConfig } from "../../shared/config/client"
import { ToastProvider } from "./components/ui/Toast"
import { createWeb3Config } from "./config/web3"
import { AuthProvider } from "./contexts/AuthContext"
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

// Create Web3 config using client config
const web3Config = createWeb3Config(clientConfig)

export function App() {
  return (
    <WagmiProvider config={web3Config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-background text-foreground">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                  </Routes>
                </div>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
