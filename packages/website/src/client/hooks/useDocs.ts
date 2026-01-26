import { useQuery } from "@tanstack/react-query"

interface DocPage {
  path: string
  title: string
  markdown: string
  order: number
  icon?: string
  label?: string
}

interface TreeItem {
  title: string
  path: string
  order: number
  icon?: string
  label?: string
  expanded?: boolean
  children?: TreeItem[]
}

interface DocsManifest {
  versions: string[]
  latest: string | null
  generatedAt: string
}

interface DocsIndex {
  version: string
  pages: Record<string, DocPage>
}

interface DocsTree {
  items: TreeItem[]
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
  }
  return response.json()
}

export function useDocsManifest() {
  return useQuery({
    queryKey: ["docs-manifest"],
    queryFn: () => fetchJson<DocsManifest>("/docs-versions/manifest.json"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useDocsIndex(version: string | undefined) {
  return useQuery({
    queryKey: ["docs-index", version],
    queryFn: () => fetchJson<DocsIndex>(`/docs-versions/${version}/index.json`),
    enabled: !!version,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDocsTree(version: string | undefined) {
  return useQuery({
    queryKey: ["docs-tree", version],
    queryFn: () => fetchJson<DocsTree>(`/docs-versions/${version}/tree.json`),
    enabled: !!version,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDocsLlm(version: string | undefined) {
  return useQuery({
    queryKey: ["docs-llm", version],
    queryFn: async () => {
      const response = await fetch(`/docs-versions/${version}/llm.md`)
      if (!response.ok) {
        throw new Error(`Failed to fetch LLM markdown: ${response.statusText}`)
      }
      return response.text()
    },
    enabled: !!version,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDocs(version: string | undefined, pagePath: string) {
  const indexQuery = useDocsIndex(version)
  const treeQuery = useDocsTree(version)

  const page = indexQuery.data?.pages[pagePath]
  const tree = treeQuery.data?.items

  return {
    page,
    tree,
    isLoading: indexQuery.isLoading || treeQuery.isLoading,
    error: indexQuery.error || treeQuery.error,
  }
}

export type { DocPage, TreeItem, DocsManifest, DocsIndex, DocsTree }
