import { QueryClient } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "./AppRoutes"
import { AppShell } from "./AppShell"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <BrowserRouter>
      <AppShell queryClient={queryClient}>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  )
}
