import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { WagmiProvider } from "wagmi"
import type { ClientConfig } from "../../shared/config/env"
import { ToastProvider } from "./components/ui/Toast"
import { createWeb3Config } from "./config/web3"
import { HomePage } from "./pages/HomePage"

// Import RainbowKit styles
import "@rainbow-me/rainbowkit/styles.css"

// Get config from window object (injected by server)
declare global {
  interface Window {
    __CONFIG__: ClientConfig
  }
}

const defaultConfig: ClientConfig = {
  APP_NAME: "QuickDapp",
  APP_VERSION: "1.0.0",
  NODE_ENV: "development" as const,
  BASE_URL: "http://localhost:3000",
  CHAIN: "sepolia",
  CHAIN_RPC_ENDPOINT: "https://sepolia.infura.io/v3/",
  WALLETCONNECT_PROJECT_ID: "",
  FACTORY_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
}

const clientConfig =
  (typeof window !== "undefined" && window.__CONFIG__) || defaultConfig

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
          <ToastProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-background text-foreground">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                </Routes>
              </div>
            </BrowserRouter>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
