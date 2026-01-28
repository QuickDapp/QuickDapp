import lunr from "lunr"
import { useMemo } from "react"
import type { DocsIndex } from "./useDocs"

export interface SearchResult {
  path: string
  title: string
  snippet: string
  score: number
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/[-:]+\|[-:|\s]+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

function extractSnippet(
  content: string,
  query: string,
  maxLength = 120,
): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const terms = lowerQuery.split(/\s+/).filter((t) => t.length > 0)

  let bestIndex = -1
  for (const term of terms) {
    const idx = lowerContent.indexOf(term)
    if (idx !== -1) {
      bestIndex = idx
      break
    }
  }

  if (bestIndex === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? "…" : "")
  }

  const start = Math.max(0, bestIndex - Math.floor(maxLength / 3))
  const end = Math.min(content.length, start + maxLength)

  let snippet = content.slice(start, end)
  if (start > 0) snippet = "…" + snippet
  if (end < content.length) snippet = snippet + "…"

  return snippet
}

export function useDocsSearch(docsIndex: DocsIndex | undefined): {
  search: (query: string) => SearchResult[]
  isIndexReady: boolean
} {
  const { index, documents } = useMemo(() => {
    if (!docsIndex) {
      return {
        index: null,
        documents: new Map<string, { title: string; content: string }>(),
      }
    }

    const docs = new Map<string, { title: string; content: string }>()

    const idx = lunr(function () {
      this.ref("path")
      this.field("title", { boost: 10 })
      this.field("content")

      for (const [path, page] of Object.entries(docsIndex.pages)) {
        const strippedContent = stripMarkdown(page.markdown)
        docs.set(path, { title: page.title, content: strippedContent })
        this.add({
          path,
          title: page.title,
          content: strippedContent,
        })
      }
    })

    return { index: idx, documents: docs }
  }, [docsIndex])

  const search = useMemo(() => {
    return (query: string): SearchResult[] => {
      if (!index || !query.trim()) {
        return []
      }

      try {
        const results = index.search(query)
        return results.slice(0, 10).map((result) => {
          const doc = documents.get(result.ref)
          return {
            path: result.ref,
            title: doc?.title ?? result.ref,
            snippet: doc ? extractSnippet(doc.content, query) : "",
            score: result.score,
          }
        })
      } catch {
        const wildcardQuery = query
          .split(/\s+/)
          .filter((t) => t.length > 0)
          .map((t) => `${t}*`)
          .join(" ")
        try {
          const results = index.search(wildcardQuery)
          return results.slice(0, 10).map((result) => {
            const doc = documents.get(result.ref)
            return {
              path: result.ref,
              title: doc?.title ?? result.ref,
              snippet: doc ? extractSnippet(doc.content, query) : "",
              score: result.score,
            }
          })
        } catch {
          return []
        }
      }
    }
  }, [index, documents])

  return {
    search,
    isIndexReady: !!index,
  }
}
