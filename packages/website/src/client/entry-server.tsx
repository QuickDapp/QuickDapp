import {
  dehydrate,
  HydrationBoundary,
  type QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router-dom/server"
import { AppRoutes } from "./AppRoutes"
import { AppShell } from "./AppShell"

interface RenderResult {
  html: string
  dehydratedState: unknown
}

export function render(url: string, queryClient: QueryClient): RenderResult {
  const dehydratedState = dehydrate(queryClient)

  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <StaticRouter location={url}>
          <AppShell queryClient={queryClient}>
            <AppRoutes />
          </AppShell>
        </StaticRouter>
      </HydrationBoundary>
    </QueryClientProvider>,
  )

  return { html, dehydratedState }
}
