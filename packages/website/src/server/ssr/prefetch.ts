import { QueryClient } from "@tanstack/react-query"
import { GraphQLClient } from "graphql-request"
import { GET_GITHUB_STATS } from "../../shared/graphql/queries"
import type { DocsIndex, DocsManifest, DocsTree } from "./types"

interface PrefetchContext {
  apiUrl: string
  staticDir: string
}

function createServerGraphQLClient(apiUrl: string): GraphQLClient {
  return new GraphQLClient(`${apiUrl}/graphql`, {
    headers: {
      "Content-Type": "application/json",
    },
  })
}

async function fetchJson<T>(filePath: string): Promise<T> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filePath}`)
  }
  return file.json()
}

export async function prefetchForRoute(
  url: string,
  ctx: PrefetchContext,
): Promise<QueryClient> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry: 0,
      },
    },
  })

  const pathname = new URL(url, "http://localhost").pathname

  try {
    if (pathname === "/") {
      await prefetchHomePage(queryClient, ctx)
    } else if (pathname.startsWith("/docs")) {
      await prefetchDocsPage(queryClient, pathname, ctx)
    }
  } catch (error) {
    console.error(`[SSR] Prefetch error for ${pathname}:`, error)
  }

  return queryClient
}

async function prefetchHomePage(
  queryClient: QueryClient,
  ctx: PrefetchContext,
): Promise<void> {
  const graphqlClient = createServerGraphQLClient(ctx.apiUrl)

  await queryClient.prefetchQuery({
    queryKey: ["GetGithubStats"],
    queryFn: async () => {
      const data = await graphqlClient.request(GET_GITHUB_STATS)
      return data
    },
  })
}

async function prefetchDocsPage(
  queryClient: QueryClient,
  pathname: string,
  ctx: PrefetchContext,
): Promise<void> {
  const docsVersionsDir = `${ctx.staticDir}/docs-versions`

  const manifestPath = `${docsVersionsDir}/manifest.json`
  const manifest = await fetchJson<DocsManifest>(manifestPath)

  await queryClient.prefetchQuery({
    queryKey: ["docs-manifest"],
    queryFn: () => Promise.resolve(manifest),
  })

  const pathParts = pathname.split("/").filter(Boolean)
  let version = pathParts[1]

  if (version === "latest") {
    version = manifest.latest ?? manifest.versions[0]
  }

  if (!version || !manifest.versions.includes(version)) {
    return
  }

  const versionDir = `${docsVersionsDir}/${version}`

  const [index, tree] = await Promise.all([
    fetchJson<DocsIndex>(`${versionDir}/index.json`),
    fetchJson<DocsTree>(`${versionDir}/tree.json`),
  ])

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["docs-index", version],
      queryFn: () => Promise.resolve(index),
    }),
    queryClient.prefetchQuery({
      queryKey: ["docs-tree", version],
      queryFn: () => Promise.resolve(tree),
    }),
  ])
}
