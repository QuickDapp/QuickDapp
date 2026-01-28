import { Search } from "lucide-react"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react"
import { useNavigate } from "react-router-dom"
import type { DocsIndex } from "../../hooks/useDocs"
import { type SearchResult, useDocsSearch } from "../../hooks/useDocsSearch"
import { cn } from "../../utils/cn"
import { Dialog, DialogContent } from "../Dialog"

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: string
  docsIndex: DocsIndex | undefined
}

export function SearchModal({
  open,
  onOpenChange,
  version,
  docsIndex,
}: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const { search, isIndexReady } = useDocsSearch(docsIndex)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  const results = search(deferredQuery)

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [deferredQuery])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      const linkPath =
        result.path === "index" ? "" : result.path.replace(/\/index$/, "")
      const href = `/docs/${version}${linkPath ? `/${linkPath}` : ""}`
      navigate(href)
      onOpenChange(false)
    },
    [version, navigate, onOpenChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault()
        navigateToResult(results[selectedIndex])
      } else if (e.key === "Escape") {
        e.preventDefault()
        onOpenChange(false)
      }
    },
    [results, selectedIndex, navigateToResult, onOpenChange],
  )

  useEffect(() => {
    const selectedElement = resultsContainerRef.current?.children[selectedIndex]
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <div className="flex items-center border-b border-foreground/20 px-4">
          <Search className="h-4 w-4 text-foreground/60" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search docs..."
            className="flex-1 bg-transparent px-3 py-4 text-sm outline-none placeholder:text-foreground/40"
          />
          <kbd className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/60">
            Esc
          </kbd>
        </div>

        <div ref={resultsContainerRef} className="max-h-[60vh] overflow-y-auto">
          {!isIndexReady && (
            <div className="px-4 py-8 text-center text-sm text-foreground/60">
              Loading search index...
            </div>
          )}

          {isIndexReady && !deferredQuery && (
            <div className="px-4 py-8 text-center text-sm text-foreground/60">
              Type to search
            </div>
          )}

          {isIndexReady && deferredQuery && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-foreground/60">
              No results found
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.path}
              type="button"
              onClick={() => navigateToResult(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full px-4 py-3 text-left transition-colors",
                index === selectedIndex
                  ? "bg-anchor/20"
                  : "hover:bg-foreground/5",
              )}
            >
              <div className="font-medium">{result.title}</div>
              {result.snippet && (
                <div className="mt-1 text-sm text-foreground/60 line-clamp-2">
                  {result.snippet}
                </div>
              )}
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="flex items-center gap-4 border-t border-foreground/20 px-4 py-2 text-xs text-foreground/60">
            <span>
              <kbd className="rounded bg-foreground/10 px-1 py-0.5">↑</kbd>
              <kbd className="ml-1 rounded bg-foreground/10 px-1 py-0.5">↓</kbd>
              <span className="ml-1">to navigate</span>
            </span>
            <span>
              <kbd className="rounded bg-foreground/10 px-1 py-0.5">↵</kbd>
              <span className="ml-1">to select</span>
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
