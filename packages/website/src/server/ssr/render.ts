import type { ClientConfig } from "../../shared/config/client"
import { buildHtmlDocument, parseViteManifest } from "./html-template"
import { prefetchForRoute } from "./prefetch"

interface SSRModule {
  render: (
    url: string,
    queryClient: import("@tanstack/react-query").QueryClient,
  ) => { html: string; dehydratedState: unknown }
}

interface RenderOptions {
  url: string
  apiUrl: string
  staticDir: string
  clientConfig: ClientConfig
  ssrModule: SSRModule
  manifest: Record<string, { file: string; css?: string[]; isEntry?: boolean }>
}

export async function renderPage(options: RenderOptions): Promise<string> {
  const { url, apiUrl, staticDir, clientConfig, ssrModule, manifest } = options

  const queryClient = await prefetchForRoute(url, { apiUrl, staticDir })

  const { html: appHtml, dehydratedState } = ssrModule.render(url, queryClient)

  const { cssAssets, jsAssets } = parseViteManifest(manifest)

  const html = buildHtmlDocument({
    appHtml,
    dehydratedState,
    clientConfig,
    cssAssets,
    jsAssets,
  })

  queryClient.clear()

  return html
}
