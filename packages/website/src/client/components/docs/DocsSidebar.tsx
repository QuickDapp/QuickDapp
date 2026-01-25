import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import type { TreeItem } from "../../hooks/useDocs"
import { cn } from "../../utils/cn"

interface DocsSidebarProps {
  tree: TreeItem[]
  version: string
  versions: string[]
  onVersionChange: (version: string) => void
  currentPath: string
}

function SidebarItem({
  item,
  version,
  currentPath,
  level = 0,
}: {
  item: TreeItem
  version: string
  currentPath: string
  level?: number
}) {
  const hasChildren = item.children && item.children.length > 0
  const isActive =
    currentPath === item.path ||
    currentPath === `${item.path}/index` ||
    (item.path.endsWith("/index") &&
      currentPath === item.path.replace(/\/index$/, ""))
  const [isExpanded, setIsExpanded] = useState(
    hasChildren &&
      (isActive ||
        item.children?.some(
          (child) =>
            currentPath === child.path ||
            currentPath.startsWith(`${child.path}/`),
        )),
  )

  const linkPath =
    item.path === "index" ? "" : item.path.replace(/\/index$/, "")
  const href = `/docs/${version}${linkPath ? `/${linkPath}` : ""}`

  return (
    <div>
      <div className={cn("flex items-center gap-1", level > 0 && "ml-4")}>
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-foreground/10"
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}
        <Link
          to={href}
          className={cn(
            "flex-1 rounded px-2 py-1.5 text-sm transition-colors hover:bg-foreground/10",
            isActive && "bg-anchor/20 font-medium text-anchor",
          )}
        >
          {item.label || item.title}
        </Link>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <SidebarItem
              key={child.path}
              item={child}
              version={version}
              currentPath={currentPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DocsSidebar({
  tree,
  version,
  versions,
  onVersionChange,
  currentPath,
}: DocsSidebarProps) {
  return (
    <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 shrink-0 overflow-y-auto border-r border-foreground/10 pb-8 pr-4">
      <div className="mb-6">
        <label
          htmlFor="version-select"
          className="mb-2 block text-xs font-medium uppercase tracking-wide text-foreground/60"
        >
          Version
        </label>
        <select
          id="version-select"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
          className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-anchor focus:outline-none focus:ring-1 focus:ring-anchor"
        >
          {versions.map((v) => (
            <option key={v} value={v}>
              {v} {v === versions[0] && "(latest)"}
            </option>
          ))}
        </select>
      </div>

      <nav className="space-y-1">
        {tree.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            version={version}
            currentPath={currentPath}
          />
        ))}
      </nav>

      <div className="mt-8 border-t border-foreground/10 pt-4">
        <Link
          to={`/docs/${version}/llm`}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          LLM-friendly view
        </Link>
      </div>
    </aside>
  )
}
