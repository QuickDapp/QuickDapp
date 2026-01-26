import * as LucideIcons from "lucide-react"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { TreeItem } from "../../hooks/useDocs"
import { cn } from "../../utils/cn"
import { VersionSelector } from "./VersionSelector"

interface DocsSidebarProps {
  tree: TreeItem[]
  version: string
  versions: string[]
  latestVersion: string
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
  const isChildActive =
    hasChildren &&
    item.children?.some(
      (child) =>
        currentPath === child.path || currentPath.startsWith(`${child.path}/`),
    )
  const [isExpanded, setIsExpanded] = useState(
    item.expanded || isActive || isChildActive,
  )

  useEffect(() => {
    if (isActive || isChildActive) {
      setIsExpanded(true)
    }
  }, [isActive, isChildActive])

  const linkPath =
    item.path === "index" ? "" : item.path.replace(/\/index$/, "")
  const href = `/docs/${version}${linkPath ? `/${linkPath}` : ""}`
  const IconComponent = item.icon
    ? (
        LucideIcons as unknown as Record<
          string,
          React.ComponentType<{ className?: string }>
        >
      )[item.icon]
    : null

  return (
    <div className={cn(level > 0 && "ml-4")}>
      <div className="flex items-center">
        <Link
          to={href}
          className={cn(
            "flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-anchor hover:text-white",
            isActive && "bg-anchor/20 font-medium text-anchor",
          )}
        >
          {item.label || item.title}
          {IconComponent && (
            <IconComponent className="h-4 w-4 shrink-0 opacity-60" />
          )}
        </Link>
        {hasChildren && (
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
        )}
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
  latestVersion,
  onVersionChange,
  currentPath,
}: DocsSidebarProps) {
  return (
    <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 shrink-0 overflow-y-auto border-r border-foreground/10 pb-8 pr-4">
      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-foreground/60">
          Version
        </label>
        <VersionSelector
          version={version}
          versions={versions}
          latestVersion={latestVersion}
          onVersionChange={onVersionChange}
          fullWidth
        />
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
          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-anchor hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          LLM-friendly view
        </Link>
      </div>
    </aside>
  )
}
