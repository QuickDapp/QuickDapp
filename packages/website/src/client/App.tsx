import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ErrorBoundary } from "./components/ErrorBoundary"
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

export function App() {
  return (
    <div className="flex flex-col w-full min-h-screen relative font-body bg-background text-foreground">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <HomePage />
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  )
}
